import { useState, useEffect } from 'react';
import './maintenance.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

const STATUS_FLOW = { approved:'in-progress', 'in-progress':'completed' };
const STATUS_LABEL = { approved:'Start Repair', 'in-progress':'Mark Completed' };

export default function RepairTracking() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [completeData, setCompleteData] = useState({ actualCost:'', notes:'', repairActions:'', expectedWaitHours:'', partsUsed:[] });
  const [newPart, setNewPart] = useState({ partName:'', quantity:1, cost:0 });

  useEffect(() => { fetchIssues(); }, []);

  const fetchIssues = () => {
    fetch(`${BASE}/maintenance/issues`, { headers:{ Authorization:`Bearer ${token()}` } })
      .then(r=>r.json())
      .then(d => { if (Array.isArray(d)) setIssues(d.filter(i => ['approved','in-progress','completed'].includes(i.status))); })
      .catch(console.error).finally(() => setLoading(false));
  };

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const updateStatus = async (id, newStatus) => {
    const body = { status: newStatus };
    if (newStatus === 'completed') {
      body.actualCost = completeData.actualCost;
      body.notes = completeData.notes;
      body.repairActions = completeData.repairActions;
      body.partsUsed = completeData.partsUsed;
    }
    if (newStatus === 'in-progress') {
      body.expectedWaitHours = completeData.expectedWaitHours;
      body.notes = completeData.notes;
    }
    try {
      const res = await fetch(`${BASE}/maintenance/status/${id}`, {
        method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast(newStatus === 'completed' ? 'Repair completed — vehicle set to Available!' : 'Status updated');
      setSelected(null); fetchIssues();
    } catch(err) { showToast(err.message,'error'); }
  };

  const addPart = () => {
    if (!newPart.partName) return;
    setCompleteData(p => ({ ...p, partsUsed: [...p.partsUsed, { ...newPart }] }));
    setNewPart({ partName:'', quantity:1, cost:0 });
  };

  return (
    <div className="maint-page">
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="maint-page-header"><h2>Repair Tracking</h2><p>Track and update repair progress</p></div>

      {loading ? <div className="maint-empty">Loading...</div> : issues.length === 0 ? <div className="maint-empty">No active repairs.</div> : (
        <div className="maint-table-wrap">
          <table className="maint-table">
            <thead>
              <tr><th>Vehicle</th><th>Issue</th><th>Priority</th><th>Status</th><th>Approved By</th><th>Est. Cost</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <>
                  <tr key={issue._id}>
                    <td><strong>{issue.vehiclePlate}</strong></td>
                    <td>{issue.issue.slice(0,45)}{issue.issue.length>45?'...':''}</td>
                    <td><span className={`badge ${issue.priority}`}>{issue.priority}</span></td>
                    <td><span className={`badge ${issue.status}`}>{issue.status}</span></td>
                    <td>{issue.approvedBy||'—'}</td>
                    <td>{issue.estimatedCost ? `${issue.estimatedCost} ETB` : '—'}</td>
                    <td style={{display:'flex',gap:6}}>
                      {STATUS_FLOW[issue.status] && (
                        <button className="maint-btn primary" style={{padding:'4px 10px',fontSize:12}}
                          onClick={() => { setSelected(issue._id === selected ? null : issue._id); setCompleteData({actualCost:'',notes:'',repairActions:'',expectedWaitHours:'',partsUsed:[]}); }}>
                          {STATUS_LABEL[issue.status]}
                        </button>
                      )}
                    </td>
                  </tr>
                  {selected === issue._id && STATUS_FLOW[issue.status] === 'completed' && (
                    <tr key={`complete-${issue._id}`}>
                      <td colSpan={7}>
                        <div className="issue-detail-panel">
                          <h4>Complete Repair</h4>
                          <div className="maint-form-row">
                            <div className="maint-form-group">
                              <label>Actual Cost (ETB)</label>
                              <input type="number" value={completeData.actualCost} onChange={e=>setCompleteData(p=>({...p,actualCost:e.target.value}))} />
                            </div>
                            <div className="maint-form-group">
                              <label>Notes</label>
                              <input type="text" value={completeData.notes} onChange={e=>setCompleteData(p=>({...p,notes:e.target.value}))} />
                            </div>
                          </div>
                          <div className="maint-form-group">
                            <label>Repair Actions Taken</label>
                            <input type="text" value={completeData.repairActions} onChange={e=>setCompleteData(p=>({...p,repairActions:e.target.value}))} placeholder="Describe repair actions performed" />
                          </div>
                          <h4>Parts Used</h4>
                          <div className="maint-form-row" style={{alignItems:'flex-end'}}>
                            <div className="maint-form-group">
                              <label>Part Name</label>
                              <input type="text" value={newPart.partName} onChange={e=>setNewPart(p=>({...p,partName:e.target.value}))} />
                            </div>
                            <div className="maint-form-group">
                              <label>Qty</label>
                              <input type="number" value={newPart.quantity} onChange={e=>setNewPart(p=>({...p,quantity:Number(e.target.value)}))} min={1} />
                            </div>
                            <div className="maint-form-group">
                              <label>Cost (ETB)</label>
                              <input type="number" value={newPart.cost} onChange={e=>setNewPart(p=>({...p,cost:Number(e.target.value)}))} />
                            </div>
                            <button className="maint-btn secondary" style={{marginBottom:16}} onClick={addPart}>+ Add</button>
                          </div>
                          {completeData.partsUsed.length > 0 && (
                            <ul style={{fontSize:13,color:'#374151',marginBottom:12}}>
                              {completeData.partsUsed.map((p,i) => <li key={i}>{p.partName} × {p.quantity} — {p.cost} ETB</li>)}
                            </ul>
                          )}
                          <div style={{display:'flex',gap:10}}>
                            <button className="maint-btn primary" onClick={() => updateStatus(issue._id, 'completed')}>✅ Mark Completed</button>
                            <button className="maint-btn secondary" onClick={() => setSelected(null)}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {selected === issue._id && STATUS_FLOW[issue.status] === 'in-progress' && (
                    <tr key={`start-${issue._id}`}>
                      <td colSpan={7}>
                        <div className="issue-detail-panel">
                          <div className="maint-form-row">
                            <div className="maint-form-group">
                              <label>Expected Waiting Time (hours)</label>
                              <input type="number" min="1" value={completeData.expectedWaitHours} onChange={e=>setCompleteData(p=>({...p,expectedWaitHours:e.target.value}))} />
                            </div>
                            <div className="maint-form-group">
                              <label>Timeline Note</label>
                              <input type="text" value={completeData.notes} onChange={e=>setCompleteData(p=>({...p,notes:e.target.value}))} placeholder="e.g. Parts arriving this afternoon" />
                            </div>
                          </div>
                          <button className="maint-btn primary" onClick={() => updateStatus(issue._id, 'in-progress')}>🔧 Start Repair</button>
                          <button className="maint-btn secondary" style={{marginLeft:10}} onClick={() => setSelected(null)}>Cancel</button>
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
