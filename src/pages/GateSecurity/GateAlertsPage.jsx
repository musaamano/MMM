import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './GateAlertsPage.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');

export default function GateAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`${BASE}/security/logs?status=unauthorized&limit=50`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAlerts(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="gate-alerts-page">
      <div className="gate-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h2>Security Alerts</h2><p>Unauthorized vehicle attempts and security warnings</p></div>
        <button className="ga-refresh-btn" onClick={fetchAlerts}><RefreshCw size={16} /> Refresh</button>
      </div>

      {loading ? (
        <div className="gate-empty">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="ga-no-alerts">
          <AlertTriangle size={48} color="#d1d5db" />
          <p>No unauthorized attempts detected</p>
          <small>All vehicles are authorized</small>
        </div>
      ) : (
        <div className="ga-alerts-list">
          {alerts.map(a => (
            <div key={a._id} className="ga-alert-card">
              <div className="ga-alert-icon"><AlertTriangle size={22} color="#dc2626" /></div>
              <div className="ga-alert-body">
                <div className="ga-alert-title">Unauthorized Entry Attempt</div>
                <div className="ga-alert-plate">{a.plateNumber}</div>
                <div className="ga-alert-meta">
                  {a.driverName && <span>Driver: {a.driverName}</span>}
                  <span>Officer: {a.officer || '—'}</span>
                  <span>{new Date(a.entryTime).toLocaleString()}</span>
                </div>
                {a.remarks && <div className="ga-alert-remarks">{a.remarks}</div>}
              </div>
              <span className="ga-alert-badge">UNAUTHORIZED</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
