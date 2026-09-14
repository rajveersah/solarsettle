import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

export default function Navbar({ links = [] }) {
  const { selectedRole, isWalletConnected, account, logout, error, setError, supportedChains, targetChainId, selectNetwork, connectWallet, connecting, chain } = useWeb3();
  const location = useLocation();
  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
  const roleLabel = selectedRole === 'government' ? 'Govt' : selectedRole === 'prosumer' ? 'Prosumer' : 'Buyer';

  useEffect(() => {
    document.documentElement.dataset.theme = 'day';
    window.localStorage.removeItem('solarsettle-theme');
  }, []);

  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 className="brand">
          <img className="brand-icon" src="/solarsettle-logo.svg" alt="" />
          <span className="brand-text">SolarSettle</span>
        </h1>
      </Link>
      <nav className="nav">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={'nav-btn ' + (location.pathname === l.to ? 'active' : '')}>
            {l.label}
          </Link>
        ))}
        {selectedRole && (
          <span className="wallet-pill" title={selectedRole}>
            <span className="wallet-dot"></span>
            {roleLabel}
          </span>
        )}
        {isWalletConnected && (
          <span className="wallet-pill" title={account}>
            <span className="wallet-dot"></span>
            {short(account)}
          </span>
        )}
        <select
          className="nav-btn network-select"
          value={targetChainId}
          onChange={(event) => selectNetwork(Number(event.target.value))}
          aria-label="Blockchain network"
        >
          {supportedChains.map((network) => (
            <option key={network.key} value={network.chainId}>
              {network.label}
            </option>
          ))}
        </select>
        {!isWalletConnected && (
          <button className="nav-btn connect-nav-btn" onClick={() => connectWallet(targetChainId)} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        )}
        {isWalletConnected && chain && (
          <span className="wallet-pill" title={chain.chainName}>
            <span className="wallet-dot"></span>
            {chain.label}
          </span>
        )}
        {selectedRole && (
          <button className="nav-btn" onClick={() => { logout(); setError(''); }}>
            Logout
          </button>
        )}
      </nav>
      {error && (
        <div className="nav-error" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}
    </header>
  );
}
