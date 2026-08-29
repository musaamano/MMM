import { useState, useEffect } from 'react';
import './GateLogsPage.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

const STATUS_STYLE = {
  approved:     { bg: '#dcfce7', color: '#166534' },
  unauthorized: { bg: '#fee2e2', color: '#991b1b' },
  pending:      { bg: '#fef3c7', color: '#92400e' },
};

export default function GateLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchLogs(); }, [filter, date]);

  const fetchLogs = () => {
    const t = token(); if (!t) return;
    const params = new URLSearchParams();
    if (filter !== 'all') params.append('status', filter);
    if (date) params.append('date', date);
    params.append('limit', '100');

    fetch(`${BASE}/security/logs?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLogs(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="gate-logs-page">
      <div className="gate-page-header">
        <h2>Gate Logs</h2>
        <p>Vehicle entry and exit records</p>
      </div>

      <div className="gl-controls">
        <div className="gl-filters">
          {['all', 'approved', 'unauthorized', 'pending'].map(f => (
            <button key={f} className={`gl-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="gl-date-input" />
      </div>

      {loading ? (
        <div className="gate-empty">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="gate-empty">No logs found for selected filters.</div>
      ) : (
        <div className="gl-table-wrap">
          <table className="gl-table">
            <thead>
              <tr>
                <th>Plate</th><th>Driver</th><th>Vehicle</th><th>Direction</th>
                <th>Entry Time</th><th>Exit Time</th><th>Officer</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const st = STATUS_STYLE[log.status] || STATUS_STYLE.pending;
                return (
                  <tr key={log._id}>
                    <td><strong>{log.plateNumber}</strong></td>
                    <td>{log.driverName || '—'}</td>
                    <td>{log.vehicleModel || '—'}</td>
                    <td>
                      <span className={`gl-direction ${log.direction}`}>
                        {log.direction === 'entry' ? '↓ Entry' : '↑ Exit'}
                      </span>
                    </td>
                    <td>{log.entryTime ? new Date(log.entryTime).toLocaleString() : '—'}</td>
                    <td>{log.exitTime ? new Date(log.exitTime).toLocaleString() : '—'}</td>
                    <td>{log.officer || '—'}</td>
                    <td>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
