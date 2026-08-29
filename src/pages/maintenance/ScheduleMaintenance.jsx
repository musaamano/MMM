import { useState, useEffect } from 'react';
import './maintenance.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

const INIT = { vehiclePlate:'', type:'routine', description:'', scheduledDate:'', mileageTrigger:'', notes:'' };

export default function ScheduleMaintenance() {
  const [schedules, setSchedules] = useState([]);
  const [form, setForm]   = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = () => {
    fetch(`${BASE}/maintenance/schedule`, { headers:{ Authorization:`Bearer ${token()}` } })
      .then(r=>r.json()).then(d => { if (Array.isArray(d)) setSchedules(d); }).catch(console.error);
  };

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/maintenance/schedule`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast('Maintenance scheduled!');
      setForm(INIT); setShowForm(false); fetchSchedules();
    } catch(err) { showToast(err.message,'error'); }
    finally { setSaving(false); }
  };

  const markComplete = async (id) => {
    await fetch(`${BASE}/maintenance/schedule/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
      body: JSON.stringify({ status:'completed', completedAt: new Date() }),
    });
    fetchSchedules();
  };

  return (
    <div className="maint-page">
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="maint-page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h2>Schedule Maintenance</h2><p>Plan preventive maintenance for vehicles</p></div>
        <button className="maint-btn primary" onClick={() => setShowForm(p=>!p)}>+ New Schedule</button>
      </div>

      {showForm && (
        <div className="maint-card">
          <h3>New Maintenance Schedule</h3>
          <form onSubmit={handleSubmit}>
            <div className="maint-form-row">
              <div className="maint-form-group">
                <label>Vehicle Plate *</label>
                <input type="text" value={form.vehiclePlate} onChange={e=>setForm(p=>({...p,vehiclePlate:e.target.value.toUpperCase()}))} required />
              </div>
              <div className="maint-form-group">
                <label>Type</label>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  <option value="routine">Routine</option>
                  <option value="oil-change">Oil Change</option>
                  <option value="tire">Tire Service</option>
                  <option value="inspection">Inspection</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="maint-form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} required rows={2} />
            </div>
            <div className="maint-form-row">
              <div className="maint-form-group">
                <label>Scheduled Date *</label>
                <input type="date" value={form.scheduledDate} onChange={e=>setForm(p=>({...p,scheduledDate:e.target.value}))} required />
              </div>
              <div className="maint-form-group">
                <label>Mileage Trigger (km)</label>
                <input type="number" value={form.mileageTrigger} onChange={e=>setForm(p=>({...p,mileageTrigger:e.target.value}))} placeholder="Optional" />
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="maint-btn primary" disabled={saving}>{saving?'Saving...':'Save Schedule'}</button>
              <button type="button" className="maint-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="maint-table-wrap">
        <table className="maint-table">
          <thead><tr><th>Vehicle</th><th>Type</th><th>Description</th><th>Scheduled Date</th><th>Mileage</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr><td colSpan={7} className="maint-empty">No schedules yet.</td></tr>
            ) : schedules.map(s => (
              <tr key={s._id}>
                <td><strong>{s.vehiclePlate}</strong></td>
                <td style={{textTransform:'capitalize'}}>{s.type}</td>
                <td>{s.description}</td>
                <td>{new Date(s.scheduledDate).toLocaleDateString()}</td>
                <td>{s.mileageTrigger ? `${s.mileageTrigger} km` : '—'}</td>
                <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                <td>
                  {s.status !== 'completed' && s.status !== 'cancelled' && (
                    <button className="maint-btn primary" style={{padding:'4px 10px',fontSize:12}} onClick={() => markComplete(s._id)}>
                      ✅ Done
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
