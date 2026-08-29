import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './adminTheme.css';
import './addUser.css';
import { isValidEmail, isValidPhone, isStrongPassword } from '../../utils/validation';
import API_BASE_URL from '../../config.js';

const ROLES = [
  { label: 'User',                  value: 'USER' },
  { label: 'Driver',                value: 'DRIVER' },
  { label: 'Transport Officer',     value: 'TRANSPORT' },
  { label: 'Fuel Station Officer',  value: 'FUEL_OFFICER' },
  { label: 'Gate Security Officer', value: 'GATE_OFFICER' },
  { label: 'Admin',                 value: 'ADMIN' },
];

const EMPTY = {
  name: '', username: '', email: '', password: '',
  confirmPassword: '', role: '', department: '', phone: '', employeeId: '',
};

export default function AddUser() {
  const navigate = useNavigate();
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const set = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!form.name.trim())        { setError('Full name is required.');         return; }
    if (!form.username.trim())    { setError('Username is required.');           return; }
    if (!isValidEmail(form.email)) { setError('Please enter a valid email address.'); return; }
    if (!form.role)               { setError('Please select a role.');           return; }
    if (!isStrongPassword(form.password)) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.phone && !isValidPhone(form.phone)) { setError('Please enter a valid phone number.'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name:       form.name.trim(),
          username:   form.username.trim(),
          email:      form.email.trim(),
          password:   form.password,
          role:       form.role,
          department: form.department.trim(),
          phone:      form.phone.trim(),
          employeeId: form.employeeId.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create user.');
        return;
      }

      setSuccess(`User "${data.user?.username || form.username}" created successfully! Redirecting in 3s...`);
      setForm(EMPTY);
      setTimeout(() => navigate('/admin/manage-users'), 3000);
    } catch (err) {
      setError('Cannot connect to server. Make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-container">
      <h1>Add New User</h1>

      <div className="form-card">
        {/* Error banner */}
        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: 10, marginBottom: 20,
            background: '#fef2f2', color: '#dc2626',
            border: '2px solid #fecaca', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div style={{
            padding: '14px 18px', borderRadius: 10, marginBottom: 20,
            background: '#f0fdf4', color: '#15803d',
            border: '2px solid #86efac', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <span>✅ {success}</span>
            <button onClick={() => navigate('/admin/manage-users')}
              style={{ background: '#16a34a', color: '#fff', border: 'none',
                borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
              View Users →
            </button>
          </div>
        )}

        <div>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" name="name" value={form.name} onChange={set}
                placeholder="e.g. Abebe Kebede" />
            </div>
            <div className="form-group">
              <label>Username <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" name="username" value={form.username} onChange={set}
                placeholder="e.g. abebe.kebede" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="email" name="email" value={form.email} onChange={set}
                placeholder="abebe@haramaya.edu.et" />
            </div>
            <div className="form-group">
              <label>Role <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="role" value={form.role} onChange={set}>
                <option value="">Select Role</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password <span style={{ color: '#ef4444' }}>*</span></label>
              <input type={showPw ? 'text' : 'password'} name="password"
                value={form.password} onChange={set} placeholder="Min 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
              <input type={showPw ? 'text' : 'password'} name="confirmPassword"
                value={form.confirmPassword} onChange={set} placeholder="Repeat password" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            color: '#6b7280', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
            Show passwords
          </label>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input type="text" name="department" value={form.department} onChange={set}
                placeholder="e.g. Computer Science" />
            </div>
            <div className="form-group">
              <label>Employee / Student ID</label>
              <input type="text" name="employeeId" value={form.employeeId} onChange={set}
                placeholder="e.g. EMP-0042" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input type="text" name="phone" value={form.phone} onChange={set}
                placeholder="+251 9XX XXX XXX" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={handleSubmit} className="btn-submit" disabled={loading}>
              {loading ? '⏳ Saving...' : '💾 Save User'}
            </button>
            <button type="button" className="btn-submit" style={{ background: '#6b7280' }}
              onClick={() => { setForm(EMPTY); setError(''); setSuccess(''); }}>
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
