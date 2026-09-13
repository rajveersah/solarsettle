import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';
import indiaMap from '@svg-maps/india';
import { PROVIDERS } from './BuyerDashboard';
import { sendAlertEmail } from '../../lib/alertMailer';
import './BuyerDashboard.css';
import './DashboardTheme.css';
import './GlassDashboard.css';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;
const DEMO_PENDING = [
  { address: '0x7A1D00000000000000000000000000000000C101', subsidyID: 'PM-KUSUM-2026-0142', location: 'Bhopal, MP', capacityKw: '5.0' },
  { address: '0x7A1D00000000000000000000000000000000C102', subsidyID: 'ROOFTOP-2026-087', location: 'Indore, MP', capacityKw: '3.5' },
];
const DEMO_PROSUMERS = [
  { address: '0x7A1D00000000000000000000000000000000C201', subsidyID: 'PM-KUSUM-2025-031', location: 'Ujjain, MP', capacityKw: '8.0', trustScore: 96, generated: 8420, credits: 8420, lastReading: 'Today', daysSilent: 0, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C202', subsidyID: 'ROOFTOP-2025-119', location: 'Bhopal, MP', capacityKw: '5.0', trustScore: 88, generated: 5210, credits: 5210, lastReading: 'Yesterday', daysSilent: 1, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C203', subsidyID: 'PM-KUSUM-2024-072', location: 'Gwalior, MP', capacityKw: '10.0', trustScore: 34, generated: 6190, credits: 6190, lastReading: '9 days ago', daysSilent: 9, atRisk: true },
];
const DEMO_BASE_PROSUMERS = [
  { address: '0x7A9e2b5d8c14A307F6046c98C91e55761DaA0011', subsidyID: 'PMKUSUM-DEMO-1142', location: 'Bhopal, MP', capacityKw: '5.0', trustScore: 86, generated: 1840, credits: 1840, lastReading: new Date(Date.now() - 2 * DAY_MS).toLocaleDateString(), daysSilent: 2, atRisk: false, riskReason: 'Readings match panel capacity', isDemo: true },
  { address: '0x2F41aCA9eD23530819f78c9C26d18D52dEaA0022', subsidyID: 'PMKUSUM-DEMO-2097', location: 'Indore, MP', capacityKw: '3.5', trustScore: 78, generated: 1265, credits: 1265, lastReading: new Date(Date.now() - DAY_MS).toLocaleDateString(), daysSilent: 1, atRisk: false, riskReason: 'Normal generation curve', isDemo: true },
];
const FRAUD_SCENARIOS = {
  spike: { label: 'Meter spike', row: { address: '0xFraud0000000000000000000000000000000A91', subsidyID: 'PMKUSUM-FRAUD-9001', location: 'Jabalpur, MP', capacityKw: '2.0', trustScore: 28, generated: 940, credits: 940, lastReading: new Date().toLocaleDateString(), daysSilent: 0, atRisk: true, riskReason: 'Claimed 168 kWh in one day from a 2.0 kW panel', evidence: 'Generation exceeds physical capacity by 250%', isDemo: true } },
  silent: { label: 'Silent meter', row: { address: '0xFraud0000000000000000000000000000000B72', subsidyID: 'PMKUSUM-FRAUD-8174', location: 'Ujjain, MP', capacityKw: '4.2', trustScore: 36, generated: 2105, credits: 2105, lastReading: new Date(Date.now() - 13 * DAY_MS).toLocaleDateString(), daysSilent: 13, atRisk: true, riskReason: 'No smart-meter reading for 13 days', evidence: 'Inactivity window exceeded by 6 days', isDemo: true } },
  duplicate: { label: 'Duplicate subsidy', row: { address: '0xFraud0000000000000000000000000000000C53', subsidyID: 'PMKUSUM-DEMO-1142', location: 'Bhopal, MP', capacityKw: '5.0', trustScore: 22, generated: 0, credits: 0, lastReading: new Date().toLocaleDateString(), daysSilent: 0, atRisk: true, riskReason: 'Subsidy ID already belongs to another wallet', evidence: 'Same subsidy ID submitted from two addresses', isDemo: true } },
};

const CITY_POSITIONS = {
  // Calibrated to @svg-maps/india's 612 x 696 viewBox. These points sit inside
  // Madhya Pradesh's path, rather than using screen-space coordinates.
  Bhopal: { x: 204, y: 336 },
  Indore: { x: 175, y: 348 },
  Gwalior: { x: 219, y: 271 },
  Jabalpur: { x: 253, y: 338 },
  Ujjain: { x: 173, y: 338 },
  Sagar: { x: 229, y: 318 },
  'Greater Noida': { x: 239, y: 232 },
  'New Delhi': { x: 222, y: 225 },
  Delhi: { x: 222, y: 225 },
  Bengaluru: { x: 239, y: 531 },
  Mumbai: { x: 145, y: 400 },
  Pune: { x: 165, y: 421 },
  Hyderabad: { x: 251, y: 431 },
  Jaipur: { x: 177, y: 258 },
  Ahmedabad: { x: 137, y: 328 },
  Chennai: { x: 294, y: 550 },
  Kolkata: { x: 380, y: 365 },
  Lucknow: { x: 281, y: 254 },
  Gurugram: { x: 214, y: 239 },
  Kochi: { x: 227, y: 588 },
  Chandigarh: { x: 204, y: 202 },
};
const STATE_ANCHORS = {
  'Uttar Pradesh': { x: 274, y: 253 }, Delhi: { x: 223, y: 225 }, Karnataka: { x: 241, y: 526 }, Maharashtra: { x: 164, y: 401 }, Telangana: { x: 250, y: 431 }, Rajasthan: { x: 176, y: 260 }, Gujarat: { x: 136, y: 330 }, 'Tamil Nadu': { x: 286, y: 553 }, 'West Bengal': { x: 380, y: 365 }, Haryana: { x: 213, y: 239 }, Kerala: { x: 226, y: 588 }, Chandigarh: { x: 204, y: 202 }, 'Madhya Pradesh': { x: 205, y: 332 },
};

const STATE_NAMES = { MP: 'Madhya Pradesh', MH: 'Maharashtra', RJ: 'Rajasthan', GJ: 'Gujarat', UP: 'Uttar Pradesh', DL: 'Delhi', PB: 'Punjab', HR: 'Haryana', KA: 'Karnataka', TN: 'Tamil Nadu', WB: 'West Bengal', OD: 'Odisha', BR: 'Bihar', AP: 'Andhra Pradesh', TS: 'Telangana', KL: 'Kerala', JH: 'Jharkhand', CT: 'Chhattisgarh', UK: 'Uttarakhand', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', AS: 'Assam' };
const STATE_CODES = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name, code]));
const RANGE_OPTIONS = [{ id: 'today', label: 'Today' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '1y', label: '1 year' }];

function getRiskReason(row) {
  if (row.daysSilent > INACTIVITY_WINDOW_DAYS) {
    return `Meter silent for ${row.daysSilent} days; intervention threshold is ${INACTIVITY_WINDOW_DAYS} days`;
  }
  if (row.trustScore < 40) {
    return `Trust score ${row.trustScore}/100 is below the 40/100 intervention threshold`;
  }
  if (row.expectedKwh && row.lastKwh > row.expectedKwh * 1.5) {
    return `Observed generation ${row.lastKwh} kWh exceeds the expected ${row.expectedKwh} kWh ceiling`;
  }
  return 'Connection requires government review';
}

function stateForLocation(location = '') {
  const code = location.split(',').pop()?.trim();
  return STATE_NAMES[code] || '';
}

function getGridTimeline(range, selectedState) {
  const providers = selectedState ? PROVIDERS.filter((provider) => provider.stateName === selectedState) : PROVIDERS;
  if (!providers.length) return [];
  if (range === 'today') {
    return providers.map((provider) => ({ provider, points: provider.historicalData.hourly.map((sample) => ({ label: `${String(sample.hour).padStart(2, '0')}:00`, generation: sample.generationKwh, risk: sample.hour < 6 || sample.hour > 18 })) }));
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 365;
  return providers.map((provider) => {
    const daily = provider.historicalData.daily.slice(-days).map((sample) => ({ date: sample.date, label: sample.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), generation: sample.generationKwh, risk: sample.cloudCover >= 65 || sample.generationKwh < provider.capacityKw * 2.7 }));
    if (range !== '1y') return { provider, points: daily };
    const months = new Map();
    daily.forEach((row) => {
      const key = `${row.date.getFullYear()}-${row.date.getMonth()}`;
      const current = months.get(key) || { label: row.date.toLocaleDateString('en-IN', { month: 'short' }), generation: 0, risk: false };
      current.generation += row.generation;
      current.risk = current.risk || row.risk;
      months.set(key, current);
    });
    return { provider, points: [...months.values()] };
  });
}

export default function GovtDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting, logout } = useWeb3();
  const { pending, toast, run, setToast } = useTx();
  const [stats, setStats] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoRows, setDemoRows] = useState(DEMO_BASE_PROSUMERS);
  const [demoCase, setDemoCase] = useState(null);
  const [selectedMapId, setSelectedMapId] = useState(DEMO_PROSUMERS[0].address);
  const [selectedState, setSelectedState] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [mapZoomed, setMapZoomed] = useState(false);
  const [loadingLiveData, setLoadingLiveData] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    if (!contract) {
      setStats({ totalKwh: 19820, totalListings: 17, activeListings: 6, registeredCount: 12 });
      setPendingList(DEMO_PENDING);
      setProsumers(DEMO_PROSUMERS);
      setDemoMode(true);
      return;
    }
    setDemoMode(false);
    setLoadingLiveData(true);
    try {
      const s = await contract.platformStats();
      setStats({
        totalKwh: Number(s[0]),
        totalListings: Number(s[1]),
        activeListings: Number(s[2]),
        registeredCount: Number(s[3]),
      });
      const pendingAddrs = await contract.pendingProsumers();
      const pendingRows = [];
      for (const addr of pendingAddrs) {
        const p = await contract.getProsumer(addr);
        pendingRows.push({ address: addr, subsidyID: p.subsidyID, location: p.location, capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1) });
      }
      setPendingList(pendingRows);
      const regAddrs = await contract.registeredProsumers();
      const rows = [];
      for (const addr of regAddrs) {
        const p = await contract.prosumers(addr);
        const last = Number(p.lastReadingTimestamp) * 1000;
        const daysSilent = Math.floor((Date.now() - last) / DAY_MS);
        const trustScore = Number(p.trustScore);
        const atRisk = daysSilent > INACTIVITY_WINDOW_DAYS || trustScore < 40;
        rows.push({
          address: addr, subsidyID: p.subsidyID, location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore, generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits), lastReading: new Date(last).toLocaleDateString(),
          lastReadingTimestamp: last, lastPenaltyTimestamp: Number(p.lastPenaltyTimestamp) * 1000,
          daysSilent, atRisk, source: 'On-chain',
        });
      }
      setProsumers(rows);
      setSelectedMapId((current) => rows.some((row) => row.address === current) ? current : rows[0]?.address || '');
    } catch (e) {
      console.error(e);
      setToast({ kind: 'error', text: 'Live registry read failed. Demo data was not restored.' });
    } finally {
      setLoadingLiveData(false);
    }
  }, [contract, setToast]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (addr) => {
    if (demoMode) {
      setPendingList((current) => current.filter((item) => item.address !== addr));
      setStats((current) => ({ ...current, registeredCount: current.registeredCount + 1 }));
      setToast({ kind: 'ok', text: 'Demo approval completed - sample prosumer moved into the registry.' });
      return;
    }
    const ok = await run(() => contract.approveProsumer(addr), 'Approved prosumer ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleCheckInactivity = async (addr) => {
    if (demoMode) {
      setProsumers((current) => current.map((prosumer) => prosumer.address === addr
        ? { ...prosumer, trustScore: Math.max(0, prosumer.trustScore - 20), atRisk: true }
        : prosumer));
      setToast({ kind: 'ok', text: 'Demo inactivity penalty applied - trust score reduced by 20 points.' });
      return;
    }
    const ok = await run(() => contract.checkInactivity(addr), 'Inactivity check executed for ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleDemoFraud = (scenarioKey) => {
    const scenario = FRAUD_SCENARIOS[scenarioKey];
    setDemoRows((current) => [scenario.row, ...current.filter((row) => row.address !== scenario.row.address)]);
    setDemoCase({ ...scenario.row, label: scenario.label, detectedAt: new Date().toLocaleTimeString() });
  };

  const handleDemoPenalty = (addr) => {
    setDemoRows((current) => current.map((row) => row.address === addr
      ? { ...row, trustScore: Math.max(0, row.trustScore - 20), riskReason: row.riskReason + ' - penalty simulated' }
      : row));
    setDemoCase((current) => current && current.address === addr
      ? { ...current, trustScore: Math.max(0, current.trustScore - 20), evidence: current.evidence + '; penalty simulated' }
      : current);
  };

  const handleResetDemo = () => {
    setDemoRows(DEMO_BASE_PROSUMERS);
    setDemoCase(null);
  };

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
  const displayProsumers = useMemo(() => [...demoRows, ...prosumers], [demoRows, prosumers]);
  const filteredProsumers = useMemo(() => selectedState ? displayProsumers.filter((row) => stateForLocation(row.location) === selectedState) : displayProsumers, [displayProsumers, selectedState]);
  const filteredPending = useMemo(() => selectedState ? pendingList.filter((row) => stateForLocation(row.location) === selectedState) : pendingList, [pendingList, selectedState]);
  const activeFraudCount = filteredProsumers.filter((p) => p.atRisk).length;
  const avgTrust = filteredProsumers.length
    ? Math.round(filteredProsumers.reduce((sum, p) => sum + p.trustScore, 0) / filteredProsumers.length)
    : 0;
  const gridTimeline = useMemo(() => getGridTimeline(timeRange, selectedState), [timeRange, selectedState]);
  const alertItems = useMemo(() => buildAlerts(filteredProsumers, demoMode ? 'simulation' : 'monitoring'), [filteredProsumers, demoMode]);
  const mapConnections = useMemo(() => [
    ...PROVIDERS.map((provider) => ({
      address: `buyer-grid-${provider.id}`, subsidyID: provider.name, location: `${provider.city}, ${provider.stateName}`,
      stateName: provider.stateName, capacityKw: provider.capacityKw.toFixed(1), trustScore: provider.trustScore,
      generated: provider.totalGenerationKwh, credits: Math.round(provider.totalGenerationKwh), lastReading: 'Buyer grid telemetry',
      daysSilent: 0, status: provider.reliability < 93 ? 'Fraud Risk' : 'Healthy',
      riskReason: provider.reliability < 93 ? `Buyer grid reliability is ${provider.reliability}%` : 'Buyer grid telemetry is within the expected operating range.',
      meterId: provider.meterStatus, feeder: provider.inverter, lastKwh: provider.currentGenerationKwh,
      expectedKwh: Math.round(provider.capacityKw * 4), source: 'Buyer grid',
    })),
    ...displayProsumers.map((row) => {
      const connection = { ...row, status: row.atRisk ? 'Fraud Risk' : 'Healthy', meterId: row.meterId || (row.source === 'On-chain' ? 'ONCHAIN-METER' : 'SIM-METER'), feeder: row.feeder || (row.source === 'On-chain' ? 'ONCHAIN-FEED' : 'LOCAL-FEED'), lastKwh: row.lastKwh ?? null, expectedKwh: row.expectedKwh ?? (row.source === 'On-chain' ? null : Math.round(Number(row.capacityKw) * 5)) };
      return { ...connection, riskReason: row.atRisk ? getRiskReason(connection) : 'Generation matches the expected operating profile' };
    }),
    ...pendingList.map((row) => ({ ...row, status: 'Waiting', riskReason: 'Awaiting government registration approval', trustScore: null, meterId: 'Pending meter', feeder: 'Pending feeder', lastKwh: 0, expectedKwh: 0 })),
  ], [displayProsumers, pendingList]);

  return (
    <div
      id="solarsettle-govt-dashboard"
      className="ss-app buyer-theme govt-shell glass-dashboard"
      style={{ '--ss-dashboard-image': `url(${process.env.PUBLIC_URL}/solarsettle-hero.png)` }}
    >
      <aside className="ss-sidebar">
        <Link to="/" className="ss-brand" style={{ textDecoration: 'none', color: 'inherit' }}><div className="ss-brand-mark">☀</div><div><strong>SolarSettle</strong><span>Clean energy. Trusted together.</span></div></Link>
        <nav className="ss-nav" aria-label="Government navigation">
          <button className={'ss-nav-item ' + (activeTab === 'overview' ? 'active' : '')} onClick={() => setActiveTab('overview')}><span className="ss-nav-icon">⌂</span>Overview</button>
          <button className={'ss-nav-item ' + (activeTab === 'monitoring' ? 'active' : '')} onClick={() => setActiveTab('monitoring')}><span className="ss-nav-icon">◉</span>Monitoring</button>
          <button className={'ss-nav-item ' + (activeTab === 'registry' ? 'active' : '')} onClick={() => setActiveTab('registry')}><span className="ss-nav-icon">▤</span>Registry</button>
          <Link className="ss-nav-item" to="/buyer"><span className="ss-nav-icon">↗</span>Marketplace</Link>
        </nav>
        <div className="ss-sidebar-help"><span>Need help?</span><button type="button">Government support</button></div>
        <button className="ss-logout" onClick={logout}>↪ Log Out</button>
      </aside>
      <main className="ss-main">
        <header className="ss-header"><div className="ss-search"><span>⌕</span><input aria-label="Search monitored accounts" placeholder="Search wallets, subsidy IDs, locations..." /></div><div className="ss-header-actions"><button className="ss-icon-button" aria-label="Alerts">●</button><button className="ss-avatar" aria-label="Government profile">GV</button></div></header>
        <div className="ss-content"><div className="dashboard govt-dashboard">
        <h2>Government Dashboard</h2>
        <p className="dashboard-sub">Role: Government. {isWalletConnected ? ('Connected: ' + short(account)) : 'Presentation preview with sample registry data.'}</p>

        {!isWalletConnected && (
          <div className="panel-form">
            <h3>Connect MetaMask to interact with the blockchain</h3>
            <p className="dashboard-sub">Approvals, penalties, and monitoring require a connected wallet.</p>
            <button className="connect-btn" onClick={connectWallet} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        )}

        {stats && (
          <div className="card-grid">
            <TiltCard className="stat-card"><p className="stat-label">Total Generation Logged</p><p className="stat-value solar">{(selectedState ? filteredProsumers.reduce((sum, row) => sum + row.generated, 0) : stats.totalKwh).toLocaleString('en-IN')} kWh</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Approved Prosumers</p><p className="stat-value trust">{selectedState ? filteredProsumers.length : stats.registeredCount}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Active Listings</p><p className="stat-value">{stats.activeListings}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Pending Approvals</p><p className="stat-value" style={{ color: filteredPending.length > 0 ? 'var(--accent-alert)' : undefined }}>{filteredPending.length}</p></TiltCard>
          </div>
        )}

        <section className="govt-controls" aria-label="Government dashboard filters">
          <div><span className="control-label">Grid scope</span><strong>{selectedState || 'All India'}</strong></div>
          {selectedState && <button className="scope-reset" onClick={() => setSelectedState('')}>Clear state filter</button>}
          <div className="range-control" aria-label="Timeline range">{RANGE_OPTIONS.map((option) => <button key={option.id} className={timeRange === option.id ? 'active' : ''} onClick={() => setTimeRange(option.id)}>{option.label}</button>)}</div>
        </section>

        <nav className="govt-tabs" aria-label="Government dashboard sections">
          {[['overview', 'Overview'], ['monitoring', 'Monitoring'], ['registry', 'Registry']].map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
        </nav>

        {activeTab === 'overview' && <>
        <GridHealthTimeline data={gridTimeline} range={timeRange} selectedState={selectedState} />

        <AlertCenter alerts={alertItems} selectedState={selectedState} />

        <div className="fraud-demo-panel">
          <div>
            <p className="fraud-demo-kicker">Jury fraud simulation</p>
            <h3>Inject a suspicious smart-meter event</h3>
            <p className="dashboard-sub">Demo cases are local-only and clearly marked. Real MetaMask approvals and penalties still use the connected contract.</p>
          </div>
          <div className="fraud-demo-actions">
            <button className="nav-btn" onClick={() => handleDemoFraud('spike')}>Meter Spike</button>
            <button className="nav-btn" onClick={() => handleDemoFraud('silent')}>Silent Meter</button>
            <button className="nav-btn" onClick={() => handleDemoFraud('duplicate')}>Duplicate Subsidy</button>
            <button className="nav-btn" onClick={handleResetDemo}>Reset Demo</button>
          </div>
        </div>

        <div className="card-grid">
          <TiltCard className="stat-card"><p className="stat-label">Monitored Accounts</p><p className="stat-value">{displayProsumers.length}</p></TiltCard>
          <TiltCard className="stat-card"><p className="stat-label">Open Fraud Cases</p><p className="stat-value alert">{activeFraudCount}</p></TiltCard>
          <TiltCard className="stat-card"><p className="stat-label">Average Trust</p><p className="stat-value trust">{avgTrust}/100</p></TiltCard>
        </div>

        {demoCase && (
          <div className="fraud-banner">
            <h3>Fraud alert: {demoCase.label}</h3>
            <p><strong>{short(demoCase.address)}</strong> - {demoCase.riskReason}</p>
            <p>{demoCase.evidence}. Detected at {demoCase.detectedAt}.</p>
          </div>
        )}
        </>}

        {activeTab === 'monitoring' && <IndiaConnectionMap
          connections={mapConnections}
          selectedId={selectedMapId}
          zoomed={mapZoomed}
          liveMode={!demoMode}
          loading={loadingLiveData}
          selectedState={selectedState}
          onStateSelect={setSelectedState}
          onSelect={(row) => {
            setSelectedMapId(row.address);
            setMapZoomed(true);
            if (prosumers.some((item) => item.address === row.address)) {
              setActiveTab('registry');
              setTimeout(() => document.getElementById(`prosumer-${row.address}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
            }
          }}
        />}

        {activeTab === 'registry' && <>
        <h3 className="section-label" style={{ marginTop: 30 }}>Registration approvals</h3>
        {!contract ? <p className="dashboard-sub">Connect a wallet to view approvals.</p> : filteredPending.length === 0 ? <p className="dashboard-sub">No pending registrations in this scope.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th></th></tr></thead><tbody>
            {filteredPending.map((r) => (<tr key={r.address}><td className="mono">{short(r.address)}</td><td className="mono">{r.subsidyID}</td><td>{r.location}</td><td>{r.capacityKw} kW</td><td><button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleApprove(r.address)} disabled={pending}>{demoMode ? 'Approve sample' : pending ? 'Confirming...' : 'Approve'}</button></td></tr>))}
          </tbody></table></div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>Registered prosumers — live monitoring</h3>
        {filteredProsumers.length === 0 ? <p className="dashboard-sub">No approved prosumers in this scope.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th>Trust</th><th>Generated</th><th>Last Reading</th><th>Risk Signal</th><th>Status</th><th></th></tr></thead><tbody>
            {filteredProsumers.map((p) => (
              <tr id={`prosumer-${p.address}`} key={p.address} className={p.atRisk ? 'risk-row' : ''}><td className="mono">{short(p.address)} {p.isDemo && <span className="demo-tag">Demo</span>}</td><td className="mono">{p.subsidyID}</td><td>{p.location}</td><td>{p.capacityKw} kW</td><td><strong>{p.trustScore}/100</strong></td><td>{p.generated} kWh</td><td>{p.lastReading} {p.daysSilent > INACTIVITY_WINDOW_DAYS ? '(' + p.daysSilent + 'd silent)' : ''}</td><td>{p.riskReason || getRiskReason(p)}</td><td><span className={'status-pill ' + (p.atRisk ? 'alert' : 'active')}>{p.atRisk ? 'Fraud Risk' : 'Healthy'}</span></td><td>{p.atRisk && (p.isDemo ? <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleDemoPenalty(p.address)}>Sim Penalty</button> : <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCheckInactivity(p.address)} disabled={pending}>{demoMode ? 'Apply sample penalty' : 'Apply Penalty'}</button>)}</td></tr>
            ))}
          </tbody></table></div>
        )}
        </>}
        </div>{toast && <div className="tx-toast">{toast.text}</div>}</div>
      </main>
    </div>
  );
}

function IndiaConnectionMap({ connections, selectedId, zoomed, onSelect, liveMode, loading, selectedState, onStateSelect }) {
  const [hoveredStateId, setHoveredStateId] = useState(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
  const cityCounts = {};
  const positioned = connections.map((connection, index) => {
    const city = Object.keys(CITY_POSITIONS).find((name) => connection.location?.includes(name));
    const stateCode = STATE_CODES[connection.stateName] || connection.location?.split(',').pop()?.trim() || 'MP';
    const duplicateIndex = city ? (cityCounts[city] || 0) : 0;
    if (city) cityCounts[city] = duplicateIndex + 1;
    const basePoint = CITY_POSITIONS[city] || STATE_ANCHORS[STATE_NAMES[stateCode]] || { x: 285 + ((index * 43) % 90), y: 330 + ((index * 47) % 130) };
    const offset = duplicateIndex ? { x: duplicateIndex * 5, y: duplicateIndex * -5 } : { x: 0, y: 0 };
    return { ...connection, stateCode, city, point: { x: basePoint.x + offset.x, y: basePoint.y + offset.y } };
  });
  const selected = positioned.find((row) => row.address === selectedId) || positioned[0];
  const hovered = positioned.find((row) => row.address === hoveredConnectionId);
  const toneFor = (row) => row.status === 'Fraud Risk' ? 'risk' : row.status === 'Waiting' ? 'waiting' : 'healthy';
  const stateStats = indiaMap.locations.reduce((result, state) => {
    const rows = positioned.filter((row) => STATE_NAMES[row.stateCode] === state.name);
    const active = rows.filter((row) => toneFor(row) === 'healthy').length;
    const waiting = rows.filter((row) => toneFor(row) === 'waiting').length;
    const risk = rows.filter((row) => toneFor(row) === 'risk').length;
    const totalExpected = rows.reduce((sum, row) => sum + (row.expectedKwh || 0), 0);
    const totalObserved = rows.reduce((sum, row) => sum + (row.lastKwh || 0), 0);
    const avgRisk = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.status === 'Fraud Risk' ? 100 : row.status === 'Waiting' ? 55 : Math.max(5, 100 - (row.trustScore || 100))), 0) / rows.length) : 0;
    const heatScore = rows.length ? Math.min(100, Math.round((avgRisk * 0.65) + ((risk / rows.length) * 35))) : 0;
    result[state.id] = { name: state.name, rows, active, waiting, risk, heatScore, coverage: totalExpected ? Math.round((totalObserved / totalExpected) * 100) : null };
    return result;
  }, {});
  const hoveredState = hoveredStateId ? stateStats[hoveredStateId] : null;
  const detail = hovered || selected;
  const showStateDetail = hoveredState && !hovered;

  return (
    <section className="govt-map-panel" aria-label="India state connection map">
      <div className="govt-map-heading">
        <div><p className="eyebrow">{liveMode ? 'Live on-chain risk heatmap' : 'State-level risk heatmap'}</p><h3>India connection map</h3><p>{loading ? 'Reading prosumer registry from MetaMask...' : liveMode ? 'State fill uses on-chain trust and inactivity risk. Markers show live connections.' : 'State fill shows demo risk exposure. Markers show simulated connection status and telemetry.'}</p></div>
        <div className="map-legend" aria-label="Connection status legend"><span><i className="legend-dot healthy"></i>Active</span><span><i className="legend-dot waiting"></i>Waiting</span><span><i className="legend-dot risk"></i>At risk</span><span><i className="legend-dot neutral"></i>No data</span><span className="heat-legend"><i className="heat-swatch heat-low"></i><i className="heat-swatch heat-mid"></i><i className="heat-swatch heat-high"></i>Risk exposure</span></div>
      </div>
      <div className={'india-map-stage ' + (zoomed ? 'zoomed' : '')}>
        <svg className="india-map" viewBox={indiaMap.viewBox} role="img" aria-label="Accurate India map divided by states with monitored city connections">
          <g className="india-states">
            {indiaMap.locations.map((state) => {
              const summary = stateStats[state.id];
              const heatLevel = summary?.rows.length ? Math.min(5, Math.max(1, Math.ceil(summary.heatScore / 20))) : 0;
              return <path key={state.id} className={'india-state heat-' + heatLevel + (hoveredStateId === state.id ? ' hovered' : '') + (selectedState === state.name ? ' selected-state' : '')} d={state.path} tabIndex="0" aria-label={`${state.name}: ${summary?.rows.length || 0} connections, risk exposure ${summary?.heatScore || 0}%`} onMouseEnter={() => setHoveredStateId(state.id)} onMouseLeave={() => setHoveredStateId(null)} onFocus={() => setHoveredStateId(state.id)} onBlur={() => setHoveredStateId(null)} onClick={() => onStateSelect(selectedState === state.name ? '' : state.name)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onStateSelect(selectedState === state.name ? '' : state.name); }}><title>{state.name}: risk exposure {summary?.heatScore || 0}%</title></path>;
            })}
          </g>
          {positioned.map((row) => <g key={row.address} className={'map-connection ' + (row.address === selectedId ? 'selected' : '')} onMouseEnter={() => setHoveredConnectionId(row.address)} onMouseLeave={() => setHoveredConnectionId(null)}><circle className={'map-pulse ' + toneFor(row)} cx={row.point.x} cy={row.point.y} r={row.address === selectedId ? 21 : 15} /><circle className={'map-marker ' + toneFor(row)} cx={row.point.x} cy={row.point.y} r={row.address === selectedId ? 9 : 7} role="button" tabIndex="0" aria-label={`${row.subsidyID}, ${row.location}, ${row.status}`} onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(row); }} /></g>)}
          {selected && <g className="map-callout" transform={`translate(${Math.min(selected.point.x + 15, 455)} ${Math.max(selected.point.y - 55, 12)})`}><rect width="140" height="46" rx="6" /><text x="10" y="18">{selected.location}</text><text className={toneFor(selected) === 'risk' ? 'callout-risk' : ''} x="10" y="35">{selected.status}</text></g>}
        </svg>
        <div className={'map-detail ' + (showStateDetail ? 'state-detail' : '') + (detail && toneFor(detail) === 'risk' ? ' risk' : '')}>
          {showStateDetail ? <><span className="map-detail-kicker">State heatmap detail</span><strong>{hoveredState.name}</strong><span className="heat-score">Risk exposure {hoveredState.heatScore}%</span><div className="state-coverage"><span style={{ width: `${Math.min(100, Math.max(4, hoveredState.coverage || 0))}%` }}></span></div><small>{hoveredState.coverage === null ? (liveMode ? 'On-chain generation baseline is unavailable for this state' : 'No generation baseline available') : `${hoveredState.coverage}% of expected generation observed`}</small><div className="state-counts"><b className="healthy-text">{hoveredState.active} active</b><b className="waiting-text">{hoveredState.waiting} waiting</b><b className="risk-text">{hoveredState.risk} at risk</b></div>{hoveredState.risk > 0 && <div className="state-risk-list">{hoveredState.rows.filter((row) => toneFor(row) === 'risk').map((row) => <strong key={row.address}>{row.location}: {row.riskReason}</strong>)}</div>}<em>{hoveredState.rows.length ? 'Hover a city marker for connection telemetry.' : 'No connection data available on the selected network.'}</em></> : detail ? <><span className="map-detail-kicker">{hovered ? 'Connection telemetry' : 'Selected connection'}</span><strong>{detail.subsidyID}</strong><span>{detail.location} · {detail.meterId} · {detail.feeder}</span>{detail.lastKwh === null ? <span>Lifetime generation {detail.generated?.toLocaleString('en-IN') || 0} kWh · Carbon credits {detail.credits?.toLocaleString('en-IN') || 0}</span> : <span>{detail.lastKwh} kWh observed / {detail.expectedKwh} kWh expected</span>}<span>Trust {detail.trustScore ?? 'Pending'}/100 · Silent {detail.daysSilent ?? 'n/a'} days</span><em>{detail.status === 'Fraud Risk' ? detail.riskReason : detail.status === 'Waiting' ? detail.riskReason : 'Generation and feeder telemetry are within the expected operating range.'}</em></> : <em>Select a city marker to inspect its telemetry.</em>}
        </div>
      </div>
    </section>
  );
}

function buildAlerts(rows, source = 'monitoring') {
  const alerts = [];
  const subsidyCounts = rows.reduce((counts, row) => ({ ...counts, [row.subsidyID]: (counts[row.subsidyID] || 0) + 1 }), {});
  const statisticsFor = (row) => ({
    Wallet: row.address || 'Not available',
    Location: row.location || 'Not available',
    'Subsidy ID': row.subsidyID || 'Not available',
    'Panel capacity': row.capacityKw ? `${row.capacityKw} kW` : 'Not available',
    'Trust score': row.trustScore !== undefined ? `${row.trustScore}/100` : 'Not available',
    'Lifetime generation': row.generated !== undefined ? `${row.generated} kWh` : 'Not available',
    'Meter silence': row.daysSilent !== undefined ? `${row.daysSilent} days` : 'Not available',
    'Risk signal': row.riskReason || getRiskReason(row),
  });
  rows.forEach((row) => {
    if (row.daysSilent > INACTIVITY_WINDOW_DAYS) alerts.push({ tone: 'red', title: 'Meter inactivity', detail: `${row.location}: no reading for ${row.daysSilent} days`, subject: row.subsidyID, source, stats: statisticsFor(row) });
    if (row.trustScore < 40) alerts.push({ tone: 'red', title: 'Low trust score', detail: `${row.location}: trust is ${row.trustScore}/100`, subject: row.subsidyID, source, stats: statisticsFor(row) });
    if (row.riskReason?.includes('Claimed')) alerts.push({ tone: 'red', title: 'Unusual output', detail: `${row.location}: ${row.riskReason}`, subject: row.subsidyID, source, stats: statisticsFor(row) });
    if (subsidyCounts[row.subsidyID] > 1) alerts.push({ tone: 'amber', title: 'Duplicate registration', detail: `${row.location}: subsidy ID is attached to multiple wallets`, subject: row.subsidyID, source, stats: { ...statisticsFor(row), 'Wallets sharing subsidy': String(subsidyCounts[row.subsidyID]) } });
  });
  if (!alerts.length) alerts.push({ tone: 'green', title: 'Grid operating normally', detail: 'No active meter, output, trust, or registration alerts in this scope.', subject: 'Healthy scope', source });
  return alerts;
}

function GridHealthTimeline({ data, range, selectedState }) {
  const total = data.reduce((sum, series) => sum + series.points.reduce((seriesSum, point) => seriesSum + point.generation, 0), 0);
  const risks = data.reduce((sum, series) => sum + series.points.filter((point) => point.risk).length, 0);
  return <section className="grid-health-panel">
    <div className="panel-heading"><div><p className="eyebrow">Buyer marketplace grid data</p><h3>Grid health timeline</h3><p>{selectedState || 'All India'} · {data.length} independently monitored Buyer grids · {range === 'today' ? 'hourly' : range === '1y' ? 'monthly' : 'daily'} generation</p></div><div className="timeline-summary"><strong>{Math.round(total).toLocaleString('en-IN')} kWh</strong><span>{risks} grid-level risk spikes</span></div></div>
    <div className="grid-track-list">{data.map(({ provider, points }) => <GridTrack key={provider.id} provider={provider} points={points} />)}</div>
    <div className="timeline-legend"><span><i className="generation-key"></i>Production per Buyer grid</span><span><i className="risk-key"></i>Output / weather risk spike</span></div>
  </section>;
}

function GridTrack({ provider, points }) {
  const width = 340;
  const height = 108;
  const chartTop = 34;
  const chartBottom = 92;
  const [activeIndex, setActiveIndex] = useState(Math.max(points.length - 1, 0));
  useEffect(() => setActiveIndex(Math.max(points.length - 1, 0)), [points]);
  const max = Math.max(...points.map((point) => point.generation), 1);
  const chartPoints = points.map((point, index) => ({ ...point, x: 8 + (index * (width - 16)) / Math.max(points.length - 1, 1), y: chartBottom - (point.generation / max) * (chartBottom - chartTop) }));
  const path = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${chartPoints.at(-1).x.toFixed(1)} ${chartBottom} L ${chartPoints[0].x.toFixed(1)} ${chartBottom} Z`;
  const riskCount = points.filter((point) => point.risk).length;
  const activePoint = chartPoints[Math.min(activeIndex, chartPoints.length - 1)];
  const gradientId = `grid-fill-${provider.id}`;
  const selectPointFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((x - 8) / (width - 16)) * Math.max(points.length - 1, 1));
    setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
  };
  const tooltipX = Math.min(Math.max(activePoint.x - 49, 4), width - 102);
  return <article className="grid-track"><div className="grid-track-head"><div><strong>{provider.name}</strong><span>{provider.city}, {provider.stateName}</span></div><b>{Math.round(points.reduce((sum, point) => sum + point.generation, 0)).toLocaleString('en-IN')} kWh</b></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${provider.name} interactive generation timeline`} onMouseMove={selectPointFromPointer} onClick={selectPointFromPointer}><defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" className="timeline-fill-start" /><stop offset="100%" className="timeline-fill-end" /></linearGradient></defs><line x1="8" x2={width - 8} y1={chartTop} y2={chartTop} className="timeline-grid" /><line x1="8" x2={width - 8} y1={(chartTop + chartBottom) / 2} y2={(chartTop + chartBottom) / 2} className="timeline-grid" /><line x1="8" x2={width - 8} y1={chartBottom} y2={chartBottom} className="timeline-axis" /><path d={areaPath} className="timeline-area" fill={`url(#${gradientId})`} /><path d={path} className="timeline-line" /><line x1={activePoint.x} x2={activePoint.x} y1={chartTop} y2={chartBottom} className="timeline-guide" />{chartPoints.map((point, index) => <circle key={point.label} cx={point.x} cy={point.y} r={index === activeIndex ? 5 : point.risk ? 3.8 : 2.6} className={`timeline-point ${point.risk ? 'risk' : ''} ${index === activeIndex ? 'active' : ''}`} tabIndex="0" role="button" aria-label={`${point.label}: ${Math.round(point.generation)} kWh${point.risk ? ', risk spike' : ''}`} onFocus={() => setActiveIndex(index)} onMouseEnter={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} />)}<g className="timeline-tooltip" transform={`translate(${tooltipX} 3)`}><rect width="102" height="25" rx="5" /><text x="7" y="11">{activePoint.label}</text><text x="7" y="21">{Math.round(activePoint.generation)} kWh{activePoint.risk ? ' · Risk' : ''}</text></g></svg><small>{provider.reliability}% reliability · {riskCount ? `${riskCount} spike${riskCount > 1 ? 's' : ''}` : 'No spikes'} · Hover or select a point for details</small></article>;
}

function AlertCenter({ alerts, selectedState }) {
  const [delivery, setDelivery] = useState('');
  useEffect(() => {
    const scope = selectedState || 'All India';
    const critical = alerts.filter((alert) => alert.tone === 'red');
    if (!critical.length) { setDelivery('No critical alerts require automatic delivery.'); return; }
    const unsent = critical.filter((alert) => {
      const key = `solarsettle.alert.sent.${alert.source}.${alert.subject}.${alert.title}.${alert.detail}`;
      try { return !window.sessionStorage.getItem(key); } catch { return true; }
    });
    if (!unsent.length) { setDelivery('Critical alerts already delivered recently.'); return; }
    setDelivery(`Automatically sending ${unsent.length} critical alert${unsent.length > 1 ? 's' : ''}…`);
    Promise.all(unsent.map(async (alert) => {
      await sendAlertEmail(alert, scope);
      const key = `solarsettle.alert.sent.${alert.source}.${alert.subject}.${alert.title}.${alert.detail}`;
      try { window.sessionStorage.setItem(key, String(Date.now())); } catch { /* Deduplication is best-effort. */ }
    })).then(() => setDelivery(`Automatically queued ${unsent.length} critical alert${unsent.length > 1 ? 's' : ''}.`))
      .catch((error) => setDelivery(`Automatic delivery needs SMTP setup: ${error.message}`));
  }, [alerts, selectedState]);
  return <section className="alert-center"><div className="panel-heading"><div><p className="eyebrow">Automatic alerting</p><h3>Alert center</h3><p>{selectedState || 'All India'} · critical alerts are queued automatically</p></div><span className="alert-count">{alerts.length} active</span></div><div className="alert-grid">{alerts.map((alert, index) => <article className={`alert-card ${alert.tone}`} key={`${alert.subject}-${alert.title}-${index}`}><span>{alert.tone === 'red' ? 'Automatically queued' : alert.tone === 'amber' ? 'Review' : 'Healthy'}</span><strong>{alert.title}</strong><p>{alert.detail}</p><small>{alert.subject}</small></article>)}</div>{delivery && <p className="mail-status" role="status">{delivery}</p>}</section>;
}
