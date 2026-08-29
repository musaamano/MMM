import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Wrench, Calendar, Package, BarChart2, Settings, User, X } from 'lucide-react';
import { getCurrentUser } from '../../api/api';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from '../../components/NotificationDropdown';
import NotificationAlerts from '../../components/NotificationAlerts';
import './MaintenanceLayout.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');

export default function MaintenanceLayout({ onLogout }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif]   = useState(false);
  const [stats, setStats]           = useState({ pending: 0, lowStock: 0 });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const settingsRef = useRef(null);
  const navigate    = useNavigate();
  const location    = useLocation();
  const currentUser = getCurrentUser();

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'MO';

  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(u => { if (u.profilePhoto) setProfilePhoto(u.profilePhoto); })
      .catch(console.error);
    fetchStats();
  }, [location.pathname]);

  // Live-update avatar after maintenance profile photo upload
  useEffect(() => {
    const handlePhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      if (nextPhoto) setProfilePhoto(nextPhoto);
    };
    window.addEventListener('maintenanceProfilePhotoUpdated', handlePhotoUpdated);
    return () => window.removeEventListener('maintenanceProfilePhotoUpdated', handlePhotoUpdated);
  }, []);

  const fetchStats = () => {
    const t = token(); if (!t) return;
    Promise.all([
      fetch(`${BASE}/maintenance/stats`,     { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${BASE}/maintenance/issues`,    { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${BASE}/maintenance/inventory`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${BASE}/maintenance/schedule`,  { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([s, issues, inventory, schedules]) => {
      if (s.pending != null) setStats(s);

      // Build notifications
      const notifs = [];

      // New pending issues
      if (Array.isArray(issues)) {
        issues.filter(i => i.status === 'pending').forEach(i => {
          notifs.push({
            id: `issue-${i._id}`,
            type: 'issue',
            title: 'New Maintenance Issue',
            message: `${i.vehiclePlate} — ${i.issue.slice(0, 50)}`,
            priority: i.priority,
            time: i.createdAt,
            color: i.priority === 'High' || i.priority === 'Critical' ? '#dc2626' : '#f59e0b',
            icon: '🔧',
            link: '/maintenance/issues',
          });
        });

        // Flagged issues
        issues.filter(i => i.autoFlagged && i.status !== 'completed').forEach(i => {
          notifs.push({
            id: `flag-${i._id}`,
            type: 'flagged',
            title: '⚠ High Priority Issue Detected',
            message: `${i.vehiclePlate}: ${i.issue.slice(0, 50)}`,
            time: i.createdAt,
            color: '#dc2626',
            icon: '🚨',
            link: '/maintenance/issues',
          });
        });
      }

      // Low stock alerts
      if (Array.isArray(inventory)) {
        inventory.filter(item => item.quantity <= item.minLevel).forEach(item => {
          notifs.push({
            id: `stock-${item._id}`,
            type: 'stock',
            title: 'Low Stock Alert',
            message: `${item.partName} — only ${item.quantity} left (min: ${item.minLevel})`,
            time: item.updatedAt || item.createdAt,
            color: '#dc2626',
            icon: '📦',
            link: '/maintenance/inventory',
          });
        });
      }

      // Overdue schedules
      if (Array.isArray(schedules)) {
        schedules.filter(s => s.status === 'overdue').forEach(s => {
          notifs.push({
            id: `sched-${s._id}`,
            type: 'schedule',
            title: 'Overdue Maintenance',
            message: `${s.vehiclePlate} — ${s.description} was due ${new Date(s.scheduledDate).toLocaleDateString()}`,
            time: s.scheduledDate,
            color: '#f59e0b',
            icon: '📅',
            link: '/maintenance/schedule',
          });
        });
      }

      // Sort newest first (reserved for future custom maintenance feed UI)
      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
    }).catch(console.error);
  };

  // Poll every 60 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { if (onLogout) onLogout(); navigate('/login'); };

  const navItems = [
    { to: '/maintenance/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/maintenance/issues',     icon: <ClipboardList size={18} />,   label: 'Issues', badge: stats.pending },
    { to: '/maintenance/repair',     icon: <Wrench size={18} />,          label: 'Repair Tracking' },
    { to: '/maintenance/schedule',   icon: <Calendar size={18} />,        label: 'Schedule' },
    { to: '/maintenance/inventory',  icon: <Package size={18} />,         label: 'Inventory', badge: stats.lowStock },
    { to: '/maintenance/reports',    icon: <BarChart2 size={18} />,       label: 'Reports' },
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <div className="maint-wrapper">
      <NotificationAlerts notifications={notifications} />
      <button className="maint-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span className={`maint-hamburger ${mobileOpen ? 'open' : ''}`}><span /><span /><span /></span>
      </button>
      {mobileOpen && <div className="maint-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`maint-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="maint-sidebar-header">
          <div className="maint-logo">
            <div className="maint-logo-icon"><Wrench size={20} color="#16a34a" /></div>
            {!collapsed && <span className="maint-logo-text">HU-VMS</span>}
          </div>
          <button className="maint-collapse-btn" onClick={() => setCollapsed(p => !p)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="maint-nav">
          {navItems.map(item => (
            <Link key={item.to} to={item.to}
              className={`maint-nav-item ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : ''}>
              <span className="maint-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge > 0 && <span className="maint-nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="maint-main">
        <header className="maint-header">
          <div className="maint-header-left"><h1>Maintenance</h1></div>
          <div className="maint-header-right">
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              open={showNotif}
              onToggle={setShowNotif}
            />

            <div className="maint-header-dropdown" ref={settingsRef}>
              <button className="maint-header-btn" onClick={() => setShowSettings(p => !p)}>
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="maint-settings-panel">
                  <Link to="/maintenance/profile" className="maint-settings-item" onClick={() => setShowSettings(false)}>
                    <User size={15} /> My Profile
                  </Link>
                </div>
              )}
            </div>

            <div className="maint-header-profile">
              <div className="maint-avatar">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials}
              </div>
              <div className="maint-header-info">
                <span className="maint-header-name">{currentUser?.name || 'Maintenance Officer'}</span>
                <span className="maint-header-role">MAINTENANCE</span>
              </div>
            </div>
            <button className="maint-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="maint-content"><Outlet /></main>
      </div>
    </div>
  );
}
