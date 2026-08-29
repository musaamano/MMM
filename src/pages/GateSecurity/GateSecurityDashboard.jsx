import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Car, AlertTriangle, FileWarning, Clock, List } from 'lucide-react';
import './GateSecurityDashboard.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function GateSecurityDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ todayCheckins: 0, unauthorized: 0, activeInside: 0, openIncidents: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = token(); if (!t) return;
    Promise.all([
      fetch(`${BASE}/security/stats`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${BASE}/security/logs?limit=5`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([s, logs]) => {
      if (s && !s.message) setStats(s);
      if (Array.isArray(logs)) setRecentLogs(logs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Checked In Today', value: stats.todayCheckins, icon: <Car size={22} color="#16a34a" />, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Unauthorized Attempts', value: stats.unauthorized, icon: <AlertTriangle size={22} color="#dc2626" />, color: '#dc2626', bg: '#fee2e2' },
    { label: 'Active Inside Campus', value: stats.activeInside, icon: <ShieldCheck size={22} color="#3b82f6" />, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Open Incidents', value: stats.openIncidents, icon: <FileWarning size={22} color="#f59e0b" />, color: '#f59e0b', bg: '#fef3c7' },
  ];

  const STATUS_STYLE = {
    approved:     { bg: '#dcfce7', color: '#166534' },
    unauthorized: { bg: '#fee2e2', color: '#991b1b' },
    pending:      { bg: '#fef3c7', color: '#92400e' },
  };

  if (loading) return <div className="gate-loading">Loading dashboard...</div>;

  return (
    <div className="gate-dashboard">
      <div className="gate-page-header">
        <h2>Dashboard</h2>
        <p>Security Gate operational overview</p>
      </div>

      {/* Stat Cards */}
      <div className="gate-stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="gate-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="gate-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="gate-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="gate-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="gate-quick-actions">
        <button className="gate-action-btn primary" onClick={() => navigate('/gate/verify')}>
          <ShieldCheck size={18} /> Verify Vehicle
        </button>
        <button className="gate-action-btn secondary" onClick={() => navigate('/gate/logs')}>
          <List size={18} /> View Logs
        </button>
        <button className="gate-action-btn secondary" onClick={() => navigate('/gate/incidents')}>
          <FileWarning size={18} /> Report Incident
        </button>
        <button className="gate-action-btn danger" onClick={() => navigate('/gate/alerts')}>
          <AlertTriangle size={18} /> View Alerts
        </button>
      </div>

      {/* Recent Activity */}
      <div className="gate-recent-card">
        <div className="gate-recent-header">
          <span>Recent Gate Activity</span>
          <button onClick={() => navigate('/gate/logs')}>View All →</button>
        </div>
        {recentLogs.length === 0 ? (
          <div className="gate-empty">No activity recorded today.</div>
        ) : recentLogs.map(log => {
          const st = STATUS_STYLE[log.status] || STATUS_STYLE.pending;
          return (
            <div key={log._id} className="gate-recent-item">
              <div className="gate-recent-left">
                <span className="gate-recent-plate">{log.plateNumber}</span>
                <span className="gate-recent-driver">{log.driverName || '—'} · {log.direction}</span>
              </div>
              <div className="gate-recent-right">
                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {log.status}
                </span>
                <span className="gate-recent-time">
                  <Clock size={12} /> {new Date(log.entryTime).toLocaleTimeString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
