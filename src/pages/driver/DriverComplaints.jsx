import { useState, useEffect } from 'react';
import { getCurrentUser } from '../../api/api';
import './DriverComplaints.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');

const INIT = { category: 'Safety', description: '', priority: 'Medium', vehicle: '', tripId: '' };

const STATUS_STYLE = {
  Pending:     { bg: '#fef3c7', color: '#92400e' },
  'In Progress': { bg: '#dbeafe', color: '#1e40af' },
  Resolved:    { bg: '#dcfce7', color: '#166534' },
};

const PRIORITY_STYLE = {
  Low:      { bg: '#f1f5f9', color: '#475569' },
  Medium:   { bg: '#fef3c7', color: '#92400e' },
  High:     { bg: '#fee2e2', color: '#991b1b' },
  Critical: { bg: '#fce7f3', color: '#9d174d' },
};

export default function DriverComplaints() {
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(INIT);
  const [complaints, setComplaints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('submit');

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = () => {
    fetch(`${BASE}/complaints`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComplaints(data.filter(c => c.senderUsername === currentUser?.username));
        }
      })
      .catch(console.error);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { showToast('Description is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...form,
          sender: currentUser?.name || 'Driver',
          senderUsername: currentUser?.username,
          role: 'Driver',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Complaint submitted successfully!');
      setForm(INIT);
      fetchComplaints();
      setTab('history');
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="driver-complaints-page">
      {toast && <div className={`driver-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="driver-page-header">
        <h2>Complaints</h2>
        <p>Submit and track your complaints</p>
      </div>

      <div className="dc-tabs">
        <button className={`dc-tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Submit Complaint</button>
        <button className={`dc-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          My Complaints {complaints.length > 0 && <span className="dc-count">{complaints.length}</span>}
        </button>
      </div>

      {tab === 'submit' && (
        <div className="driver-form-card">
          <h3>New Complaint</h3>
          <form onSubmit={handleSubmit}>
            <div className="dp-form-row">
              <div className="driver-form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="Safety">Safety</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Service">Service</option>
                  <option value="Resource">Resource</option>
                </select>
              </div>
              <div className="driver-form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="dp-form-row">
              <div className="driver-form-group">
                <label>Vehicle (optional)</label>
                <input type="text" value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} placeholder="e.g. AA-12345" />
              </div>
              <div className="driver-form-group">
                <label>Trip ID (optional)</label>
                <input type="text" value={form.tripId} onChange={e => setForm(p => ({ ...p, tripId: e.target.value }))} placeholder="Trip reference" />
              </div>
            </div>
            <div className="driver-form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required rows={5} placeholder="Describe your complaint in detail..." />
            </div>
            <button type="submit" className="driver-submit-btn" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {complaints.length === 0 ? (
            <div className="driver-empty">No complaints submitted yet.</div>
          ) : (
            complaints.map(c => {
              const ss = STATUS_STYLE[c.status] || STATUS_STYLE.Pending;
              const ps = PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.Medium;
              return (
                <div key={c._id} className="dc-complaint-card">
                  <div className="dc-complaint-header">
                    <div>
                      <span className="dc-category">{c.category}</span>
                      <span className="dc-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ background: ps.bg, color: ps.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{c.priority}</span>
                      <span style={{ background: ss.bg, color: ss.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{c.status}</span>
                    </div>
                  </div>
                  <p className="dc-description">{c.description}</p>
                  {c.resolutionNotes && (
                    <div className="dc-resolution">
                      <strong>Resolution:</strong> {c.resolutionNotes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
