import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Droplets, Package,
  FileText, Bell, Settings, User, X, CheckCheck,
  ChevronLeft, ChevronRight, Fuel
} from 'lucide-react';
import { getCurrentUser, getFuelRequests, getFuelInventory } from '../../api/api';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationAlerts from '../../components/NotificationAlerts';
import './FuelStationLayout.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

export default function FuelStationLayout({ onLogout }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('fuel_notif_read') || '[]'); } catch { return []; }
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { notifications: apiNotifications } = useNotifications();
  const notifRef    = useRef(null);
  const settingsRef = useRef(null);
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = getCurrentUser();

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'FO';

  // Fetch profile photo + notifications
  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(u => { if (u.profilePhoto) setProfilePhoto(u.profilePhoto); })
      .catch(console.error);
    fetchNotifications();
  }, [location.pathname]);

  // Live-update fuel station avatar after profile photo upload
  useEffect(() => {
    const handleFuelPhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      if (nextPhoto) setProfilePhoto(nextPhoto);
    };
    window.addEventListener('fuelProfilePhotoUpdated', handleFuelPhotoUpdated);
    return () => window.removeEventListener('fuelProfilePhotoUpdated', handleFuelPhotoUpdated);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [requests, inventory] = await Promise.all([
        getFuelRequests(),
        getFuelInventory(),
      ]);
      const notifs = [];

      // Pending fuel requests
      if (Array.isArray(requests)) {
        const pending = requests.filter(r => r.status === 'pending');
        setPendingCount(pending.length);
        pending.forEach(r => notifs.push({
          id: `req-${r._id}`,
          icon: '⛽', color: '#f59e0b',
          title: 'New Fuel Request',
          message: `${r.driverName} — ${r.vehicleType || r.vehiclePlate || '—'} needs ${r.requestedLiters}L`,
          time: r.createdAt,
          link: '/fuel/requests',
        }));

        // Approved but not dispensed
        requests.filter(r => r.status === 'approved').forEach(r => notifs.push({
          id: `appr-${r._id}`,
          icon: '✅', color: '#16a34a',
          title: 'Ready to Dispense',
          message: `${r.driverName} — ${r.permittedLiters}L approved`,
          time: r.approvedAt || r.updatedAt,
          link: '/fuel/dispense',
        }));
      }

      // Low inventory alerts
      if (Array.isArray(inventory)) {
        inventory.filter(i => i.available < 100).forEach(i => notifs.push({
          id: `inv-${i._id || i.fuelType}`,
          icon: '📦', color: '#dc2626',
          title: 'Low Fuel Stock',
          message: `${i.fuelType} — only ${i.available}L remaining`,
          time: i.updatedAt || new Date().toISOString(),
          link: '/fuel/inventory',
        }));
      }

      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifs);
    } catch (err) { console.error(err); }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const enriched    = notifications.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const unreadCount = enriched.filter(n => !n.read).length;

  const markRead = (id) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('fuel_notif_read', JSON.stringify(updated));
  };

  const markAllRead = () => {
    const ids = notifications.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem('fuel_notif_read', JSON.stringify(ids));
  };

  const handleLogout = () => { if (onLogout) onLogout(); navigate('/login'); };

  const navItems = [
    { to: '/fuel/dashboard',     icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/fuel/requests',      icon: <ClipboardList size={20} />,   label: 'Fuel Requests', badge: pendingCount },
    { to: '/fuel/dispense',      icon: <Droplets size={20} />,        label: 'Dispense Fuel' },
    { to: '/fuel/inventory',     icon: <Package size={20} />,         label: 'Inventory' },
    { to: '/fuel/transactions',  icon: <FileText size={20} />,        label: 'Transactions' },
    { to: '/fuel/reports',       icon: <FileText size={20} />,        label: 'Reports' },
    { to: '/fuel/notifications', icon: <Bell size={20} />,            label: 'Notifications' },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <div className="fuel-layout-wrapper">
      <NotificationAlerts notifications={apiNotifications} />
      {/* Mobile toggle */}
      <button className="fuel-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span className={`fuel-hamburger ${mobileOpen ? 'open' : ''}`}><span /><span /><span /></span>
      </button>
      {mobileOpen && <div className="fuel-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fuel-sidebar-new ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="fuel-sidebar-header-new">
          <div className="fuel-logo-new">
            <div className="fuel-logo-icon-new"><Fuel size={20} color="#16a34a" /></div>
            {!collapsed && <span className="fuel-logo-text-new">HU-VMS</span>}
          </div>
          <button className="fuel-collapse-btn" onClick={() => setCollapsed(p => !p)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="fuel-nav-new">
          {navItems.map(item => (
            <Link key={item.to} to={item.to}
              className={`fuel-nav-item-new ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : ''}>
              <span className="fuel-nav-icon-new">{item.icon}</span>
              {!collapsed && <span className="fuel-nav-label-new">{item.label}</span>}
              {!collapsed && item.badge > 0 && <span className="fuel-nav-badge-new">{item.badge}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="fuel-main-new">
        {/* Header */}
        <header className="fuel-header-new">
          <div className="fuel-header-left-new">
            <h1>Fuel Station</h1>
            <span className="fuel-header-sub">Operations</span>
          </div>

          <div className="fuel-header-right-new">
            {/* Notification Bell */}
            <div className="fuel-header-dropdown-new" ref={notifRef}>
              <button className="fuel-header-btn-new" onClick={() => setShowNotif(p => !p)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="fuel-notif-badge-new">{unreadCount}</span>}
              </button>
              {showNotif && (
                <div className="fuel-notif-panel-new">
                  <div className="fuel-notif-header-new">
                    <span>Notifications</span>
                    <div style={{ display:'flex', gap:6 }}>
                      {unreadCount > 0 && (
                        <button className="fuel-notif-action-new" onClick={markAllRead}><CheckCheck size={15} /></button>
                      )}
                      <button className="fuel-notif-action-new" onClick={() => setShowNotif(false)}><X size={15} /></button>
                    </div>
                  </div>
                  <div className="fuel-notif-list-new">
                    {enriched.length === 0 ? (
                      <div className="fuel-notif-empty-new"><Bell size={32} color="#d1d5db" /><p>No notifications</p></div>
                    ) : enriched.map(n => (
                      <div key={n.id} className={`fuel-notif-item-new ${n.read ? 'read' : 'unread'}`}
                        onClick={() => { markRead(n.id); setShowNotif(false); navigate(n.link); }}>
                        <span style={{ fontSize:18 }}>{n.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:n.color }}>{n.title}</div>
                          <div style={{ fontSize:12, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.message}</div>
                          <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(n.time).toLocaleString()}</div>
                        </div>
                        {!n.read && <span style={{ width:8, height:8, borderRadius:'50%', background:n.color, flexShrink:0, marginTop:6 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="fuel-header-dropdown-new" ref={settingsRef}>
              <button className="fuel-header-btn-new" onClick={() => setShowSettings(p => !p)}>
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="fuel-settings-panel-new">
                  <Link to="/fuel/profile" className="fuel-settings-item-new" onClick={() => setShowSettings(false)}>
                    <User size={15} /> My Profile
                  </Link>
                  <Link to="/fuel/settings" className="fuel-settings-item-new" onClick={() => setShowSettings(false)}>
                    <Settings size={15} /> Settings
                  </Link>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="fuel-header-profile-new">
              <div className="fuel-avatar-new">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                  : initials}
              </div>
              <div className="fuel-header-info-new">
                <span className="fuel-header-name-new">{currentUser?.name || 'Fuel Officer'}</span>
                <span className="fuel-header-role-new">FUEL OFFICER</span>
              </div>
            </div>

            <button className="fuel-logout-btn-new" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="fuel-content-new"><Outlet /></main>
      </div>
    </div>
  );
}
