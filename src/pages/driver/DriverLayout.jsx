import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Calendar, ClipboardCheck, Fuel, Wrench, Settings, User, MessageSquareWarning } from 'lucide-react';
import { getCurrentUser } from '../../api/api';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from '../../components/NotificationDropdown';
import NotificationAlerts from '../../components/NotificationAlerts';
import './DriverLayout.css';
import './driverShared.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

const DriverLayout = ({ onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const settingsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'D';

  // Fetch profile photo
  useEffect(() => {
    const t = token();
    if (!t) return;
    fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(u => { if (u.profilePhoto) setProfilePhoto(u.profilePhoto); })
      .catch(console.error);
  }, [location.pathname]);

  // Live-update avatar when profile page uploads a new photo
  useEffect(() => {
    const handlePhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      if (nextPhoto) setProfilePhoto(nextPhoto);
    };
    window.addEventListener('profilePhotoUpdated', handlePhotoUpdated);
    return () => window.removeEventListener('profilePhotoUpdated', handlePhotoUpdated);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const navItems = [
    { to: '/driver/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/driver/trips',     icon: <Car size={18} />,             label: 'My Trips' },
    { to: '/driver/schedule',  icon: <Calendar size={18} />,        label: 'Schedule' },
    { to: '/driver/inspection',icon: <ClipboardCheck size={18} />,  label: 'Inspection' },
    { to: '/driver/fuel',         icon: <Fuel size={18} />,            label: 'Fuel Log' },
    { to: '/driver/fuel-request', icon: <Fuel size={18} />,            label: 'Fuel Request' },
    { to: '/driver/maintenance',icon: <Wrench size={18} />,                label: 'Maintenance' },
    { to: '/driver/complaints', icon: <MessageSquareWarning size={18} />,  label: 'Complaints' },
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <div className="driver-wrapper">
      <NotificationAlerts notifications={notifications} />
      {/* Mobile toggle */}
      <button className="driver-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span className={`driver-hamburger ${mobileOpen ? 'open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>
      {mobileOpen && <div className="driver-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`driver-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="driver-sidebar-header">
          <div className="driver-logo">
            <div className="driver-logo-icon"><Car size={20} color="#16a34a" /></div>
            {!collapsed && <span className="driver-logo-text">HU-VMS</span>}
          </div>
          <button className="driver-collapse-btn" onClick={() => setCollapsed(p => !p)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="driver-nav">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`driver-nav-item ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : ''}
            >
              <span className="driver-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="driver-main">
        {/* Header */}
        <header className="driver-header">
          <div className="driver-header-left">
            <h1>Driver Portal</h1>
          </div>
          <div className="driver-header-right">
            {/* Notifications */}
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              open={showNotif}
              onToggle={setShowNotif}
            />

            {/* Settings */}
            <div className="driver-header-dropdown" ref={settingsRef}>
              <button className="driver-header-btn" onClick={() => setShowSettings(p => !p)}>
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="driver-dropdown-panel driver-settings-panel">
                  <Link to="/driver/profile" className="driver-settings-item" onClick={() => setShowSettings(false)}>
                    <User size={15} /> My Profile
                  </Link>
                </div>
              )}
            </div>

            {/* Avatar + name */}
            <div className="driver-header-profile">
              <div className="driver-avatar">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials
                }
              </div>
              <div className="driver-header-info">
                <span className="driver-header-name">{currentUser?.name || 'Driver'}</span>
                <span className="driver-header-role">DRIVER</span>
              </div>
            </div>

            <button className="driver-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {/* Content */}
        <main className="driver-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DriverLayout;
