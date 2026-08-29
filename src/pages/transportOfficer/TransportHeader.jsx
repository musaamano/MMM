import { Search, ChevronDown, Menu, Settings, User, LogOut, Lock, Eye, EyeOff, X, Check, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from '../../components/NotificationDropdown';
import NotificationAlerts from '../../components/NotificationAlerts';
import { getCurrentUser, updateUser } from '../../api/api';
import './TransportHeader.css';

const TransportHeader = ({ onLogout, toggleSidebar, isSidebarOpen }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileImage, setProfileImage]               = useState(null);
  const [modal, setModal]                             = useState(null); // 'profile' | 'edit' | 'password' | 'notifications' | 'theme'
  const [saving, setSaving]                           = useState(false);
  const [toast, setToast]                             = useState('');

  // Real user from localStorage / DB
  const rawUser = getCurrentUser();
  const [userInfo, setUserInfo] = useState({
    name:       rawUser?.name       || rawUser?.username || 'Transport Officer',
    email:      rawUser?.email      || 'transport@haramaya.edu.et',
    phone:      rawUser?.phone      || '',
    department: rawUser?.department || 'Transport Operations',
    employeeId: rawUser?.employeeId || rawUser?._id?.slice(-6)?.toUpperCase() || 'HU-TO',
    role:       rawUser?.role       || 'TRANSPORT',
    _id:        rawUser?._id        || '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState({ ...userInfo });

  // Password form state
  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw]     = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError]   = useState('');

  // Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    newRequests: true, tripUpdates: true, complaints: true, reports: false,
  });
  const [darkMode, setDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState('#6366f1');

  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openModal = (name) => {
    setEditForm({ ...userInfo });
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError('');
    setModal(name);
    setShowProfileDropdown(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (userInfo._id) {
        const updated = await updateUser(userInfo._id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          department: editForm.department,
        });
        const merged = { ...userInfo, ...editForm };
        setUserInfo(merged);
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }));
      } else {
        setUserInfo({ ...userInfo, ...editForm });
      }
      setModal(null);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.next || pwForm.next.length < 6) {
      setPwError('New password must be at least 6 characters.'); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Passwords do not match.'); return;
    }
    setSaving(true);
    try {
      if (userInfo._id) {
        await updateUser(userInfo._id, { password: pwForm.next });
      }
      setModal(null);
      showToast('Password changed successfully');
    } catch (err) {
      setPwError('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const initials = userInfo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="transport-header-wrapper">

      {/* Toast */}
      {toast && (
        <div className="th-toast">
          <Check size={14} /> {toast}
        </div>
      )}
      <NotificationAlerts notifications={notifications} />

      <div className="top-admin-bar">
        {/* Bell */}
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          open={showNotifications}
          onToggle={setShowNotifications}
        />

        {/* Gear — opens settings modal */}
        <div className="admin-dropdown-container" ref={dropdownRef}>
          <button className="th-icon-btn" onClick={() => setShowProfileDropdown(o => !o)}>
            <Settings size={20} />
          </button>

          {showProfileDropdown && (
            <div className="admin-dropdown">
              <div className="admin-dropdown-header">
                <div className="admin-dropdown-avatar">
                  {profileImage
                    ? <img src={profileImage} alt="Profile" className="profile-image" />
                    : <span className="admin-avatar-text">{initials}</span>}
                </div>
                <div className="admin-dropdown-info">
                  <h4>{userInfo.name}</h4>
                  <p>{userInfo.role}</p>
                  <span className="admin-email">{userInfo.email}</span>
                </div>
              </div>
              <div className="admin-dropdown-divider" />
              <div className="admin-dropdown-menu">
                <button className="admin-dropdown-item" onClick={() => openModal('profile')}>
                  <User size={16} /><span>View Profile</span>
                </button>
                <button className="admin-dropdown-item" onClick={() => openModal('edit')}>
                  <Settings size={16} /><span>Edit Personal Info</span>
                </button>
                <button className="admin-dropdown-item" onClick={() => fileInputRef.current?.click()}>
                  <span className="th-icon-emoji">📷</span><span>Upload Profile Picture</span>
                </button>
                <button className="admin-dropdown-item" onClick={() => openModal('password')}>
                  <Lock size={16} /><span>Change Password</span>
                </button>
                <button className="admin-dropdown-item" onClick={() => openModal('notifications')}>
                  <Bell size={16} /><span>Notification Settings</span>
                </button>
                <button className="admin-dropdown-item" onClick={() => openModal('theme')}>
                  <span className="th-icon-emoji">🎨</span><span>Theme Preferences</span>
                </button>
              </div>
              <div className="admin-dropdown-divider" />
              <button className="admin-dropdown-item logout-item" onClick={onLogout}>
                <LogOut size={16} /><span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Avatar + Name/Role pill */}
        <div className="th-profile-pill">
          <div className="th-pill-avatar">
            {profileImage
              ? <img src={profileImage} alt="Profile" className="profile-image" />
              : <span>{initials}</span>}
          </div>
          <div className="th-pill-info">
            <span className="th-pill-name">{userInfo.name}</span>
            <span className="th-pill-role">{userInfo.role}</span>
          </div>
        </div>

        {/* Logout */}
        <button className="th-logout-btn" onClick={onLogout}>Logout</button>
      </div>

      {/* Main header bar */}
      <div className="transport-header">
        <div className="header-left">
          {!isSidebarOpen && (
            <button className="menu-toggle-btn" onClick={toggleSidebar}>
              <Menu size={20} />
            </button>
          )}
          <div className="title-section">
            <h1 className="page-title">Transport</h1>
            <h1 className="page-subtitle">Operations</h1>
          </div>
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
        </div>
        <div className="header-right">
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

      {/* ── VIEW PROFILE MODAL ── */}
      {modal === 'profile' && (
        <div className="th-modal-overlay" onClick={() => setModal(null)}>
          <div className="th-modal" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <h3>Profile</h3>
              <button className="th-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="th-modal-body">
              <div className="th-profile-avatar-lg">
                {profileImage
                  ? <img src={profileImage} alt="Profile" className="profile-image" />
                  : <span>{initials}</span>}
              </div>
              <div className="th-profile-rows">
                {[
                  ['Full Name',    userInfo.name],
                  ['Email',        userInfo.email],
                  ['Phone',        userInfo.phone || '—'],
                  ['Department',   userInfo.department],
                  ['Employee ID',  userInfo.employeeId],
                  ['Role',         userInfo.role],
                ].map(([label, val]) => (
                  <div key={label} className="th-profile-row">
                    <span className="th-profile-label">{label}</span>
                    <span className="th-profile-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="th-modal-footer">
              <button className="th-btn primary" onClick={() => openModal('edit')}>Edit Profile</button>
              <button className="th-btn secondary" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {modal === 'edit' && (
        <div className="th-modal-overlay" onClick={() => setModal(null)}>
          <div className="th-modal" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <h3>Edit Personal Info</h3>
              <button className="th-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="th-modal-body">
              {[
                { label: 'Full Name',   key: 'name',       type: 'text' },
                { label: 'Email',       key: 'email',      type: 'email' },
                { label: 'Phone',       key: 'phone',      type: 'tel' },
                { label: 'Department',  key: 'department', type: 'text' },
              ].map(f => (
                <div key={f.key} className="th-form-group">
                  <label>{f.label}</label>
                  <input type={f.type} value={editForm[f.key] || ''}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="th-modal-footer">
              <button className="th-btn primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="th-btn secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {modal === 'password' && (
        <div className="th-modal-overlay" onClick={() => setModal(null)}>
          <div className="th-modal" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <h3>Change Password</h3>
              <button className="th-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="th-modal-body">
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password',     key: 'next' },
                { label: 'Confirm Password', key: 'confirm' },
              ].map(f => (
                <div key={f.key} className="th-form-group">
                  <label>{f.label}</label>
                  <div className="th-pw-wrap">
                    <input
                      type={showPw[f.key] ? 'text' : 'password'}
                      value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <button type="button" className="th-pw-toggle"
                      onClick={() => setShowPw(p => ({ ...p, [f.key]: !p[f.key] }))}>
                      {showPw[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
              {pwError && <div className="th-error">{pwError}</div>}
            </div>
            <div className="th-modal-footer">
              <button className="th-btn primary" onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Saving…' : 'Change Password'}
              </button>
              <button className="th-btn secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION SETTINGS MODAL ── */}
      {modal === 'notifications' && (
        <div className="th-modal-overlay" onClick={() => setModal(null)}>
          <div className="th-modal" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <h3>Notification Settings</h3>
              <button className="th-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="th-modal-body">
              {[
                { key: 'newRequests', label: 'New vehicle requests',    sub: 'Alert when a user submits a request' },
                { key: 'tripUpdates', label: 'Trip status updates',     sub: 'Start, complete, or cancel events' },
                { key: 'complaints',  label: 'Complaint notifications', sub: 'New or escalated complaints' },
                { key: 'reports',     label: 'Report deliveries',       sub: 'When a new report is received' },
              ].map(n => (
                <div key={n.key} className="th-notif-row">
                  <div>
                    <div className="th-notif-label">{n.label}</div>
                    <div className="th-notif-sub">{n.sub}</div>
                  </div>
                  <label className="th-toggle">
                    <input type="checkbox" checked={notifPrefs[n.key]}
                      onChange={() => setNotifPrefs(p => ({ ...p, [n.key]: !p[n.key] }))} />
                    <span className="th-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
            <div className="th-modal-footer">
              <button className="th-btn primary" onClick={() => { setModal(null); showToast('Notification preferences saved'); }}>
                Save Preferences
              </button>
              <button className="th-btn secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── THEME PREFERENCES MODAL ── */}
      {modal === 'theme' && (
        <div className="th-modal-overlay" onClick={() => setModal(null)}>
          <div className="th-modal" onClick={e => e.stopPropagation()}>
            <div className="th-modal-header">
              <h3>Theme Preferences</h3>
              <button className="th-modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="th-modal-body">
              <div className="th-theme-row">
                <div>
                  <div className="th-notif-label">Dark Mode</div>
                  <div className="th-notif-sub">Switch to dark interface</div>
                </div>
                <label className="th-toggle">
                  <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(d => !d)} />
                  <span className="th-toggle-slider" />
                </label>
              </div>
              <div className="th-form-group" style={{ marginTop: 18 }}>
                <label>Accent Color</label>
                <div className="th-color-swatches">
                  {['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#0ea5e9'].map(c => (
                    <button key={c} className={`th-swatch ${accentColor === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setAccentColor(c)}
                    >
                      {accentColor === c && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="th-modal-footer">
              <button className="th-btn primary" onClick={() => { setModal(null); showToast('Theme preferences saved'); }}>
                Apply
              </button>
              <button className="th-btn secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportHeader;
