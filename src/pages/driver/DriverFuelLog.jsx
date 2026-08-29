import { useState, useEffect, useRef } from 'react';
import './DriverFuelLog.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

const INIT = { vehicle: '', fuelAmount: '', cost: '', odometer: '', date: new Date().toISOString().slice(0, 10), notes: '', receiptImage: null };

export default function DriverFuelLog() {
  const [form, setForm] = useState(INIT);
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    fetch(`${BASE}/driver/fuel`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLogs(data); })
      .catch(console.error);
  };

  const handleReceiptImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX) { height = height * MAX / width; width = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setForm(p => ({ ...p, receiptImage: base64 }));
      setPreviewImg(base64);
    };
    img.src = url;
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/driver/fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Fuel log saved!');
      setForm(INIT);
      setPreviewImg(null);
      fetchLogs();
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalFuel = logs.reduce((s, l) => s + (l.fuelAmount || 0), 0);
  const totalCost  = logs.reduce((s, l) => s + (l.cost || 0), 0);

  return (
    <div className="driver-fuel-page">
      {toast && <div className={`driver-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="driver-page-header">
        <h2>Fuel Log</h2>
        <p>Track fuel consumption and costs</p>
      </div>

      <div className="driver-fuel-layout">
        {/* Form */}
        <div className="driver-form-card">
          <h3>Add Fuel Entry</h3>
          <form onSubmit={handleSubmit}>
            <div className="driver-form-group">
              <label>Vehicle Plate *</label>
              <input type="text" name="vehicle" value={form.vehicle} onChange={e => setForm(p => ({...p, vehicle: e.target.value}))} required placeholder="e.g. AA-12345" />
            </div>
            <div className="driver-form-row">
              <div className="driver-form-group">
                <label>Fuel Amount (L) *</label>
                <input type="number" name="fuelAmount" value={form.fuelAmount} onChange={e => setForm(p => ({...p, fuelAmount: e.target.value}))} required min="0" step="0.1" />
              </div>
              <div className="driver-form-group">
                <label>Cost (ETB) *</label>
                <input type="number" name="cost" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} required min="0" step="0.01" />
              </div>
            </div>
            <div className="driver-form-row">
              <div className="driver-form-group">
                <label>Odometer (km) *</label>
                <input type="number" name="odometer" value={form.odometer} onChange={e => setForm(p => ({...p, odometer: e.target.value}))} required min="0" />
              </div>
              <div className="driver-form-group">
                <label>Date</label>
                <input type="date" name="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
              </div>
            </div>
            <div className="driver-form-group">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2} placeholder="Optional notes..." />
            </div>

            {/* Receipt Image Upload */}
            <div className="driver-form-group">
              <label>Receipt / Proof Image</label>
              <div className="fuel-receipt-upload" onClick={() => fileRef.current.click()}>
                {previewImg ? (
                  <img src={previewImg} alt="Receipt" className="fuel-receipt-preview" />
                ) : (
                  <div className="fuel-receipt-placeholder">
                    <span>📷</span>
                    <p>Click to upload receipt image</p>
                    <small>JPG, PNG, WEBP — max 5MB</small>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleReceiptImage} style={{ display: 'none' }} />
              {previewImg && (
                <button type="button" className="fuel-remove-img" onClick={() => { setPreviewImg(null); setForm(p => ({...p, receiptImage: null})); }}>
                  ✕ Remove image
                </button>
              )}
            </div>
            <button type="submit" className="driver-submit-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Fuel Log'}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <div className="driver-fuel-stats">
            <div className="driver-fuel-stat">
              <div className="driver-fuel-stat-value">{totalFuel.toFixed(1)}L</div>
              <div className="driver-fuel-stat-label">Total Fuel</div>
            </div>
            <div className="driver-fuel-stat">
              <div className="driver-fuel-stat-value">{totalCost.toFixed(0)} ETB</div>
              <div className="driver-fuel-stat-label">Total Cost</div>
            </div>
            <div className="driver-fuel-stat">
              <div className="driver-fuel-stat-value">{logs.length}</div>
              <div className="driver-fuel-stat-label">Entries</div>
            </div>
          </div>

          <div className="driver-form-card">
            <h3>Fuel History</h3>
            {logs.length === 0
              ? <div className="driver-empty">No fuel logs yet.</div>
              : (
                <table className="driver-schedule-table">
                  <thead>
                    <tr><th>Date</th><th>Vehicle</th><th>Amount</th><th>Cost</th><th>Odometer</th><th>Receipt</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l._id}>
                        <td>{new Date(l.date).toLocaleDateString()}</td>
                        <td>{l.vehicle}</td>
                        <td>{l.fuelAmount}L</td>
                        <td>{l.cost} ETB</td>
                        <td>{l.odometer} km</td>
                        <td>
                          {l.receiptImage
                            ? <img src={l.receiptImage} alt="receipt" className="fuel-log-thumb" onClick={() => window.open(l.receiptImage)} title="Click to view" />
                            : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
