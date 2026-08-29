import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, ClipboardList, AlertTriangle, Bell, User, Settings, X, CheckCheck } from 'lucide-react';
import { getCurrentUser, getRequests, getComplaints } from '../../api/api';
import './user.css';
import API_BASE_URL from '../../config.js';

const buildNotifications = (requests, complaints, username) => {
  const notifs = [];
  requests.forEach(req => {
    const base = { id: `req-${req._id}`, createdAt: req.updatedAt || req.createdAt };
    if (req.status === 'approved') notifs.push({ ...base, type: 'success', title: 'Request Approved', message: `Your request to "${req.destination}" has been approved.${req.assignedVehicle ? ` Vehicle: ${req.assignedVehicle}.` : ''}` });
    else if (req.status === 'rejected') notifs.push({ ...base, type: 'error', title: 'Request Rejected', message: `Your request to "${req.destination}" was rejected.${req.rejectionReason ? ` Reason: ${req.rejectionReason}` : ''}` });
    else if (req.status === 'completed') notifs.push({ ...base, type: 'success', title: 'Trip Completed', message: `Your trip to "${req.destination}" has been completed.` });
    else if (req.status === 'pending') notifs.push({ ...base, type: 'info', title: 'Request Pending', message: `Your request to "${req.destination}" is under review.` });
  });
  complaints.filter(c => c.senderUsername === username).forEach(c => {
    const base = { id: `cmp-${c._id}`, createdAt: c.updatedAt || c.createdAt };
    if (c.status === 'Resolved') notifs.push({ ...base, type: 'success', title: 'Complaint Resolved', message: `Your complaint (${c.category}) has been resolved.` });
    else notifs.push({ ...base, type: 'info', title: 'Complaint Submitted', message: `Your complaint (${c.category}) is being reviewed.` });
  });
  return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const UserLayout = ({ onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_read') || '[]'); } catch { return []; }
  });
  const notifRef = useRef(null);
  const settingsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();

  // Fetch profile photo from DB on mount and on route change (catches updates from settings page)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(user => { if (user.profilePhoto) setProfilePhoto(user.profilePhoto); })
      .catch(console.error);
  }, [location.pathname]); // re-fetch whenever user navigates (picks up photo changes)

  // Live-update avatar when user uploads a new profile photo
  useEffect(() => {
    const handlePhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      if (nextPhoto) setProfilePhoto(nextPhoto);
    };
    window.addEventListener('userProfilePhotoUpdated', handlePhotoUpdated);
    return () => window.removeEventListener('userProfilePhotoUpdated', handlePhotoUpdated);
  }, []);

  // Fetch notifications and poll every 30s
  const fetchNotifs = () => {
    if (!currentUser?.username) return;
    Promise.all([
      getRequests({ requesterUsername: currentUser.username }),
      getComplaints(),
    ]).then(([reqs, complaints]) => {
      setNotifications(buildNotifications(reqs, complaints, currentUser.username));
    }).catch(console.error);
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const enriched = notifications.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const unreadCount = enriched.filter(n => !n.read).length;

  const markAllRead = () => {
    const ids = notifications.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem('notif_read', JSON.stringify(ids));
  };

  const markRead = (id) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('notif_read', JSON.stringify(updated));
  };

  const typeColor = { success: '#16a34a', error: '#dc2626', info: '#3b82f6', warning: '#f59e0b' };
  const typeIcon  = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const navItems = [
    { to: '/user/dashboard',        icon: <LayoutDashboard size={18} />, label: 'Dashboard',        match: ['/user/dashboard', '/user'] },
    { to: '/user/request-vehicle',  icon: <Car size={18} />,             label: 'Request Vehicle' },
    { to: '/user/my-requests',      icon: <ClipboardList size={18} />,   label: 'My Requests' },
    { to: '/user/submit-complaint', icon: <AlertTriangle size={18} />,   label: 'Submit Complaint' },
    { to: '/user/settings',         icon: <Settings size={18} />,        label: 'Settings' },
  ];

  const isActive = (item) => {
    if (item.match) return item.match.includes(location.pathname);
    return location.pathname === item.to;
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="user-dashboard-wrapper">
      {/* Mobile Toggle */}
      <button className="user-mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <span className={`user-hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>

      {isMobileMenuOpen && <div className="user-mobile-overlay" onClick={closeMobileMenu} />}

      {/* Sidebar */}
      <div className={`user-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="user-sidebar-header">
          <div className="user-logo">
            <div className="user-logo-icon"><Car size={20} color="#16a34a" /></div>
            {!collapsed && <span className="user-logo-text">HU-VMS</span>}
          </div>
          <button className="user-collapse-btn" onClick={() => setCollapsed(p => !p)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="user-sidebar-nav">
          {!collapsed && <div className="user-nav-section-label">Navigation</div>}
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`user-nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={closeMobileMenu}
              title={collapsed ? item.label : ''}
            >
            <span className="user-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

      </div>

      {/* Main Content */}
      <div className="user-main-content">
        {/* Header */}
        <div className="user-header">
          <div className="user-header-left">
            <h1>User Portal</h1>
          </div>
          <div className="user-header-right">

            {/* Notification Bell */}
            <div className="user-notif-wrapper" ref={notifRef}>
              <button
                className="user-header-icon-btn"
                onClick={() => setShowNotifPanel(p => !p)}
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="user-notif-badge">{unreadCount}</span>}
              </button>

              {showNotifPanel && (
                <div className="user-notif-panel">
                  <div className="user-notif-panel-header">
                    <span>Notifications</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {unreadCount > 0 && (
                        <button className="user-notif-mark-all" onClick={markAllRead} title="Mark all read">
                          <CheckCheck size={15} />
                        </button>
                      )}
                      <button className="user-notif-close" onClick={() => setShowNotifPanel(false)}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="user-notif-list">
                    {enriched.length === 0 ? (
                      <div className="user-notif-empty">
                        <Bell size={32} color="#d1d5db" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      enriched.map(n => (
                        <div
                          key={n.id}
                          className={`user-notif-item ${n.read ? 'read' : 'unread'}`}
                          onClick={() => markRead(n.id)}
                        >
                          <span className="user-notif-type-icon">{typeIcon[n.type]}</span>
                          <div className="user-notif-body">
                            <div className="user-notif-title" style={{ color: typeColor[n.type] }}>{n.title}</div>
                            <div className="user-notif-msg">{n.message}</div>
                            <div className="user-notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                          {!n.read && <span className="user-notif-dot" />}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="user-notif-footer" onClick={() => { setShowNotifPanel(false); navigate('/user/notifications'); }}>
                    View all notifications →
                  </div>
                </div>
              )}
            </div>

            {/* Settings dropdown */}
            <div style={{ position: 'relative' }} ref={settingsRef}>
              <button className="user-header-icon-btn" onClick={() => setShowSettings(p => !p)} title="Settings">
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="user-settings-dropdown">
                  <Link to="/user/profile" className="user-settings-item" onClick={() => setShowSettings(false)}>
                    <User size={15} /> My Profile
                  </Link>
                </div>
              )}
            </div>

            {/* Profile + Name */}
            <div className="user-header-profile">
              <div className="user-avatar">
                {profilePhoto
                  ? <img src={profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : initials
                }
              </div>
              <div className="user-header-info">
                <span className="user-header-name">{currentUser?.name || 'User'}</span>
                <span className="user-header-role">USER</span>
              </div>
            </div>

            <button className="user-header-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="user-page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
