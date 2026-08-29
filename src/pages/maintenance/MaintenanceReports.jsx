import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import './maintenance.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function MaintenanceReports() {
  const [summary, setSummary] = useState(null);
  const [stats, setStats]     = useState(null);
  const [issues, setIssues]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    const t = token();
    Promise.all([
      fetch(`${BASE}/maintenance/report-summary`, { headers:{ Authorization:`Bearer ${t}` } }).then(r=>r.json()),
      fetch(`${BASE}/maintenance/stats`,           { headers:{ Authorization:`Bearer ${t}` } }).then(r=>r.json()),
      fetch(`${BASE}/maintenance/issues`,          { headers:{ Authorization:`Bearer ${t}` } }).then(r=>r.json()),
    ]).then(([s, st, iss]) => {
      setSummary(s); setStats(st);
      if (Array.isArray(iss)) setIssues(iss);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const sendToAdmin = async (reportType, data) => {
    setSending(true);
    try {
      const res = await fetch(`${BASE}/maintenance/send-to-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reportType, data }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      showToast(`✅ ${d.message}`);
    } catch (err) {
      showToast(err.message || 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  const sendFullReport = () => {
    const data = issues.map(i => ({
      Vehicle:     i.vehiclePlate,
      Issue:       i.issue,
      Priority:    i.priority,
      Status:      i.status,
      Reporter:    i.reporterName || '—',
      'Est. Cost': i.estimatedCost || 0,
      'Act. Cost': i.actualCost || 0,
      Date:        new Date(i.createdAt).toLocaleDateString(),
    }));
    sendToAdmin('Maintenance Full Report', data);
  };

  const sendCostReport = () => {
    if (!summary?.costByVehicle) return;
    const data = Object.entries(summary.costByVehicle).map(([plate, cost]) => ({
      Vehicle: plate, 'Total Cost (ETB)': cost,
    }));
    sendToAdmin('Maintenance Cost Report', data);
  };

  if (loading) return <div className="maint-empty">Loading reports...</div>;

  return (
    <div className="maint-page">
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="maint-page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div><h2>Maintenance Reports</h2><p>Cost analysis, frequent issues, and vehicle condition</p></div>
        <button className="maint-btn primary" onClick={sendFullReport} disabled={sending} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Send size={16} /> {sending ? 'Sending...' : 'Send Full Report to Admin'}
        </button>
      </div>

      {stats && (
        <div className="maint-stats-grid">
          {[
            ['Total Issues',    stats.total,     '#3b82f6'],
            ['Completed',       stats.completed, '#16a34a'],
            ['Total Cost (ETB)',stats.totalCost?.toLocaleString(), '#8b5cf6'],
            ['Flagged Issues',  stats.flagged,   '#dc2626'],
          ].map(([l,v,c]) => (
            <div key={l} className="maint-stat-card" style={{borderTop:`3px solid ${c}`}}>
              <div><div className="maint-stat-value" style={{color:c}}>{v}</div><div className="maint-stat-label">{l}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Cost by Vehicle */}
      {summary?.costByVehicle && Object.keys(summary.costByVehicle).length > 0 && (
        <div className="maint-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, borderBottom:'none', paddingBottom:0 }}>💰 Maintenance Cost by Vehicle</h3>
            <button className="maint-btn secondary" onClick={sendCostReport} disabled={sending} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <Send size={14} /> Send to Admin
            </button>
          </div>
          <div className="maint-table-wrap">
            <table className="maint-table">
              <thead><tr><th>Vehicle Plate</th><th>Total Cost (ETB)</th></tr></thead>
              <tbody>
                {Object.entries(summary.costByVehicle)
                  .sort(([,a],[,b]) => b-a)
                  .map(([plate, cost]) => (
                    <tr key={plate}>
                      <td><strong>{plate}</strong></td>
                      <td style={{fontWeight:700, color:'#16a34a'}}>{cost.toLocaleString()} ETB</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeated Issue Vehicles */}
      {summary?.repeatedIssueVehicles?.length > 0 && (
        <div className="maint-card">
          <h3>⚠ Vehicles with Repeated Issues (3+)</h3>
          <div className="maint-table-wrap">
            <table className="maint-table">
              <thead><tr><th>Vehicle Plate</th><th>Issue Count</th><th>Risk Level</th></tr></thead>
              <tbody>
                {summary.repeatedIssueVehicles.map(v => (
                  <tr key={v.plate}>
                    <td><strong>{v.plate}</strong></td>
                    <td style={{fontWeight:700}}>{v.count}</td>
                    <td>
                      <span className={`badge ${v.count >= 5 ? 'Critical' : v.count >= 3 ? 'High' : 'Medium'}`}>
                        {v.count >= 5 ? 'Critical' : v.count >= 3 ? 'High Risk' : 'Monitor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Frequent Issues */}
      {summary?.issueCounts && Object.keys(summary.issueCounts).length > 0 && (
        <div className="maint-card">
          <h3>🔁 Most Frequent Issues</h3>
          <div className="maint-table-wrap">
            <table className="maint-table">
              <thead><tr><th>Issue Description</th><th>Occurrences</th></tr></thead>
              <tbody>
                {Object.entries(summary.issueCounts)
                  .sort(([,a],[,b]) => b-a).slice(0,10)
                  .map(([issue, count]) => (
                    <tr key={issue}>
                      <td>{issue}</td>
                      <td style={{fontWeight:700}}>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
