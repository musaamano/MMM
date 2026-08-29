import { useState, useEffect } from 'react';
import './maintenance.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

export default function IssueList() {
  const [issues, setIssues]   = useState([]);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionData, setActionData] = useState({ estimatedCost:'', notes:'', rejectionReason:'' });

  useEffect(() => { fetchIssues(); }, [filter]);

  const fetchIssues = () => {
    const t = token();
    const params = filter !== 'all' ? `?status=${filter}` : '';
    fetch(`${BASE}/maintenance/issues${params}`, { headers:{ Authorization:`Bearer ${t}` } })
      .then(r=>r.json()).then(d => { if (Array.isArray(d)) setIssues(d); })
      .catch(console.error).finally(() => setLoading(false));
  };

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${BASE}/maintenance/approve/${id}`, {
        method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ estimatedCost: actionData.estimatedCost, notes: actionData.notes }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast('Issue approved — vehicle set to Under Maintenance');
      setSelected(null); fetchIssues();
    } catch(err) { showToast(err.message,'error'); }
  };

  const handleReject = async (id) => {
    if (!actionData.rejectionReason) { showToast('Rejection reason required','error'); return; }
    try {
      const res = await fetch(`${BASE}/maintenance/reject/${id}`, {
        method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ rejectionReason: actionData.rejectionReason }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast('Issue rejected'); setSelected(null); fetchIssues();
    } catch(err) { showToast(err.message,'error'); }
  };

  const filters = ['all','pending','approved','rejected','in-progress','completed'];

  return (
    <div className="maint-page">
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="maint-page-header"><h2>Maintenance Issues</h2><p>Review and manage reported vehicle issues</p></div>

      <div className="maint-filter-bar">
        {filters.map(f => (
          <button key={f} className={`maint-filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
            {f==='all'?'All':f.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? <div className="maint-empty">Loading...</div> : issues.length === 0 ? <div className="maint-empty">No issues found.</div> : (
        <div className="maint-table-wrap">
          <table className="maint-table">
            <thead>
              <tr><th>Vehicle</th><th>Issue</th><th>Priority</th><th>Status</th><th>Reporter</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <>
                  <tr key={issue._id}>
                    <td><strong>{issue.vehiclePlate}</strong></td>
                    <td>
                      {issue.autoFlagged && <span style={{color:'#dc2626',marginRight:6}}>⚠</span>}
                      {issue.issue.slice(0,50)}{issue.issue.length>50?'...':''}
                    </td>
                    <td><span className={`badge ${issue.priority}`}>{issue.priority}</span></td>
                    <td><span className={`badge ${issue.status}`}>{issue.status}</span></td>
                    <td>{issue.reporterName||'—'}</td>
                    <td>{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="maint-btn secondary" style={{padding:'4px 10px',fontSize:12}}
                        onClick={() => setSelected(selected===issue._id?null:issue._id)}>
                        {selected===issue._id?'Close':'Details'}
                      </button>
                    </td>
                  </tr>
                  {selected === issue._id && (
                    <tr key={`detail-${issue._id}`}>
                      <td colSpan={7}>
                        <div className="issue-detail-panel">
                          <p><strong>Full Issue:</strong> {issue.issue}</p>
                          {issue.notes && <p><strong>Notes:</strong> {issue.notes}</p>}
                          {issue.rejectionReason && <p style={{color:'#dc2626'}}><strong>Rejection Reason:</strong> {issue.rejectionReason}</p>}
                          {issue.estimatedCost && <p><strong>Estimated Cost:</strong> {issue.estimatedCost} ETB</p>}
                          {issue.actualCost && <p><strong>Actual Cost:</strong> {issue.actualCost} ETB</p>}

                          {issue.status === 'pending' && (
                            <div className="issue-action-form">
                              <div className="maint-form-row">
                                <div className="maint-form-group">
                                  <label>Estimated Cost (ETB)</label>
                                  <input type="number" value={actionData.estimatedCost} onChange={e=>setActionData(p=>({...p,estimatedCost:e.target.value}))} placeholder="Optional" />
                                </div>
                                <div className="maint-form-group">
                                  <label>Notes</label>
                                  <input type="text" value={actionData.notes} onChange={e=>setActionData(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" />
                                </div>
                              </div>
                              <div className="maint-form-group">
                                <label>Rejection Reason (if rejecting)</label>
                                <input type="text" value={actionData.rejectionReason} onChange={e=>setActionData(p=>({...p,rejectionReason:e.target.value}))} placeholder="Required if rejecting" />
                              </div>
                              <div style={{display:'flex',gap:10}}>
                                <button className="maint-btn primary" onClick={() => handleApprove(issue._id)}>✅ Approve</button>
                                <button className="maint-btn danger" onClick={() => handleReject(issue._id)}>❌ Reject</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
