import { useState, useEffect } from 'react';
import './GateSecurityProfile.css';

const GateSecurityProfile = () => {
    const [profileData, setProfileData] = useState({
        fullName: 'Ahmed Hassan',
        employeeId: 'GS-2024-001',
        role: 'Gate Security Officer',
        gateLocation: 'Main Gate',
        phoneNumber: '+251-911-234567',
        email: 'ahmed.hassan@university.edu.et',
        profilePhoto: null,
        shiftStart: '06:00',
        shiftEnd: '14:00',
        joinDate: '2024-01-15',
        totalVehiclesProcessed: 1247,
        monthlyVehiclesProcessed: 156,
        lastLogin: '2026-03-09 08:30:00'
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...profileData });

    // Load saved profile photo on component mount
    useEffect(() => {
        const savedProfilePhoto = localStorage.getItem('gateSecurityProfilePhoto');
        if (savedProfilePhoto) {
            setProfileData(prev => ({
                ...prev,
                profilePhoto: savedProfilePhoto
            }));
            setEditData(prev => ({
                ...prev,
                profilePhoto: savedProfilePhoto
            }));
        } else {
            // Set a default profile photo for demonstration
            const defaultPhoto = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiM0YTkwZTIiLz4KPHN2ZyB4PSIyNSIgeT0iMjAiIHdpZHRoPSI1MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzEzLjEgMiAxNCAyLjkgMTQgNEMxNCA1LjEgMTMuMSA2IDEyIDZDMTAuOSA2IDEwIDUuMSAxMCA0QzEwIDIuOSAxMC45IDIgMTIgMlpNMjEgOVYyMkgzVjlDMyA4IDQgNyA1IDdIMTlDMjAgNyAyMSA4IDIxIDlaIi8+Cjwvc3ZnPgo8L3N2Zz4K';
            setProfileData(prev => ({
                ...prev,
                profilePhoto: defaultPhoto
            }));
            setEditData(prev => ({
                ...prev,
                profilePhoto: defaultPhoto
            }));
            localStorage.setItem('gateSecurityProfilePhoto', defaultPhoto);

            // Notify the header about the default photo
            window.dispatchEvent(new CustomEvent('profilePhotoUpdated', {
                detail: { profilePhoto: defaultPhoto }
            }));
            window.dispatchEvent(new CustomEvent('gateProfilePhotoUpdated', {
                detail: { profilePhoto: defaultPhoto }
            }));
        }
    }, []);

    const handleEdit = () => {
        setIsEditing(true);
        setEditData({ ...profileData });
    };

    const handleSave = () => {
        setProfileData({ ...editData });

        // Save profile photo to localStorage
        if (editData.profilePhoto) {
            localStorage.setItem('gateSecurityProfilePhoto', editData.profilePhoto);

            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('profilePhotoUpdated', {
                detail: { profilePhoto: editData.profilePhoto }
            }));
            window.dispatchEvent(new CustomEvent('gateProfilePhotoUpdated', {
                detail: { profilePhoto: editData.profilePhoto }
            }));
        }

        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData({ ...profileData });
        setIsEditing(false);
    };

    const handleInputChange = (field, value) => {
        setEditData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setEditData(prev => ({
                    ...prev,
                    profilePhoto: e.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="gate-profile-container">
            <div className="gate-profile-header">
                <div className="gate-profile-title">
                    <h2>🚧 Gate Security Profile</h2>
                    <p>Security Officer Information & Account Management</p>
                </div>
                {!isEditing ? (
                    <button className="gate-btn-edit" onClick={handleEdit}>
                        <span>✏️</span> Edit Profile
                    </button>
                ) : (
                    <div className="gate-edit-actions">
                        <button className="gate-btn-save" onClick={handleSave}>
                            <span>💾</span> Save
                        </button>
                        <button className="gate-btn-cancel" onClick={handleCancel}>
                            <span>❌</span> Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="gate-profile-content">
                {/* Profile Photo Section */}
                <div className="gate-profile-photo-section">
                    <div className="gate-profile-photo">
                        {profileData.profilePhoto ? (
                            <img src={profileData.profilePhoto} alt="Profile" />
                        ) : (
                            <div className="gate-profile-photo-placeholder">
                                <span>👤</span>
                            </div>
                        )}
                    </div>
                    {isEditing && (
                        <div className="gate-photo-upload">
                            <input
                                type="file"
                                id="photoUpload"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="photoUpload" className="gate-upload-btn">
                                📷 Upload Photo
                            </label>
                        </div>
                    )}
                </div>

                {/* Profile Information Grid */}
                <div className="gate-profile-grid">
                    {/* Basic Information */}
                    <div className="gate-profile-section">
                        <h3>👤 Basic Information</h3>
                        <div className="gate-profile-fields">
                            <div className="gate-field-group">
                                <label>Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.fullName}
                                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                                        className="gate-input"
                                    />
                                ) : (
                                    <span className="gate-field-value">{profileData.fullName}</span>
                                )}
                            </div>

                            <div className="gate-field-group">
                                <label>Employee ID</label>
                                <span className="gate-field-value gate-employee-id">{profileData.employeeId}</span>
                            </div>

                            <div className="gate-field-group">
                                <label>Role</label>
                                <span className="gate-field-value gate-role">{profileData.role}</span>
                            </div>

                            <div className="gate-field-group">
                                <label>Gate Location</label>
                                {isEditing ? (
                                    <select
                                        value={editData.gateLocation}
                                        onChange={(e) => handleInputChange('gateLocation', e.target.value)}
                                        className="gate-select"
                                    >
                                        <option value="Main Gate">Main Gate</option>
                                        <option value="Back Gate">Back Gate</option>
                                        <option value="Side Gate">Side Gate</option>
                                        <option value="Emergency Gate">Emergency Gate</option>
                                    </select>
                                ) : (
                                    <span className="gate-field-value gate-location">🚪 {profileData.gateLocation}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="gate-profile-section">
                        <h3>📞 Contact Information</h3>
                        <div className="gate-profile-fields">
                            <div className="gate-field-group">
                                <label>Phone Number</label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={editData.phoneNumber}
                                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                        className="gate-input"
                                    />
                                ) : (
                                    <span className="gate-field-value">📱 {profileData.phoneNumber}</span>
                                )}
                            </div>

                            <div className="gate-field-group">
                                <label>Email (Optional)</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className="gate-input"
                                    />
                                ) : (
                                    <span className="gate-field-value">📧 {profileData.email}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Work Information */}
                    <div className="gate-profile-section">
                        <h3>⏰ Work Information</h3>
                        <div className="gate-profile-fields">
                            <div className="gate-field-group">
                                <label>Shift Start</label>
                                {isEditing ? (
                                    <input
                                        type="time"
                                        value={editData.shiftStart}
                                        onChange={(e) => handleInputChange('shiftStart', e.target.value)}
                                        className="gate-input"
                                    />
                                ) : (
                                    <span className="gate-field-value">🌅 {profileData.shiftStart}</span>
                                )}
                            </div>

                            <div className="gate-field-group">
                                <label>Shift End</label>
                                {isEditing ? (
                                    <input
                                        type="time"
                                        value={editData.shiftEnd}
                                        onChange={(e) => handleInputChange('shiftEnd', e.target.value)}
                                        className="gate-input"
                                    />
                                ) : (
                                    <span className="gate-field-value">🌇 {profileData.shiftEnd}</span>
                                )}
                            </div>

                            <div className="gate-field-group">
                                <label>Join Date</label>
                                <span className="gate-field-value">📅 {new Date(profileData.joinDate).toLocaleDateString()}</span>
                            </div>

                            <div className="gate-field-group">
                                <label>Last Login</label>
                                <span className="gate-field-value">🕐 {profileData.lastLogin}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Statistics */}
                    <div className="gate-profile-section">
                        <h3>📊 Performance Statistics</h3>
                        <div className="gate-stats-cards">
                            <div className="gate-stat-mini-card">
                                <div className="gate-stat-mini-icon">🚗</div>
                                <div className="gate-stat-mini-value">{profileData.totalVehiclesProcessed}</div>
                                <div className="gate-stat-mini-label">Total Vehicles Processed</div>
                            </div>

                            <div className="gate-stat-mini-card">
                                <div className="gate-stat-mini-icon">📈</div>
                                <div className="gate-stat-mini-value">{profileData.monthlyVehiclesProcessed}</div>
                                <div className="gate-stat-mini-label">This Month</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Why This Information is Needed */}
                <div className="gate-profile-info-section">
                    <h3>ℹ️ Why This Information is Needed</h3>
                    <div className="gate-info-cards">
                        <div className="gate-info-card">
                            <div className="gate-info-icon">🔍</div>
                            <div className="gate-info-content">
                                <h4>Accountability & Tracking</h4>
                                <p>To know which security officer recorded vehicle entry/exit and provide complete audit trail</p>
                            </div>
                        </div>

                        <div className="gate-info-card">
                            <div className="gate-info-icon">🔐</div>
                            <div className="gate-info-content">
                                <h4>Security & Authentication</h4>
                                <p>To allow secure login authentication and ensure only authorized personnel access the system</p>
                            </div>
                        </div>

                        <div className="gate-info-card">
                            <div className="gate-info-icon">📋</div>
                            <div className="gate-info-content">
                                <h4>Operational Management</h4>
                                <p>To manage shift schedules, gate assignments, and monitor security officer performance</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GateSecurityProfile;