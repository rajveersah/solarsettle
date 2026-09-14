import { ethers } from 'ethers';
import abiJson from '../SolarSettleABI.json';
import { CONTRACT_ADDRESS, CONTRACT_CHAIN_ID, getChain, isContractConfigured } from '../config';

export const CONTRACT_ABI = abiJson.abi;

let chainMeta = null;

/** Configure the read-only provider's chain (called from the landing page). */
export function setDeployedChainId(id) {
  chainMeta = getChain(id);
}

/** Build an on-chain explorer URL for a transaction or block (if one is configured for the deployed chain). */
export function explorerUrl(type, hashOrNumber) {
  const chain = getChain(CONTRACT_CHAIN_ID);
  if (!chain?.blockExplorerUrls?.length) return null;
  const base = chain.blockExplorerUrls[0];
  if (base == null || base === '') return null;
  // Handle the common {address} / {txHash} / {blockHash} placeholder forms.
  if (type === 'tx') {
    return base.replace('{txHash}', hashOrNumber).replace('{hash}', hashOrNumber);
  }
  if (type === 'block') {
    return base.replace('{blockHash}', hashOrNumber).replace('{block}', hashOrNumber);
  }
  return base;
}

/** Read-only provider for public pages (landing) — no wallet required. */
export function getPublicProvider() {
  if (!isContractConfigured() || !chainMeta) return null;
  return new ethers.JsonRpcProvider(chainMeta.rpcUrls[0]);
}

/** Fetch live marketplace data for public display. */
export async function fetchPublicMarketData() {
  const provider = getPublicProvider();
  if (!provider) return null;
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const stats = await contract.platformStats();
    const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 6);
    const listings = ids.map((id, i) => ({
      id: Number(id),
      seller: sellers[i],
      kWh: Number(kwhs[i]),
      priceDisplay: ethers.formatEther(prices[i]),
    }));
    return {
      totalKwh: Number(stats[0]),
      totalListings: Number(stats[1]),
      activeListings: Number(stats[2]),
      registeredCount: Number(stats[3]),
      listings,
    };
  } catch {
    return null; // network/contract unavailable — landing page degrades gracefully
  }
}

/**
 * Purchase history for a buyer, read from EnergyPurchased events.
 * Queries in block chunks so public RPC range limits don't break it.
 */
export async function fetchPurchaseHistory(provider, buyer, chunkSize = 49000) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const current = await provider.getBlockNumber();
  const events = [];
  for (let end = current; end > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const batch = await contract.queryFilter(
      contract.filters.EnergyPurchased(null, buyer),
      start,
      end
    );
    events.push(...batch);
    if (events.length >= 25) break; // cap history depth
  }
  return events
    .slice(0, 25)
    .reverse()
    .map((ev) => {
      const { listingId, buyer, seller, kWh } = ev.args;
      return {
        buyer,
        listingId: Number(listingId),
        seller,
        kWh: Number(kWh),
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
      };
    });
}
/**
 * Settlements for a seller (a prosumer's sold listings), read from on-chain
 * EnergyPurchased events. Price is recovered from the matching EnergyListed
 * event (EnergyPurchased does not carry price). Chunked queries keep public
 * RPC range limits happy.
 */
export async function fetchSellerSettlements(provider, seller, chunkSize = 49000) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const current = await provider.getBlockNumber();

  // 1) Every sale where this wallet was the seller.
  const sales = [];
  for (let end = current; end > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const batch = await contract.queryFilter(
      contract.filters.EnergyPurchased(null, null, seller),
      start,
      end
    );
    sales.push(...batch);
    if (sales.length >= 20) break;
  }

  // 2) Recover unit prices for those listing ids.
  const priceById = new Map();
  const wanted = new Set(sales.map((ev) => Number(ev.args.listingId)));
  for (let end = current; end > 0 && wanted.size > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const listed = await contract.queryFilter(contract.filters.EnergyListed(), start, end);
    for (const ev of listed) {
      const id = Number(ev.args.listingId);
      if (wanted.has(id)) {
        priceById.set(id, ev.args.price);
        wanted.delete(id);
      }
    }
    if (wanted.size === 0) break;
  }

  let totalRevenue = 0;
  const rows = sales
    .slice(0, 12)
    .reverse()
    .map((ev) => {
      const { listingId, buyer: buyerAddr, kWh } = ev.args;
      const price = priceById.get(Number(listingId)) || 0;
      const revenue = (Number(kWh) * Number(price)) / 1e18;
      totalRevenue += revenue;
      return {
        listingId: Number(listingId),
        buyer: buyerAddr,
        kWh: Number(kWh),
        priceDisplay: ethers.formatEther(price || 0),
        revenueDisplay: revenue.toFixed(4),
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
      };
    });

  return { rows, totalRevenue };
}

/**
 * A prosumer's reading audit trail, read from on-chain EnergyLogged events.
 * Newest first, capped to `limit` entries.
 */
export async function fetchReadingLog(provider, prosumer, chunkSize = 49000, limit = 20) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const current = await provider.getBlockNumber();
  const events = [];
  for (let end = current; end > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const batch = await contract.queryFilter(contract.filters.EnergyLogged(prosumer), start, end);
    events.push(...batch);
    if (events.length >= limit) break;
  }
  return events
    .slice(0, limit)
    .reverse()
    .map((ev) => ({
      kwh: Number(ev.args.kwh),
      timestamp: Number(ev.args.timestamp) * 1000,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
    }));
}

/**
 * Trust score change history from on-chain TrustScoreUpdated events.
 * Returns chronological rows plus derived +2 / -20 change classification.
 */
export async function fetchTrustHistory(provider, prosumer, chunkSize = 49000) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const current = await provider.getBlockNumber();
  const events = [];
  for (let end = current; end > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const batch = await contract.queryFilter(contract.filters.TrustScoreUpdated(prosumer), start, end);
    events.push(...batch);
  }
  events.sort((a, b) => a.blockNumber - b.blockNumber);

  const rows = [];
  let previous = 70; // INITIAL_TRUST_SCORE
  for (const ev of events) {
    const score = Number(ev.args.newScore ?? ev.args[0]);
    const delta = score - previous;
    if (delta !== 0) {
      rows.push({
        score,
        delta,
        reason: delta > 0 ? 'reading' : 'penalty',
        blockNumber: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }
    previous = score;
  }
  return rows;
}