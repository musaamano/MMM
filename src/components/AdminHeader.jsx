import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { logout as apiLogout, getCurrentUser } from '../api/api';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import NotificationAlerts from './NotificationAlerts';
import './AdminHeader.css';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminHeader = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [displayName, setDisplayName] = useState('Admin User');
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    const current = getCurrentUser();
    if (current?.name) setDisplayName(current.name);
    if (current?.profilePhoto) setProfilePhoto(current.profilePhoto);
    // Also fetch fresh from DB
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(u => {
          if (u.profilePhoto) setProfilePhoto(u.profilePhoto);
          if (u.name) setDisplayName(u.name);
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    const handleAdminPhotoUpdated = (e) => {
      const nextPhoto = e?.detail?.profilePhoto;
      const nextName = e?.detail?.name;
      if (nextPhoto) setProfilePhoto(nextPhoto);
      if (nextName) setDisplayName(nextName);
    };
    window.addEventListener('adminProfilePhotoUpdated', handleAdminPhotoUpdated);
    return () => window.removeEventListener('adminProfilePhotoUpdated', handleAdminPhotoUpdated);
  }, []);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <div className="admin-header">
        <div className="header-left">
          <h1 className="page-title">Dashboard</h1>
        </div>
        
        <div className="header-right">
          <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              open={showNotifications}
              onToggle={setShowNotifications}
            />
          
          <div className="header-profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <img src={profilePhoto || "https://via.placeholder.com/40"} alt="Admin" className="header-avatar" />
            <div className="header-profile-info">
              <span className="header-profile-name">{displayName}</span>
              <span className="header-profile-role">Administrator</span>
            </div>
            <span className="profile-dropdown-arrow">▼</span>
            
            {showProfileMenu && (
              <div className="profile-dropdown-menu">
                <Link to="/admin/settings" className="dropdown-menu-item">
                  <span>👤</span>
                  <span>My Profile</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-menu-item logout-item" onClick={handleLogout}>
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <NotificationAlerts notifications={notifications} />

    </>
  );
};

export default AdminHeader;
