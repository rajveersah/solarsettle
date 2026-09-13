import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';
import './LoginPage.css';

const ROLES = [
  {
    key: 'government',
    name: 'Government / DISCOM',
    desc: 'Approve registrations, monitor meter risk, and enforce penalties.',
    icon: '⌁',
  },
  {
    key: 'prosumer',
    name: 'Prosumer',
    desc: 'Register panels, log verified readings, and list surplus energy.',
    icon: 'ϟ',
  },
  {
    key: 'buyer',
    name: 'Buyer',
    desc: 'Browse the marketplace and settle purchases through MetaMask.',
    icon: '↗',
  },
];

export default function LoginPage() {
  const { selectedRole, loginAs } = useWeb3();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (selectedRole && ROLE_HOME[selectedRole]) {
      navigate(ROLE_HOME[selectedRole], { replace: true });
    }
  }, [selectedRole, navigate]);

  const handleSelect = (role) => {
    loginAs(role);
    navigate(ROLE_HOME[role], { replace: true });
  };

  return (
    <main
      className="login-page"
      style={{ '--login-image': `url(${process.env.PUBLIC_URL}/solarsettle-hero.png)` }}
    >
      <div className="login-frame" aria-hidden="true" />
      <header className="login-nav">
        <Link to="/" className="login-brand" aria-label="SolarSettle home">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="7" />
            <path d="M20 2v7M20 31v7M2 20h7M31 20h7M7.3 7.3l5 5M27.7 27.7l5 5M32.7 7.3l-5 5M12.3 27.7l-5 5" />
          </svg>
          <span>SolarSettle</span>
        </Link>
        <Link to="/" className="back-home">← Back to home</Link>
      </header>
      <div className="login-wrap">
        <div className="login-card">
          <span className="login-eyebrow">Welcome to SolarSettle</span>
          <h1>Choose your space<br />in the network.</h1>
          <p className="login-sub">Select how you want to continue. Your dashboard is tailored to the role you choose.</p>

          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.key}
                className="role-card"
                onClick={() => handleSelect(r.key)}
              >
                <span className="role-card-icon">{r.icon}</span>
                <span className="role-card-name">{r.name}</span>
                <span className="role-card-desc">{r.desc}</span>
                <span className="role-card-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <span className="login-side-label">People<br />power<br />possibility<i /></span>
    </main>
  );
}
