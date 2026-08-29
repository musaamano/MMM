import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../../api/api';
import './UserProfile.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

const UserProfile = () => {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  const [profileData, setProfileData] = useState({
    name: '', email: '', phone: '', department: '', employeeId: '',
    username: '', role: '', createdAt: '',
    profilePhoto: null,
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load real user data from DB
  useEffect(() => {
    const t = token();
    if (!t) { setLoading(false); return; }
    fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); } catch { throw new Error('Server error'); }
      })
      .then(user => {
        setProfileData(p => ({
          ...p,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          department: user.department || '',
          employeeId: user.employeeId || '',
          username: user.username || '',
          role: user.role || '',
          createdAt: user.createdAt || '',
          profilePhoto: user.profilePhoto || null,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setProfileData(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
  };

  // Convert image to base64 and save to DB
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }

    setUploadingPhoto(true);

    // Compress image using canvas before base64 encoding
    const compressImage = (file) => new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let { width, height } = img;
        if (width > height) { if (width > MAX) { height = (height * MAX) / width; width = MAX; } }
        else { if (height > MAX) { width = (width * MAX) / height; height = MAX; } }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = url;
    });

    try {
      const base64 = await compressImage(file);
      try {
        const res = await fetch(`${BASE}/users/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ profilePhoto: base64 }),
        });
        const text = await res.text();
        console.log('Upload response status:', res.status);
        console.log('Upload response text (first 200):', text.slice(0, 200));
        let data;
        try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`); }
        if (!res.ok) throw new Error(data.message);
        setProfileData(p => ({ ...p, profilePhoto: base64 }));
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, profilePhoto: base64 }));
        window.dispatchEvent(new CustomEvent('userProfilePhotoUpdated', { detail: { profilePhoto: base64 } }));
        showToast('Profile photo updated!');
      } catch (err) {
        showToast(err.message || 'Failed to upload photo', 'error');
      } finally {
        setUploadingPhoto(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to process image', 'error');
      setUploadingPhoto(false);
    }
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!profileData.name) newErrors.name = 'Name is required';
    if (!profileData.email) newErrors.email = 'Email is required';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSaving(true);
    try {
      const res = await fetch(`${BASE}/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: profileData.name, email: profileData.email, phone: profileData.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: data.name, email: data.email }));
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!profileData.currentPassword) newErrors.currentPassword = 'Required';
    if (!profileData.newPassword) newErrors.newPassword = 'Required';
    if (profileData.newPassword.length < 8) newErrors.newPassword = 'Min 8 characters';
    if (profileData.newPassword !== profileData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSaving(true);
    try {
      const res = await fetch(`${BASE}/users/me/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ currentPassword: profileData.currentPassword, newPassword: profileData.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProfileData(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showToast('Password changed successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = profileData.name
    ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;

  return (
    <div className="user-profile-page">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>{toast.msg}</div>
      )}

      <h1 className="profile-page-title">My Account</h1>

      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-picture-section">
            <div className="profile-picture" onClick={() => fileRef.current.click()} title="Click to change photo">
              {profileData.profilePhoto ? (
                <img src={profileData.profilePhoto} alt="Profile" />
              ) : (
                <span className="profile-initials">{initials}</span>
              )}
              <div className="profile-picture-overlay">
                {uploadingPhoto ? '...' : '📷'}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/bmp,image/svg+xml,image/tiff,image/heic,image/heif" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <button type="button" className="btn-upload-picture" onClick={() => fileRef.current.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Max 5MB · JPG, PNG, WEBP, GIF...</p>
          </div>
          <div className="profile-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                {profileData.name || '—'}
              </h2>
              <span style={{
                padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: '#dcfce7', color: '#16a34a', textTransform: 'uppercase'
              }}>
                {profileData.role || 'USER'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 24px' }}>
              <div className="profile-info-item">
                <span className="profile-info-label">Username</span>
                <span className="profile-info-value">@{profileData.username || '—'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{profileData.email || '—'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Department</span>
                <span className="profile-info-value">{profileData.department || '—'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Employee ID</span>
                <span className="profile-info-value">{profileData.employeeId || '—'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Phone</span>
                <span className="profile-info-value">{profileData.phone || '—'}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Member Since</span>
                <span className="profile-info-value">
                  {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
            👤 Personal Info
          </button>
          <button className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
            🔒 Change Password
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'personal' && (
            <form onSubmit={handlePersonalSubmit} className="profile-form">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input type="text" name="name" value={profileData.name} onChange={handleChange}
                    className={`form-input ${errors.name ? 'error' : ''}`} />
                  {errors.name && <p className="error-message">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <input type="email" name="email" value={profileData.email} onChange={handleChange}
                    className={`form-input ${errors.email ? 'error' : ''}`} />
                  {errors.email && <p className="error-message">{errors.email}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" name="phone" value={profileData.phone} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input type="text" value={profileData.department} className="form-input" disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input type="text" value={profileData.employeeId} className="form-input" disabled />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <h3 className="section-title">Change Password</h3>
              <div className="form-grid-single">
                <div className="form-group">
                  <label className="form-label">Current Password <span className="required">*</span></label>
                  <input type="password" name="currentPassword" value={profileData.currentPassword}
                    onChange={handleChange} className={`form-input ${errors.currentPassword ? 'error' : ''}`} />
                  {errors.currentPassword && <p className="error-message">{errors.currentPassword}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">New Password <span className="required">*</span></label>
                  <input type="password" name="newPassword" value={profileData.newPassword}
                    onChange={handleChange} className={`form-input ${errors.newPassword ? 'error' : ''}`} />
                  {errors.newPassword && <p className="error-message">{errors.newPassword}</p>}
                  <p className="input-hint">At least 8 characters</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password <span className="required">*</span></label>
                  <input type="password" name="confirmPassword" value={profileData.confirmPassword}
                    onChange={handleChange} className={`form-input ${errors.confirmPassword ? 'error' : ''}`} />
                  {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
