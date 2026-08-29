import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, updateUser } from '../../api/api';
import './adminTheme.css';
import './settings.css';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance');
  const currentUser = getCurrentUser();
  const [profileImage, setProfileImage] = useState(currentUser?.profilePhoto || currentUser?.profilePicture || 'https://via.placeholder.com/120');
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');

  const [form, setForm] = useState({
    firstName: currentUser?.firstName || currentUser?.name?.split(' ')[0] || '',
    lastName:  currentUser?.lastName  || currentUser?.name?.split(' ')[1] || '',
    email:     currentUser?.email     || '',
    phone:     currentUser?.phone     || '',
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) return;
    setSaving(true);
    try {
      const newName = `${form.firstName} ${form.lastName}`.trim();
      await updateUser(userId, {
        name: newName,
        email: form.email,
        phone: form.phone,
      });
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: newName, email: form.email, phone: form.phone }));
      window.dispatchEvent(new CustomEvent('adminProfilePhotoUpdated', { detail: { name: newName } }));
      showToast('Changes saved successfully');
    } catch (err) {
      showToast('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { id: 'dark', name: 'Dark', icon: '🌙', color: '#0f172a' },
    { id: 'light', name: 'Light', icon: '☀️', color: '#ffffff' },
    { id: 'colorful', name: 'Colorful', icon: '🎨', color: '#6366f1' }
  ];

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoData = reader.result;
        setSaving(true);
        try {
          const userId = currentUser?._id || currentUser?.id;
          if (!userId) throw new Error('User not found');
          await updateUser(userId, { profilePhoto: photoData });
          setProfileImage(photoData);
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...stored, profilePhoto: photoData }));
          window.dispatchEvent(new CustomEvent('adminProfilePhotoUpdated', { detail: { profilePhoto: photoData } }));
          showToast('Profile photo updated successfully');
        } catch (err) {
          showToast('Failed to upload photo: ' + err.message);
        } finally {
          setSaving(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    try {
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) throw new Error('User not found');
      await updateUser(userId, { profilePhoto: '' });
      setProfileImage('https://via.placeholder.com/120');
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, profilePhoto: '' }));
      window.dispatchEvent(new CustomEvent('adminProfilePhotoUpdated', { detail: { profilePhoto: '' } }));
      showToast('Profile photo removed');
    } catch (err) {
      showToast('Failed to remove photo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('profile-image-input').click();
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20, background:'#22c55e', color:'#fff',
          padding:'10px 20px', borderRadius:10, zIndex:9999, fontWeight:600, fontSize:14,
          boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
        }}>{toast}</div>
      )}

      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          🎨 Appearance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button 
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h2>Theme Selection</h2>
            <p className="section-description">Choose your preferred theme for the admin panel</p>
            
            <div className="theme-grid">
              {themes.map(t => (
                <div 
                  key={t.id}
                  className={`theme-card ${theme === t.id ? 'active' : ''}`}
                  onClick={() => toggleTheme(t.id)}
                >
                  <div className="theme-preview" style={{ background: t.color }}>
                    <span className="theme-icon">{t.icon}</span>
                  </div>
                  <div className="theme-info">
                    <h3>{t.name}</h3>
                    {theme === t.id && <span className="active-badge">✓ Active</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="settings-group">
              <h3>Display Options</h3>
              <label className="setting-item">
                <input type="checkbox" defaultChecked />
                <span>Show animations</span>
              </label>
              <label className="setting-item">
                <input type="checkbox" defaultChecked />
                <span>Enable tooltips</span>
              </label>
              <label className="setting-item">
                <input type="checkbox" />
                <span>Compact mode</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h2>Notification Preferences</h2>
            <p className="section-description">Manage how you receive notifications</p>
            
            <div className="settings-group">
              <h3>Email Notifications</h3>
              <label className="setting-item">
                <input type="checkbox" defaultChecked />
                <span>Report requests</span>
              </label>
              <label className="setting-item">
                <input type="checkbox" defaultChecked />
                <span>Password reset requests</span>
              </label>
              <label className="setting-item">
                <input type="checkbox" />
                <span>System updates</span>
              </label>
            </div>

            <div className="settings-group">
              <h3>Push Notifications</h3>
              <label className="setting-item">
                <input type="checkbox" defaultChecked />
                <span>Enable push notifications</span>
              </label>
              <label className="setting-item">
                <input type="checkbox" />
                <span>Sound alerts</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="settings-section">
            <h2>Account Settings</h2>
            <p className="section-description">Manage your account information and profile</p>
            
            <div className="settings-group">
              <h3>Profile Picture</h3>
              <div className="profile-picture-section">
                <div className="current-picture">
                  <img src={profileImage} alt="Profile" className="profile-pic" />
                  <span className="online-badge">Online</span>
                </div>
                <div className="picture-actions">
                  <input 
                    type="file" 
                    id="profile-image-input"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button 
                    className="btn-secondary" 
                    onClick={triggerFileInput}
                  >
                    📤 Upload New Photo
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={handleRemovePhoto}
                  >
                    🗑️ Remove Photo
                  </button>
                  <p className="help-text">Recommended: Square image, at least 400x400px, max 5MB</p>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={currentUser?.role || '—'} readOnly
                  style={{ background:'#f8fafc', cursor:'not-allowed' }} />
              </div>
            </div>

            <div className="settings-group">
              <h3>Security</h3>
              <button className="btn-secondary">Change Password</button>
              <button className="btn-secondary">Enable Two-Factor Authentication</button>
              <button className="btn-secondary">View Login History</button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="btn-secondary">Reset to Default</button>
      </div>
    </div>
  );
};

export default Settings;
