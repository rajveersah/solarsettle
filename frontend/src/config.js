const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MST_CHAIN_ID = 91562037;

export const CHAINS = {
  [MST_CHAIN_ID]: {
    chainId: MST_CHAIN_ID,
    key: 'mst',
    label: 'MST Testnet',
    chainIdHex: '0x5752035',
    chainName: 'MST Testnet',
    nativeCurrency: { name: 'MST', symbol: 'MST', decimals: 18 },
    rpcUrls: ['https://testnetrpc.mstblockchain.com'],
    blockExplorerUrls: [],
    address: process.env.REACT_APP_MST_CONTRACT_ADDRESS || ZERO_ADDRESS,
  },
};

export const CONTRACT_CHAIN_ID = MST_CHAIN_ID;
export const CONTRACT_ADDRESS = CHAINS[CONTRACT_CHAIN_ID]?.address || ZERO_ADDRESS;

/** True once `scripts/deploy.ts` has written a real address. */
export const isContractConfigured = () =>
  isAddressConfigured(CONTRACT_ADDRESS);

export const isAddressConfigured = (address) =>
  typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address) && address !== ZERO_ADDRESS;

export const getChain = (chainId) => CHAINS[Number(chainId)] || null;
export const getConfiguredChain = (chainId) => {
  const chain = getChain(chainId);
  return chain && isAddressConfigured(chain.address) ? chain : null;
};