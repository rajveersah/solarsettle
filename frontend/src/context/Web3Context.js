import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import abiJson from '../SolarSettleABI.json';
import { CHAINS, CONTRACT_CHAIN_ID, getChain, getConfiguredChain, isAddressConfigured } from '../config';

const CONTRACT_ABI = abiJson.abi;
const ROLE_STORAGE_KEY = 'solarsettle.role';

const getInjectedProvider = () => {
  if (typeof window === 'undefined') return null;
  const providers = window.ethereum?.providers;
  return providers?.find((provider) => provider.isMetaMask) || window.ethereum || null;
};

const Web3Context = createContext(null);
export const useWeb3 = () => useContext(Web3Context);

export const ROLE_HOME = {
  government: '/govt',
  prosumer: '/prosumer',
  buyer: '/buyer',
};

const initialRole = () => {
  try {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return ROLE_HOME[stored] ? stored : null;
  } catch {
    return null;
  }
};

export function Web3Provider({ children }) {
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [readProvider, setReadProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [targetChainId, setTargetChainId] = useState(CONTRACT_CHAIN_ID);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const targetChain = getChain(targetChainId);
  const configured = !!targetChain && isAddressConfigured(targetChain.address);
  const walletProvider = getInjectedProvider();
  const walletAvailable = !!walletProvider;

  const switchNetwork = useCallback(async (chainIdToUse = targetChainId) => {
    const chain = getChain(chainIdToUse);
    if (!chain) throw new Error('No chain metadata for chainId ' + CONTRACT_CHAIN_ID);

    try {
      await walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || switchErr.data?.originalError?.code === 4902) {
        const networkParams = {
          chainId: chain.chainIdHex,
          chainName: chain.chainName,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.filter(Boolean),
        };
        if (chain.blockExplorerUrls?.length) {
          networkParams.blockExplorerUrls = chain.blockExplorerUrls.filter(Boolean);
        }
        await walletProvider.request({
          method: 'wallet_addEthereumChain',
          params: [networkParams],
        });
      } else {
        throw switchErr;
      }
    }
  }, [targetChainId, walletProvider]);

  const bindWallet = useCallback(async (requestedAccounts, requestedChainId = targetChainId) => {
    if (!walletAvailable || !requestedAccounts?.length) return null;
    const chain = getChain(requestedChainId);
    if (!chain) throw new Error('Unknown blockchain network ' + requestedChainId + '.');

    const provider = new ethers.BrowserProvider(walletProvider);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== requestedChainId) {
      await switchNetwork(requestedChainId);
    }

    const refreshedProvider = new ethers.BrowserProvider(walletProvider);
    const finalNet = await refreshedProvider.getNetwork();
    if (Number(finalNet.chainId) !== requestedChainId) {
      throw new Error('MetaMask is on chain ' + finalNet.chainId + '; switch to ' + requestedChainId + ' and try again.');
    }
    const signer = await refreshedProvider.getSigner();
    const signerAddress = await signer.getAddress();
    const instance = isAddressConfigured(chain.address)
      ? new ethers.Contract(chain.address, CONTRACT_ABI, signer)
      : null;

    setAccount(signerAddress);
    setContract(instance);
    setReadProvider(refreshedProvider);
    setChainId(Number(finalNet.chainId));
    setTargetChainId(requestedChainId);
    if (!instance) {
      setError(chain.label + ' wallet connected. Deploy SolarSettle there before sending transactions.');
    }
    return { address: signerAddress, chainId: requestedChainId, contract: instance };
  }, [switchNetwork, targetChainId, walletAvailable, walletProvider]);

  const loginAs = useCallback((role) => {
    setSelectedRole(role);
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      // localStorage can be unavailable in privacy modes; in-memory role still works.
    }
  }, []);

  const connectWallet = useCallback(async (requestedChainId = targetChainId) => {
    const chainIdToUse = typeof requestedChainId === 'number' ? requestedChainId : targetChainId;
    const requestedChain = getChain(chainIdToUse);
    if (!walletAvailable) {
      setError('MetaMask is not installed.');
      return null;
    }
    if (!requestedChain) {
      setError('Unknown blockchain network ' + chainIdToUse + '.');
      return null;
    }

    setConnecting(true);
    setError('');
    try {
      try {
        await walletProvider.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (permissionError) {
        if (permissionError?.code === 4001) throw permissionError;
      }
      const accounts = await walletProvider.request({ method: 'eth_requestAccounts' });
      setTargetChainId(chainIdToUse);
      return await bindWallet(accounts, chainIdToUse);
    } catch (e) {
      setError(e.code === 4001 ? 'Connection rejected in MetaMask.' : 'Connect failed: ' + (e.shortMessage || e.message));
      return null;
    } finally {
      setConnecting(false);
    }
  }, [bindWallet, targetChainId, walletAvailable, walletProvider]);

  const selectNetwork = useCallback(async (requestedChainId) => {
    const nextChain = getConfiguredChain(requestedChainId);
    if (!nextChain) {
      const chain = getChain(requestedChainId);
      if (!chain) {
        setError('Unknown blockchain network.');
        return null;
      }
      try {
        await switchNetwork(requestedChainId);
        setTargetChainId(requestedChainId);
        setAccount(null);
        setContract(null);
        setReadProvider(null);
        setChainId(requestedChainId);
        setError(chain.label + ' selected. Deploy SolarSettle there before sending contract transactions.');
        return { chainId: requestedChainId };
      } catch (e) {
        setError(e.code === 4001 ? 'Network switch rejected in MetaMask.' : 'Network switch failed: ' + (e.shortMessage || e.message));
        return null;
      }
    }
    setTargetChainId(requestedChainId);
    if (!account) return { chainId: requestedChainId };
    return connectWallet(requestedChainId);
  }, [account, connectWallet, switchNetwork]);

  const logout = useCallback(() => {
    setSelectedRole(null);
    setAccount(null);
    setContract(null);
    setReadProvider(null);
    setChainId(null);
    setError('');
    try {
      window.localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      // Ignore storage failures; logout still clears React state.
    }
  }, []);

  useEffect(() => {
    if (!walletAvailable || !configured) return undefined;
    let mounted = true;

    walletProvider.request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (mounted && accounts?.length) bindWallet(accounts, targetChainId).catch(() => {});
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [bindWallet, configured, targetChainId, walletAvailable, walletProvider]);

  useEffect(() => {
    if (!walletAvailable) return undefined;

    const onAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null);
        setContract(null);
        return;
      }
      bindWallet(accounts, chainId || targetChainId).catch((e) => setError('Wallet refresh failed: ' + (e.shortMessage || e.message)));
    };

    const onChainChanged = () => {
      setAccount(null);
      setContract(null);
      setReadProvider(null);
      setChainId(null);
      setError('Network changed. Reconnect MetaMask to continue.');
    };

    walletProvider.on?.('accountsChanged', onAccountsChanged);
    walletProvider.on?.('chainChanged', onChainChanged);
    return () => {
      walletProvider.removeListener?.('accountsChanged', onAccountsChanged);
      walletProvider.removeListener?.('chainChanged', onChainChanged);
    };
  }, [bindWallet, chainId, targetChainId, walletAvailable, walletProvider]);

  const isWalletConnected = !!account;
  const chain = getChain(chainId || targetChainId);

  const value = {
    selectedRole,
    isWalletConnected,
    loginAs,
    logout,
    account,
    contract,
    readProvider,
    chainId,
    targetChainId,
    chain,
    supportedChains: Object.values(CHAINS),
    connecting,
    error,
    configured,
    walletAvailable,
    setError,
    connectWallet,
    selectNetwork,
    contractAbi: CONTRACT_ABI,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}