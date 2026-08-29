import { useState, useEffect } from 'react';
import './DriverMaintenance.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

const INIT = { vehicle: '', description: '', urgency: 'Medium' };

const URGENCY_STYLE = {
  Low:    { bg: '#dcfce7', color: '#166534' },
  Medium: { bg: '#fef3c7', color: '#92400e' },
  High:   { bg: '#fee2e2', color: '#991b1b' },
  Critical: { bg: '#fee2e2', color: '#991b1b' },
};

const STATUS_STYLE = {
  pending:       { bg: '#fef3c7', color: '#92400e' },
  approved:      { bg: '#e0e7ff', color: '#3730a3' },
  rejected:      { bg: '#fee2e2', color: '#991b1b' },
  'in-progress': { bg: '#dbeafe', color: '#1e40af' },
  completed:     { bg: '#dcfce7', color: '#166534' },
};

const normalizePriority = (value) => {
  if (!value) return 'Medium';
  const v = String(value).toLowerCase();
  if (v === 'low') return 'Low';
  if (v === 'high') return 'High';
  if (v === 'critical') return 'Critical';
  return 'Medium';
};

export default function DriverMaintenance() {
  const [form, setForm] = useState(INIT);
  const [reports, setReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = () => {
    fetch(`${BASE}/maintenance/issues`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReports(data); })
      .catch(console.error);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle || !form.description) { showToast('All fields required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/maintenance/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          vehiclePlate: form.vehicle,
          issue: form.description,
          priority: form.urgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Report submitted!');
      setForm(INIT);
      fetchReports();
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="driver-maintenance-page">
      {toast && <div className={`driver-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="driver-page-header">
        <h2>Maintenance Reports</h2>
        <p>Report vehicle issues to the transport team</p>
      </div>

      <div className="driver-fuel-layout">
        <div className="driver-form-card">
          <h3>Submit Report</h3>
          <form onSubmit={handleSubmit}>
            <div className="driver-form-group">
              <label>Vehicle Plate *</label>
              <input type="text" value={form.vehicle} onChange={e => setForm(p => ({...p, vehicle: e.target.value}))} required placeholder="e.g. AA-12345" />
            </div>
            <div className="driver-form-group">
              <label>Issue Description *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} required rows={4} placeholder="Describe the issue in detail..." />
            </div>
            <div className="driver-form-group">
              <label>Urgency Level</label>
              <div className="driver-urgency-btns">
                {['Low', 'Medium', 'High'].map(u => (
                  <button
                    key={u}
                    type="button"
                    className={`driver-urgency-btn ${form.urgency === u ? 'selected' : ''}`}
                    style={form.urgency === u ? { background: URGENCY_STYLE[u].bg, color: URGENCY_STYLE[u].color, borderColor: URGENCY_STYLE[u].color } : {}}
                    onClick={() => setForm(p => ({...p, urgency: u}))}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="driver-submit-btn" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        <div className="driver-form-card">
          <h3>My Reports</h3>
          {reports.length === 0
            ? <div className="driver-empty">No reports submitted yet.</div>
            : reports.map(r => {
              const priority = normalizePriority(r.priority || r.urgency);
              const ust = URGENCY_STYLE[priority] || URGENCY_STYLE.Medium;
              const sst = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              return (
                <div key={r._id} className="driver-report-item">
                  <div className="driver-report-header">
                    <span className="driver-report-vehicle">{r.vehiclePlate || r.vehicle || 'N/A'}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ background: ust.bg, color: ust.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{priority}</span>
                      <span style={{ background: sst.bg, color: sst.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                    </div>
                  </div>
                  <p className="driver-report-desc">{r.issue}</p>
                  {r.expectedWaitHours && r.status === 'in-progress' && (
                    <p className="driver-report-desc">Estimated waiting time: {r.expectedWaitHours} hour(s)</p>
                  )}
                  {r.expectedCompletionAt && r.status === 'in-progress' && (
                    <p className="driver-report-desc">Expected completion: {new Date(r.expectedCompletionAt).toLocaleString()}</p>
                  )}
                  {r.repairActions && r.status === 'completed' && (
                    <p className="driver-report-desc">Repair actions: {r.repairActions}</p>
                  )}
                  {r.vehicleStatusAfter && (
                    <p className="driver-report-desc">Vehicle status: {r.vehicleStatusAfter}</p>
                  )}
                  <div className="driver-report-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}
