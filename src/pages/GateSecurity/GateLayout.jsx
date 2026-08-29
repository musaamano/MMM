import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, List, AlertTriangle, FileWarning, Bell, Settings, User, X, QrCode } from 'lucide-react';
import { getCurrentUser } from '../../api/api';
import './GateLayout.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

export default function GateLayout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const notifRef = useRef(null);
  const settingsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'GO';

  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(u => { if (u.profilePhoto) setProfilePhoto(u.profilePhoto); })
      .catch(console.error);
  }, [location.pathname]);

  // Live-update gate avatar after profile photo upload
  useEffect(() => {
    const saved = localStorage.getItem('gateSecurityProfilePhoto');
    if (saved) setProfilePhoto(saved);

    const handlePhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      if (nextPhoto) setProfilePhoto(nextPhoto);
    };

    window.addEventListener('gateProfilePhotoUpdated', handlePhotoUpdated);
    window.addEventListener('profilePhotoUpdated', handlePhotoUpdated);
    return () => {
      window.removeEventListener('gateProfilePhotoUpdated', handlePhotoUpdated);
      window.removeEventListener('profilePhotoUpdated', handlePhotoUpdated);
    };
  }, []);

  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${BASE}/security/logs?status=unauthorized&limit=5`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(logs => { if (Array.isArray(logs)) setAlerts(logs.slice(0, 5)); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { if (onLogout) onLogout(); navigate('/login'); };

  const navItems = [
    { to: '/gate/dashboard',   icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/gate/verify',      icon: <ShieldCheck size={18} />,     label: 'Vehicle Check' },
    { to: '/gate/qr-scan',    icon: <QrCode size={18} />,          label: 'QR Scanner' },
    { to: '/gate/logs',        icon: <List size={18} />,            label: 'Gate Logs' },
    { to: '/gate/incidents',   icon: <FileWarning size={18} />,     label: 'Incidents' },
    { to: '/gate/alerts',      icon: <AlertTriangle size={18} />,   label: 'Alerts' },
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <div className="gate-wrapper">
      <button className="gate-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span className={`gate-hamburger ${mobileOpen ? 'open' : ''}`}><span /><span /><span /></span>
      </button>
      {mobileOpen && <div className="gate-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`gate-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="gate-sidebar-header">
          <div className="gate-logo">
            <div className="gate-logo-icon"><ShieldCheck size={20} color="#16a34a" /></div>
            {!collapsed && <span className="gate-logo-text">HU-VMS</span>}
          </div>
          <button className="gate-collapse-btn" onClick={() => setCollapsed(p => !p)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="gate-nav">
          {navItems.map(item => (
            <Link key={item.to} to={item.to}
              className={`gate-nav-item ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : ''}>
              <span className="gate-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="gate-main">
        <header className="gate-header">
          <div className="gate-header-left">
            <h1>Security Gate</h1>
          </div>
          <div className="gate-header-right">
            {/* Alerts bell */}
            <div className="gate-header-dropdown" ref={notifRef}>
              <button className="gate-header-btn" onClick={() => setShowNotif(p => !p)}>
                <Bell size={20} />
                {alerts.length > 0 && <span className="gate-badge">{alerts.length}</span>}
              </button>
              {showNotif && (
                <div className="gate-dropdown-panel">
                  <div className="gate-dropdown-header">
                    <span>Unauthorized Alerts</span>
                    <button onClick={() => setShowNotif(false)}><X size={14} /></button>
                  </div>
                  <div className="gate-dropdown-list">
                    {alerts.length === 0
                      ? <div className="gate-dropdown-empty"><p>No alerts</p></div>
                      : alerts.map(a => (
                        <div key={a._id} className="gate-alert-item">
                          <span className="gate-alert-plate">{a.plateNumber}</span>
                          <span className="gate-alert-msg">Unauthorized entry attempt</span>
                          <span className="gate-alert-time">{new Date(a.entryTime).toLocaleTimeString()}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="gate-header-dropdown" ref={settingsRef}>
              <button className="gate-header-btn" onClick={() => setShowSettings(p => !p)}>
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="gate-dropdown-panel gate-settings-panel">
                  <Link to="/gate/profile" className="gate-settings-item" onClick={() => setShowSettings(false)}>
                    <User size={15} /> My Profile
                  </Link>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="gate-header-profile">
              <div className="gate-avatar">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials}
              </div>
              <div className="gate-header-info">
                <span className="gate-header-name">{currentUser?.name || 'Gate Officer'}</span>
                <span className="gate-header-role">GATE OFFICER</span>
              </div>
            </div>

            <button className="gate-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="gate-content"><Outlet /></main>
      </div>
    </div>
  );
}
