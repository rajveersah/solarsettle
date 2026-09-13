import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicMarketData, setDeployedChainId } from '../lib/contractReads';
import deployed from '../deployedAddress.json';
import TiltCard from '../components/TiltCard';
import { baselineGovtStats } from '../lib/govtMockData';
import './LandingPage.css';

setDeployedChainId(deployed.chainId);

const navLinks = [
  { label: 'Marketplace', href: '#marketplace' },
  { label: 'Technology', href: '#network' },
  { label: 'Impact', href: '#network' },
  { label: 'About', href: '#network' },
];

const shortAddress = (address) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
const fmt = (value) => value === null || value === undefined ? '—' : Number(value).toLocaleString('en-IN');

export default function LandingPage() {
  const [market, setMarket] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchPublicMarketData();
        if (!cancelled) setMarket(data);
      } catch {
        if (!cancelled) setMarket(null);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const hasLiveMarket = Boolean(
    market && (Number(market.totalKwh) > 0 || Number(market.registeredCount) > 0 || Number(market.activeListings) > 0)
  );
  const displayMarket = hasLiveMarket ? market : { ...baselineGovtStats, listings: [] };
  const listings = displayMarket.listings || [];

  return (
    <main className="landing">
      <section
        className="hero"
        aria-labelledby="hero-title"
        style={{ '--hero-image': `url(${process.env.PUBLIC_URL}/solarsettle-hero.png)` }}
      >
        <div className="hero-frame" aria-hidden="true" />
        <header className="landing-nav">
          <Link to="/" className="landing-brand" aria-label="SolarSettle home">
            <svg className="brand-sun" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r="7" />
              <path d="M20 2v7M20 31v7M2 20h7M31 20h7M7.3 7.3l5 5M27.7 27.7l5 5M32.7 7.3l-5 5M12.3 27.7l-5 5" />
            </svg>
            <span>SolarSettle</span>
          </Link>
          <nav className="landing-links" aria-label="Primary navigation">
            {navLinks.map((link) => <a href={link.href} key={link.label}>{link.label}</a>)}
          </nav>
          <Link className="hero-login" to="/login">Login <span>→</span></Link>
        </header>

        <div className="hero-content">
          <h1 id="hero-title">A Brighter<br />Energy Future</h1>
          <p>A cleaner, more transparent way to connect<br className="desktop-break" /> with renewable energy.</p>
          <div className="hero-actions">
            <a className="explore-button" href="#marketplace">Explore Marketplace <span>↗</span></a>
          </div>
        </div>

        <aside className="hero-label hero-label-right" aria-label="Cleaner tomorrows">Cleaner<br />tomorrows<i /></aside>
        <aside className="hero-label hero-label-left" aria-label="People power possibility">People<br />power<br />possibility<i /></aside>

        <div className="market-metrics" aria-label="Live marketplace statistics">
          <div className="metric"><span className="metric-icon">ϟ</span><div><strong>{fmt(displayMarket.totalKwh)} kWh</strong><small>Energy logged</small></div></div>
          <div className="metric"><span className="metric-icon">◌</span><div><strong>{fmt(displayMarket.registeredCount)}</strong><small>Approved prosumers</small></div></div>
          <div className="metric"><span className="metric-icon">⌁</span><div><strong>{fmt(displayMarket.activeListings)}</strong><small>Active listings</small></div></div>
          <div className="metric metric-status"><span className="live-dot" /><div><strong>{hasLiveMarket ? 'Live' : 'Preview'}</strong><small>{hasLiveMarket ? 'On-chain marketplace' : 'Sample marketplace data'}</small></div></div>
        </div>
        <a href="#marketplace" className="scroll-cue" aria-label="Scroll to marketplace"><span>⌄</span> Scroll to explore</a>
      </section>

      <section className="platform-section" id="network" aria-labelledby="platform-title">
        <div className="platform-intro">
          <span>One connected platform</span>
          <h2 id="platform-title">Built for a more accountable energy system.</h2>
          <p>SolarSettle brings solar producers, energy buyers, and public institutions into one trusted network—so every unit of clean energy can be verified, exchanged, and understood.</p>
        </div>
        <div className="platform-grid">
          <article className="platform-card">
            <span className="platform-number">01</span>
            <span className="platform-icon">ϟ</span>
            <h3>Verified generation</h3>
            <p>Smart-meter readings create a clear record of solar energy generated, helping programs reward real-world output.</p>
          </article>
          <article className="platform-card">
            <span className="platform-number">02</span>
            <span className="platform-icon">⌁</span>
            <h3>Open energy marketplace</h3>
            <p>Prosumers can list surplus energy while buyers discover renewable supply and settle purchases transparently.</p>
          </article>
          <article className="platform-card">
            <span className="platform-number">03</span>
            <span className="platform-icon">◌</span>
            <h3>Trusted oversight</h3>
            <p>Government and DISCOM teams get an actionable view of registrations, trust scores, and potential risks.</p>
          </article>
        </div>
      </section>

      <section className="marketplace-section" id="marketplace">
        <div className="marketplace-heading">
          <span>SolarSettle network</span>
          <h2>Energy, settled transparently.</h2>
          <p>Explore live renewable-energy listings directly from the SolarSettle marketplace.</p>
        </div>
        {listings.length ? (
          <div className="listing-grid">
            {listings.map((listing) => (
              <TiltCard key={listing.id} className="listing-card">
                <div className="listing-top"><span>On-chain listing</span><span className="listing-live">● Live</span></div>
                <strong>{listing.kWh} kWh</strong>
                <p>From {shortAddress(listing.seller)} · {listing.priceDisplay} per unit</p>
                <Link to="/login">View in marketplace <span>→</span></Link>
              </TiltCard>
            ))}
          </div>
        ) : (
          <div className="empty-market"><span>◌</span><div><strong>The marketplace is ready.</strong><p>New energy listings will appear here as soon as they are available.</p></div><Link to="/login">Open marketplace →</Link></div>
        )}
      </section>

      <footer className="landing-footer" id="footer"><span>SolarSettle</span><span>© 2026 SolarSettle</span><span>Built for a brighter energy future.</span></footer>
    </main>
  );
}
