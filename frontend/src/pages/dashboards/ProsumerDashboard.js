import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import useTx from '../../hooks/useTx';
import './BuyerDashboard.css';
import './ProsumerDashboard.css';
import './GlassDashboard.css';
import { generateReading } from '../../lib/meterSimulator';
import { fetchSellerSettlements, fetchReadingLog, fetchTrustHistory } from '../../lib/contractReads';

const DAY_MS = 24 * 3600 * 1000;

const DEMO_PROFILE = {
  subsidyID: 'PM-KUSUM-2025-031', panelCapacity: 8000, location: 'Ujjain, MP',
  pendingApproval: false, registered: true, trustScore: 96,
  totalEnergyGenerated: 8420, carbonCredits: 8420,
  totalConsumed: 5120, totalEarnings: 0.285,
  lastReadingTimestamp: Date.now() - 2 * 24 * 3600 * 1000,
};

const DEMO_LISTINGS = [
  { id: 101, kWh: 12, priceDisplay: '0.0004' },
  { id: 102, kWh: 6, priceDisplay: '0.0005' },
];



const fmt = (n) => (n || 0).toLocaleString('en-IN');
const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
const revenueTotal = (settlements) => (settlements?.totalRevenue || 0);
const simulatedHistory = () => Array.from({ length: 12 }, (_, index) => {
  const sample = new Date();
  sample.setDate(sample.getDate() - (11 - index));
  sample.setHours(13, 0, 0, 0);
  return generateReading({ date: sample });
});

export default function ProsumerDashboard() {
  const { isWalletConnected, account, contract, readProvider, connectWallet, connecting, logout } = useWeb3();
  const { pending, toast, run, setToast } = useTx();

  const [profile, setProfile] = useState(null);
  const [liveReading, setLiveReading] = useState(() => generateReading());
  const [readingHistory, setReadingHistory] = useState(simulatedHistory);
  const [form, setForm] = useState({ subsidyId: '', capacityKw: '', location: '' });
  const [listForm, setListForm] = useState({ kwh: '', price: '' });
  const [demoMode, setDemoMode] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [settlements, setSettlements] = useState(null);
  const [readingLog, setReadingLog] = useState([]);
  const [trustEvents, setTrustEvents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!contract || !isWalletConnected) {
      setProfile(DEMO_PROFILE); setDemoMode(true); setMyListings(DEMO_LISTINGS); setReadingLog([]); setTrustEvents([]); setLoading(false); setProfileError(null); return;
    }
    setDemoMode(false);
    setLoading(true);
    setProfileError(null);
    try {
      const p = await contract.prosumers(account); // full struct incl. lastReading
      const lastTs = Number(p.lastReadingTimestamp) * 1000;
      const daysSilent = Math.floor((Date.now() - lastTs) / DAY_MS);

      const count = Number(await contract.listingCount());
      const mine = [];
      for (let i = 0; i < count; i++) {
        const l = await contract.listings(i);
        if (l.seller.toLowerCase() !== account.toLowerCase()) continue;
        if (l.active) mine.push({ id: i, kWh: Number(l.kWh), pricePerUnit: l.pricePerUnit, priceDisplay: ethers.formatEther(l.pricePerUnit) });
      }
      setMyListings(mine);

      let sold = { rows: [], totalRevenue: 0 };
      if (readProvider) {
        try { sold = await fetchSellerSettlements(readProvider, account); }
        catch (e) { console.error('settlements:', e); }
      }
      setSettlements(sold);

      if (readProvider) {
        try {
          setReadingLog(await fetchReadingLog(readProvider, account, 49000, 20));
          setTrustEvents(await fetchTrustHistory(readProvider, account));
        } catch (e) { console.error('audit:', e); }
      }

      const revenue = revenueTotal(sold);
      setProfile({
        subsidyID: p.subsidyID, panelCapacity: Number(p.panelCapacity), location: p.location,
        pendingApproval: p.pendingApproval, registered: p.registered, trustScore: Number(p.trustScore),
        totalEnergyGenerated: Number(p.totalEnergyGenerated), carbonCredits: Number(p.carbonCredits),
        lastReadingTimestamp: lastTs, daysSilent,
        totalConsumed: Math.floor(Number(p.totalEnergyGenerated) * 0.65),
        totalEarnings: revenue,
      });
    } catch (e) {
      console.error(e);
      setProfileError('Could not read your dashboard from the blockchain: ' + (e.shortMessage || e.message));
    }
    setLoading(false);
  }, [contract, account, isWalletConnected, readProvider]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    const t = setInterval(() => {
      const r = generateReading();
      setLiveReading(r);
      setReadingHistory((cur) => [...cur.slice(-13), r]);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const maxDailyKwh = profile ? Math.floor((profile.panelCapacity * 24) / 1000) : 0;
  const maxBarKwh = Math.max(...readingHistory.map((r) => r.kWh), 1);
  const atRiskSilent = profile && profile.registered && profile.daysSilent >= 6;

  const forecast = (() => {
    const vals = readingHistory.map((r) => r.kwh);
    const peak = Math.max(...vals, 0.5);
    const avg = vals.reduce((s, x) => s + x, 0) / Math.max(vals.length, 1);
    const sd = Math.sqrt(vals.reduce((s, x) => s + (x - avg) ** 2, 0) / Math.max(vals.length, 1));
    const total = Math.max(1, Math.round(avg * 16 * 1.1));
    const confidence = Math.max(35, Math.min(95, Math.round(95 - (sd / (avg + 0.001)) * 30)));
    return { peak: peak.toFixed(1), total, confidence };
  })();

  const { ratedGains, ratedPenalties } = demoMode
    ? { ratedGains: 26, ratedPenalties: 0 }
    : {
        ratedGains: trustEvents.filter((t) => t.delta > 0).length * 2,
        ratedPenalties: trustEvents.filter((t) => t.delta < 0).length * 20,
      };
  const displayTrust = demoMode
    ? [{ score: 96, delta: 2, reason: 'reading', blockNumber: '—' }, { score: 94, delta: 2, reason: 'reading', blockNumber: '—' }, { score: 92, delta: 2, reason: 'reading', blockNumber: '—' }]
    : trustEvents.slice(-5).reverse();

  const displayLog = demoMode
    ? readingHistory.slice(-6).reverse().map((r, i) => ({ kwh: r.kWh, timestamp: Date.parse(r.timestamp), txHash: 'demo-' + i, blockNumber: null, sample: true }))
    : readingLog;

  const checklist = [
    { label: 'Register panel', done: demoMode || !!(profile && (profile.registered || profile.pendingApproval)) },
    { label: 'Get approved', done: demoMode || !!(profile && profile.registered) },
    { label: 'Log readings', done: demoMode || displayLog.length > 0 || !!(profile && profile.totalEnergyGenerated > 0) },
    { label: 'List energy', done: demoMode || myListings.length > 0 },
    { label: 'Earn from sales', done: demoMode || (settlements && settlements.rows.length > 0) },
  ];
  const doneCount = checklist.filter((s) => s.done).length;

  const handleRegister = async (e) => {
    e.preventDefault();
    const capacityW = Math.round(parseFloat(form.capacityKw) * 1000);
    if (!form.subsidyId.trim() || !capacityW || !form.location.trim()) {
      setToast({ kind: 'err', text: 'Fill subsidy ID, capacity (0.1–1000 kW) and location.' });
      return;
    }
    if (capacityW < 100 || capacityW > 1000000) {
      setToast({ kind: 'err', text: 'Capacity must be between 0.1 kW and 1000 kW.' });
      return;
    }
    const ok = await run(() => contract.registerProsumer(form.subsidyId.trim(), capacityW, form.location.trim()), 'Registration submitted — awaiting government approval.');
    if (ok) { setForm({ subsidyId: '', capacityKw: '', location: '' }); await loadProfile(); }
  };

  const handleLogReading = async () => {
    if (demoMode) {
      const kwh = Math.round(liveReading.kWh);
      setProfile((c) => ({ ...c, totalEnergyGenerated: c.totalEnergyGenerated + kwh, carbonCredits: c.carbonCredits + kwh, trustScore: Math.min(100, c.trustScore + 2), daysSilent: 0 }));
      setToast({ kind: 'ok', text: 'Sample reading logged — totals updated.' });
      return;
    }
    const kwh = Math.max(1, Math.round(liveReading.kWh));
    if (kwh > maxDailyKwh) {
      setToast({ kind: 'err', text: 'Reading exceeds the plausible cap for this panel (' + maxDailyKwh + ' kWh).' });
      return;
    }
    const ok = await run(() => contract.logEnergyGeneration(kwh), 'Logged ' + kwh + ' kWh on-chain — trust score and credits updated.');
    if (ok) await loadProfile();
  };

  const handleList = async (e) => {
    e.preventDefault();
    if (demoMode) { setToast({ kind: 'ok', text: 'Sample surplus listing created.' }); setListForm({ kwh: '', price: '' }); return; }
    const kwh = parseInt(listForm.kwh, 10);
    const price = parseFloat(listForm.price);
    if (!kwh || kwh <= 0 || !price || price <= 0) {
      setToast({ kind: 'err', text: 'Enter a positive kWh amount and price.' });
      return;
    }
    const netSurplus = profile.totalEnergyGenerated - profile.totalConsumed;
    if (kwh > netSurplus) {
      setToast({ kind: 'err', text: 'You are listing more than your estimated surplus (' + netSurplus + ' kWh). First log more readings.' });
      return;
    }
    const ok = await run(() => contract.listEnergy(kwh, ethers.parseEther(listForm.price)), 'Listing #' + (myListings.length + 1) + ' published to the marketplace.');
    if (ok) { setListForm({ kwh: '', price: '' }); await loadProfile(); }
  };

  const handleCancel = async (listing) => {
    if (demoMode) {
      setMyListings((cur) => cur.filter((l) => l.id !== listing.id));
      setToast({ kind: 'ok', text: 'Sample listing #' + listing.id + ' removed.' });
      return;
    }
    if (!window.confirm('Remove listing #' + listing.id + ' (' + listing.kWh + ' kWh) from the marketplace?')) return;
    const ok = await run(() => contract.cancelListing(listing.id), 'Listing #' + listing.id + ' cancelled.');
    if (ok) await loadProfile();
  };

return (
    <div
      id="solarsettle-buyer-dashboard"
      className="glass-dashboard"
      style={{ '--ss-dashboard-image': `url(${process.env.PUBLIC_URL}/solarsettle-hero.png)` }}
    >
      <div className="ss-app">
        <aside className={'ss-sidebar' + (sidebarOpen ? ' mobile-open' : '')}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ss-brand">
              <div className="ss-brand-mark">☀</div>
              <div>
                <strong>SolarSettle</strong>
                <span>Clean energy. Trusted together.</span>
              </div>
            </div>
          </Link>
          <nav className="ss-nav" onClick={() => setSidebarOpen(false)}>
            <Link to="/prosumer" style={{ textDecoration: 'none' }}>
              <button className="ss-nav-item active"><span className="ss-nav-icon">⌂</span><span>Overview</span></button>
            </Link>
            <Link to="/buyer" style={{ textDecoration: 'none' }}>
              <button className="ss-nav-item"><span className="ss-nav-icon">◫</span><span>Marketplace</span></button>
            </Link>
            <a href="#energy" style={{ textDecoration: 'none' }}>
              <button className="ss-nav-item"><span className="ss-nav-icon">⌁</span><span>My Energy</span></button>
            </a>
            <a href="#transactions" style={{ textDecoration: 'none' }}>
              <button className="ss-nav-item"><span className="ss-nav-icon">↔</span><span>Transactions</span></button>
            </a>
          </nav>
          <div className="ss-sidebar-help">
            <span>Need help?</span>
            <button>Support Center</button>
          </div>
          <button className="ss-logout" onClick={logout}>↪ Log Out</button>
        </aside>

        {sidebarOpen && (<div className="ps-backdrop" onClick={() => setSidebarOpen(false)}></div>)}
        <main className="ss-main">
          <header className="ss-header">
            <div className="ss-mobile-menu" style={{ cursor: 'pointer' }} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</div>
            <Link className="ps-header-brand" to="/" aria-label="SolarSettle home">
              <img src="/solarsettle-logo.svg" alt="" />
              <span>SolarSettle</span>
            </Link>
            <div className="ss-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isWalletConnected ? (
                <span className="ss-badge" style={{ padding: '4px 10px', fontSize: '12px' }}>{short(account)}</span>
              ) : (
                <span className="ss-badge warning" style={{ padding: '4px 10px', fontSize: '12px' }}>Preview</span>
              )}
              <button className="ss-avatar">P</button>
            </div>
          </header>

          <div className="ss-content">
            <section className="ss-page-head">
              <div>
                <div className="ss-eyebrow">PROSUMER CONSOLE</div>
                <h1>My solar generation &amp; trading</h1>
                <p>{loading ? 'Loading your on-chain profile...' : (isWalletConnected ? 'Connected: ' + short(account) : 'Presentation preview with sample meter data.')}</p>
              </div>
              {profile && profile.location && (
                <div className="ss-location-pill">⌖ {profile.location}</div>
              )}
            </section>

            {demoMode && (
              <div className="demo-banner">
                <div>
                  <strong>Demo presentation mode</strong>
                  <span>Sample meter and prosumer values are shown for review. Connect MetaMask to use live contract actions.</span>
                </div>
              </div>
            )}

            {profile && (
              <div className="ss-card ps-checklist-card" style={{ marginBottom: '24px' }}>
                <div className="ss-card-head">
                  <div><span className="ss-label">Your journey</span><h2>Prosumer checklist · {doneCount}/{checklist.length} complete</h2></div>
                </div>
                <div className="ps-checklist">
                  {checklist.map((s) => (
                    <span key={s.label} className={'ps-checklist-item' + (s.done ? ' done' : '')}>{s.done ? '✓' : '○'} {s.label}</span>
                  ))}
                </div>
              </div>
            )}

            {profileError && (
              <div className="ss-card" style={{ marginBottom: '24px', border: '1px solid var(--ss-red)' }}>
                <div className="ss-card-head"><div><span className="ss-label">Connection issue</span><h2>Could not load your dashboard</h2></div></div>
                <p style={{ color: 'var(--ss-red)', fontSize: '13px', marginTop: 0 }}>{profileError}</p>
                <button className="ss-button primary" onClick={loadProfile}>Retry</button>
              </div>
            )}

            {profile && !profile.registered && !demoMode && (
              <div className="ss-card" style={{ marginBottom: '24px' }}>
                <div className="ss-card-head">
                  <div><span className="ss-label">Getting started</span><h2>Register your solar panel</h2></div>
                </div>
                {profile.pendingApproval ? (
                  <span className="ss-badge warning" style={{ padding: '8px 12px', fontSize: '12px' }}>
                    <span className="ss-status-dot"></span> Awaiting government approval — updates here once approved.
                  </span>
                ) : (
                  <>
                    <p style={{ color: 'var(--ss-muted)', marginTop: 0, fontSize: '13px' }}>Submit your subsidy ID and panel details. The DISCOM approves registrations on-chain.</p>
                    <form onSubmit={handleRegister} style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <input className="ss-text-input" aria-label="Subsidy ID" placeholder="Subsidy ID (e.g. PMKUSUM-2024-0142)" value={form.subsidyId} onChange={(e) => setForm({ ...form, subsidyId: e.target.value })} style={{ flex: 1 }} />
                      <input className="ss-text-input" aria-label="Capacity in kW" type="number" step="0.1" min="0.1" max="1000" placeholder="Capacity (kW)" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} style={{ flex: 1, minWidth: '100px' }} />
                      <input className="ss-text-input" aria-label="Location" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ flex: 1 }} />
                      <button type="submit" className="ss-button primary" disabled={pending}>{pending ? '...' : 'Register'}</button>
                    </form>
                  </>
                )}
              </div>
            )}

{/* Live meter hero */}
            <div className="ss-card ss-weather-card" style={{ marginBottom: '24px' }} id="energy">
              <div className="ss-card-head">
                <div>
                  <span className="ss-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ss-primary)' }}>
                    <span className="ss-status-dot" style={{ background: 'var(--ss-primary)' }}></span>
                    {demoMode ? 'Sample Meter Reading' : 'Live Meter Reading'}
                  </span>
                  <h2>Generation telemetry {profile && profile.registered ? 'active' : 'ready when approved'}</h2>
                </div>
                <button className="ss-button primary" onClick={handleLogReading} disabled={pending || (profile && !profile.registered && !demoMode)} style={{ minHeight: '32px' }} title={profile && !profile.registered && !demoMode ? 'Register your panel first' : undefined}>
                  {demoMode ? 'Log sample reading' : pending ? 'Confirming...' : 'Log to Blockchain'}
                </button>
              </div>
              <div className="ss-weather-main">
                <div className="ss-weather-temp">{liveReading.kWh} <span style={{ fontSize: '20px', color: 'var(--ss-muted)' }}>kWh</span></div>
                <div>
                  <strong>Meter {liveReading.meterId}</strong>
                  <span>{new Date(liveReading.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="ss-weather-stats">
                <div><span>Voltage</span><strong>{liveReading.voltage} V</strong></div>
                <div><span>Status</span><strong className="ss-positive">Healthy</strong></div>
                <div><span>Network</span><strong>{demoMode ? 'Preview' : 'Connected'}</strong></div>
                <div><span>Trust Score</span><strong className="ss-positive">{profile ? profile.trustScore : '70'}/100</strong></div>
              </div>
            </div>

            {atRiskSilent && (
              <div className="demo-banner" style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#b45309' }}>
                <div>
                  <strong>No reading for {profile.daysSilent} days</strong>
                  <span>Trust score penalty (−20) applies after 7 days of silence. Log a reading on-chain to stay in good standing.</span>
                </div>
              </div>
            )}

            {/* KPIs */}
            {profile && (
              <section className="ss-metrics-grid" style={{ marginBottom: '24px' }}>
                <div className="ss-card ss-metric-card" title="Your on-chain reliability score">
                  <span className="ss-label">Trust Score</span>
                  <strong style={{ color: 'var(--ss-primary)' }}>{profile.trustScore}/100</strong>
                  <span className="ss-muted">+2 per verified reading</span>
                </div>
                <div className="ss-card ss-metric-card">
                  <span className="ss-label" style={{ display: 'flex', justifyContent: 'space-between' }}>Net Surplus <span style={{ fontSize: '11px', color: 'var(--ss-primary)', background: 'var(--ss-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>SELLABLE</span></span>
                  <strong style={{ color: 'var(--ss-text)' }}>{fmt(profile.totalEnergyGenerated - profile.totalConsumed)} kWh</strong>
                  <span className="ss-muted">Out {fmt(profile.totalEnergyGenerated)} · In {fmt(profile.totalConsumed)}</span>
                </div>
                <div className="ss-card ss-metric-card" title="From on-chain energy sales">
                  <span className="ss-label">Total Revenue</span>
                  <strong style={{ color: 'var(--ss-primary)' }}>{(profile.totalEarnings || 0).toFixed(3)} Ξ</strong>
                  <span className="ss-muted">{demoMode ? 'Sample' : 'From on-chain energy sales'}</span>
                </div>
                <div className="ss-card ss-metric-card">
                  <span className="ss-label">Carbon Impact</span>
                  <strong style={{ color: 'var(--ss-green)' }}>{Math.floor((profile.carbonCredits || 0) / 20)} Trees</strong>
                  <span className="ss-muted">From {fmt(profile.carbonCredits)} offset credits</span>
                </div>
                <div className="ss-card ss-metric-card">
                  <span className="ss-label">Panel Capacity</span>
                  <strong style={{ color: 'var(--ss-orange)' }}>{(profile.panelCapacity / 1000).toFixed(1)} kW</strong>
                  <span className="ss-muted">Max {maxDailyKwh} kWh / reading</span>
                </div>
              </section>
            )}


{/* Trust & forecast */}
            <section className="ss-grid-two" style={{ marginBottom: '24px' }}>
              <div className="ss-card">
                <div className="ss-card-head"><div><span className="ss-label">Compliance</span><h2>Trust breakdown</h2></div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '14px' }}>
                  <div style={{ width: '84px', height: '84px', borderRadius: '50%', border: '6px solid var(--ss-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ss-surface)', flexShrink: 0 }}>
                    <strong style={{ fontSize: '20px', color: 'var(--ss-primary)' }}>{profile ? profile.trustScore : '—'}</strong>
                  </div>
                  <div>
                    <p className="ss-muted" style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                      Base 70 · <strong style={{ color: 'var(--ss-green)' }}>+{ratedGains}</strong> readings · <strong style={{ color: 'var(--ss-red)' }}>−{ratedPenalties}</strong> penalties
                    </p>
                    <p className="ss-muted" style={{ margin: 0, fontSize: '12px' }}>
                      {demoMode
                        ? 'Sample history — connect a wallet to see your real on-chain trust events.'
                        : (trustEvents.length === 0 ? 'No trust events yet. Log your first reading to start building reputation.' : 'Driven entirely by on-chain events.')}
                    </p>
                  </div>
                </div>
                {displayTrust.length > 0 && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {displayTrust.map((t, i) => (
                      <div key={t.txHash + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', paddingBottom: '8px', borderBottom: '1px solid var(--ss-border)' }}>
                        <span>{t.reason === 'reading' ? '🌞 Reading logged' : '⚠ Inactivity penalty'}</span>
                        <span>
                          <strong style={t.delta > 0 ? { color: 'var(--ss-green)' } : { color: 'var(--ss-red)' }}>{t.delta > 0 ? '+' + t.delta : t.delta}</strong>
                          <span className="ss-muted"> · {t.blockNumber && t.blockNumber !== '—' ? 'block ' + t.blockNumber : 'pending'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ss-card">
                <div className="ss-card-head"><div><span className="ss-label" style={{ color: 'var(--ss-orange)' }}>Estimate</span><h2>Tomorrow's generation</h2></div></div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '12px' }}>
                  <strong style={{ fontSize: '30px', color: 'var(--ss-text)' }}>{forecast.total}</strong>
                  <span className="ss-muted">kWh expected</span>
                </div>
                <p className="ss-muted" style={{ margin: '8px 0 14px 0', fontSize: '12.5px' }}>Predicted peak <strong>{forecast.peak} kWh</strong> around <strong>1 PM</strong>.</p>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--ss-surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: forecast.confidence + '%', height: '100%', background: 'var(--ss-orange)' }}></div>
                </div>
                <p className="ss-muted" style={{ margin: '6px 0 0 0', fontSize: '11.5px' }}>Confidence {forecast.confidence}% · heuristic from the last {readingHistory.length} readings. Real forecasting arrives with the meter gateway.</p>
              </div>
            </section>

            <section className="ss-grid-two">
              {/* Generation activity */}
              <div className="ss-card">
                <div className="ss-card-head">
                  <div><span className="ss-label">Generation Activity</span><h2>Last 14 meter readings</h2></div>
                </div>
                <div className="ps-chart">
                  {readingHistory.map((r, i) => (
                    <div key={r.timestamp} className={'ps-bar' + (i === readingHistory.length - 1 ? ' latest' : '')} style={{ height: Math.max(4, (r.kWh / maxBarKwh) * 100) + '%' }} data-value={r.kWh + ' kWh'}></div>
                  ))}
                </div>
                <div className="ps-chart-meta"><span>14 readings ago</span><span>now</span></div>
              </div>

              {/* List surplus form */}
              {profile && (profile.registered || demoMode) && (
                <div className="ss-card">
                  <div className="ss-card-head">
                    <div><span className="ss-label">Sell</span><h2>List surplus energy</h2></div>
                  </div>
                  <p style={{ color: 'var(--ss-muted)', fontSize: '13px', marginTop: 0 }}>Max plausible per reading: {maxDailyKwh} kWh (derived from capacity).</p>
                  <form onSubmit={handleList} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ss-muted)', marginBottom: '4px', display: 'block' }}>Energy (kWh)</label>
                      <input className="ss-text-input" aria-label="Energy kWh" style={{ width: '100%' }} type="number" step="1" min="1" placeholder="kWh to sell" value={listForm.kwh} onChange={(e) => setListForm({ ...listForm, kwh: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ss-muted)', marginBottom: '4px', display: 'block' }}>Price per kWh (token)</label>
                      <input className="ss-text-input" aria-label="Price per kWh" style={{ width: '100%' }} type="number" step="0.0001" min="0.0001" placeholder="0.0001" value={listForm.price} onChange={(e) => setListForm({ ...listForm, price: e.target.value })} />
                    </div>
                    <button type="submit" className="ss-button primary" style={{ marginTop: '4px' }} disabled={pending}>{demoMode ? 'List sample surplus' : pending ? 'Confirming...' : 'List on Marketplace'}</button>
                  </form>
                </div>
              )}
            </section>

{/* My listings + settlements */}
            <section className="ss-grid-two" id="transactions">
              <div className="ss-card">
                <div className="ss-card-head">
                  <div><span className="ss-label">Marketplace</span><h2>My active listings</h2></div>
                  <Link to="/buyer" style={{ textDecoration: 'none' }} className="ss-label">View market →</Link>
                </div>
                {myListings.length === 0 ? (
                  <p style={{ color: 'var(--ss-muted)', fontSize: '13px', margin: 0 }}>No active listings. List surplus energy to start selling.</p>
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--ss-border)' }}>
                          <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Energy</th>
                          <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Price</th>
                          <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {myListings.map((l) => (
                          <tr key={l.id} style={{ borderBottom: '1px solid var(--ss-border)' }}>
                            <td style={{ padding: '8px' }}><strong>{l.kWh}</strong> kWh</td>
                            <td style={{ padding: '8px' }}>{l.priceDisplay}</td>
                            <td style={{ padding: '8px' }}><strong>{(l.kWh * parseFloat(l.priceDisplay)).toFixed(5)}</strong></td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              <button className="ss-button" style={{ minHeight: '28px', fontSize: '11px', color: 'var(--ss-red)', border: 'none', background: 'transparent' }} onClick={() => handleCancel(l)} disabled={pending}>Cancel</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="ss-card">
                <div className="ss-card-head">
                  <div><span className="ss-label" style={{ color: 'var(--ss-green)' }}>Payments</span><h2>On-chain settlements</h2></div>
                </div>
                {(settlements?.rows || []).length === 0 && !demoMode ? (
                  <p style={{ color: 'var(--ss-muted)', fontSize: '13px', margin: 0 }}>No energy sales yet. When a buyer purchases your listing, the settlement appears here from the blockchain.</p>
                ) : demoMode ? (
                  <p style={{ color: 'var(--ss-muted)', fontSize: '13px', margin: 0 }}>Sample settlements shown — connect a wallet to see real on-chain sales.</p>
                ) : (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {settlements.rows.map((s) => (
                      <div key={s.txHash + s.listingId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--ss-border)' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ss-green)' }}>+ {s.revenueDisplay} Ξ</strong>
                          <span style={{ fontSize: '12px', color: 'var(--ss-muted)' }}>Sold {s.kWh} kWh · Buyer {short(s.buyer)}</span>
                        </div>
                        <a href={'https://amoy.polygonscan.com/tx/' + s.txHash} target="_blank" rel="noreferrer" style={{ fontSize: '11px', background: 'var(--ss-surface-2)', padding: '4px 8px', borderRadius: '4px', color: 'var(--ss-text)' }}>Block {s.blockNumber || '—'}</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Readings audit log */}
            <section className="ss-card" style={{ marginBottom: '24px', marginTop: '8px' }}>
              <div className="ss-card-head">
                <div><span className="ss-label">Audit trail</span><h2>My readings log</h2></div>
                {!demoMode && <span className="ss-label" style={{ fontSize: '11px' }}>{readingLog.length} on-chain readings</span>}
              </div>
              {displayLog.length === 0 ? (
                <p style={{ color: 'var(--ss-muted)', fontSize: '13px', margin: 0 }}>No readings yet. Log your first reading from the meter card above.</p>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--ss-border)' }}>
                        <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>#</th>
                        <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Energy</th>
                        <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Time</th>
                        <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Block</th>
                        <th style={{ padding: '8px', color: 'var(--ss-muted)', fontWeight: 600 }}>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLog.map((r, i) => (
                        <tr key={r.txHash + i} style={{ borderBottom: '1px solid var(--ss-border)' }}>
                          <td style={{ padding: '8px', color: 'var(--ss-muted)' }}>{displayLog.length - i}</td>
                          <td style={{ padding: '8px' }}><strong>{r.kwh}</strong> kWh</td>
                          <td style={{ padding: '8px' }}>{new Date(r.timestamp).toLocaleString()}</td>
                          <td style={{ padding: '8px' }}>{demoMode || !r.blockNumber ? '—' : '#' + r.blockNumber}</td>
                          <td style={{ padding: '8px' }}>
                            {demoMode || r.sample ? <span className="ss-muted" style={{ fontSize: '11px' }}>sample</span> : (
                              <a href={'https://amoy.polygonscan.com/tx/' + r.txHash} target="_blank" rel="noreferrer" style={{ fontSize: '11px', background: 'var(--ss-surface-2)', padding: '4px 8px', borderRadius: '4px', color: 'var(--ss-text)' }}>{r.txHash.slice(0, 10)}…</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Connect wallet */}
            {!isWalletConnected && (
              <div className="ss-card" style={{ marginBottom: '24px' }}>
                <div className="ss-card-head">
                  <div><span className="ss-label">Blockchain</span><h2>Go live with MetaMask</h2></div>
                </div>
                <p style={{ color: 'var(--ss-muted)', fontSize: '13px', marginTop: 0, marginBottom: '16px' }}>Connect your wallet to register, log real readings, and trade on the marketplace.</p>
                <button className="ss-button primary" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect MetaMask'}</button>
              </div>
            )}
          </div>
        </main>
      </div>
      {toast && (
        <div role={toast.kind === 'err' ? 'alert' : 'status'} aria-live="polite" style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--ss-text)', color: '#fff', padding: '12px 20px', borderRadius: '12px', zIndex: 9999, boxShadow: 'var(--ss-shadow)', fontSize: '14px', fontWeight: 500, maxWidth: '420px' }}>
          {toast.kind === 'err' ? '⚠ ' : '✓ '}{toast.text}
        </div>
      )}
    </div>
  );
}
