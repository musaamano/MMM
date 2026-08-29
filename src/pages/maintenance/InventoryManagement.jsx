import { useState, useEffect } from 'react';
import './maintenance.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');
const INIT  = { partName:'', category:'other', quantity:0, minLevel:5, unitCost:0, supplier:'', notes:'' };

export default function InventoryManagement() {
  const [items, setItems]   = useState([]);
  const [form, setForm]     = useState(INIT);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = () => {
    fetch(`${BASE}/maintenance/inventory`, { headers:{ Authorization:`Bearer ${token()}` } })
      .then(r=>r.json()).then(d => { if (Array.isArray(d)) setItems(d); }).catch(console.error);
  };

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const url    = editing ? `${BASE}/maintenance/inventory/${editing}` : `${BASE}/maintenance/inventory`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      showToast(editing ? 'Updated!' : 'Part added!');
      setForm(INIT); setEditing(null); setShowForm(false); fetchItems();
    } catch(err) { showToast(err.message,'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({ partName:item.partName, category:item.category, quantity:item.quantity, minLevel:item.minLevel, unitCost:item.unitCost, supplier:item.supplier||'', notes:item.notes||'' });
    setEditing(item._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this part?')) return;
    await fetch(`${BASE}/maintenance/inventory/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token()}` } });
    fetchItems();
  };

  const lowStock = items.filter(i => i.quantity <= i.minLevel);

  return (
    <div className="maint-page">
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="maint-page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><h2>Inventory Management</h2><p>Manage spare parts and supplies</p></div>
        <button className="maint-btn primary" onClick={() => { setShowForm(p=>!p); setEditing(null); setForm(INIT); }}>+ Add Part</button>
      </div>

      {lowStock.length > 0 && (
        <div style={{background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:10,padding:'12px 16px',marginBottom:20,color:'#991b1b',fontSize:14,fontWeight:600}}>
          ⚠ {lowStock.length} item(s) below minimum stock level: {lowStock.map(i=>i.partName).join(', ')}
        </div>
      )}

      {showForm && (
        <div className="maint-card">
          <h3>{editing ? 'Edit Part' : 'Add New Part'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="maint-form-row">
              <div className="maint-form-group">
                <label>Part Name *</label>
                <input type="text" value={form.partName} onChange={e=>setForm(p=>({...p,partName:e.target.value}))} required disabled={!!editing} />
              </div>
              <div className="maint-form-group">
                <label>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {['engine','brakes','tires','electrical','body','fluids','other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="maint-form-row">
              <div className="maint-form-group">
                <label>Quantity</label>
                <input type="number" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:Number(e.target.value)}))} min={0} />
              </div>
              <div className="maint-form-group">
                <label>Min Level (alert threshold)</label>
                <input type="number" value={form.minLevel} onChange={e=>setForm(p=>({...p,minLevel:Number(e.target.value)}))} min={0} />
              </div>
              <div className="maint-form-group">
                <label>Unit Cost (ETB)</label>
                <input type="number" value={form.unitCost} onChange={e=>setForm(p=>({...p,unitCost:Number(e.target.value)}))} min={0} />
              </div>
            </div>
            <div className="maint-form-group">
              <label>Supplier</label>
              <input type="text" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="maint-btn primary" disabled={saving}>{saving?'Saving...':editing?'Update':'Add Part'}</button>
              <button type="button" className="maint-btn secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="maint-table-wrap">
        <table className="maint-table">
          <thead><tr><th>Part Name</th><th>Category</th><th>Qty</th><th>Min Level</th><th>Unit Cost</th><th>Supplier</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="maint-empty">No inventory items.</td></tr>
            ) : items.map(item => (
              <tr key={item._id} style={item.quantity <= item.minLevel ? {background:'#fff5f5'} : {}}>
                <td><strong>{item.partName}</strong></td>
                <td style={{textTransform:'capitalize'}}>{item.category}</td>
                <td style={{fontWeight:700, color: item.quantity <= item.minLevel ? '#dc2626' : '#111827'}}>{item.quantity}</td>
                <td>{item.minLevel}</td>
                <td>{item.unitCost} ETB</td>
                <td>{item.supplier||'—'}</td>
                <td>
                  {item.quantity <= item.minLevel
                    ? <span className="badge High">Low Stock</span>
                    : <span className="badge completed">OK</span>
                  }
                </td>
                <td style={{display:'flex',gap:6}}>
                  <button className="maint-btn secondary" style={{padding:'4px 10px',fontSize:12}} onClick={() => handleEdit(item)}>Edit</button>
                  <button className="maint-btn danger" style={{padding:'4px 10px',fontSize:12}} onClick={() => handleDelete(item._id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
