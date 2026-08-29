import { useState } from 'react';
import './DriverInspection.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

const INIT = {
  vehicle: '', fuelLevel: 75, fuelLiters: '',
  tireCondition: 'good', oilLevel: 'full', brakesStatus: 'good',
  lightsWorking: true, wiperWorking: true, hornWorking: true, seatbeltsOk: true,
  notes: '',
};

export default function DriverInspection() {
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle) { showToast('Vehicle plate is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/driver/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Inspection submitted successfully!');
      setForm(INIT);
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="driver-inspection-page">
      {toast && (
        <div className={`driver-toast ${toast.type}`}>{toast.msg}</div>
      )}

      <div className="driver-page-header">
        <h2>Pre-Trip Inspection</h2>
        <p>Complete this form before every trip</p>
      </div>

      <form onSubmit={handleSubmit} className="driver-inspection-form">
        <div className="driver-form-card">
          <h3>Vehicle Information</h3>
          <div className="driver-form-group">
            <label>Vehicle Plate Number *</label>
            <input type="text" name="vehicle" value={form.vehicle} onChange={handleChange} placeholder="e.g. AA-12345" required />
          </div>
          <div className="driver-form-group">
            <label>Fuel Level: {form.fuelLevel}%</label>
            <input type="range" name="fuelLevel" min="0" max="100" value={form.fuelLevel} onChange={handleChange} className="driver-range" />
            <div className="driver-range-labels"><span>Empty</span><span>Full</span></div>
          </div>
          <div className="driver-form-group">
            <label>Fuel Amount (Liters)</label>
            <input type="number" name="fuelLiters" value={form.fuelLiters} onChange={handleChange} min="0" step="0.1" placeholder="e.g. 45.5" />
          </div>
        </div>

        <div className="driver-form-card">
          <h3>Vehicle Condition</h3>
          <div className="driver-form-row">
            <div className="driver-form-group">
              <label>Tire Condition</label>
              <select name="tireCondition" value={form.tireCondition} onChange={handleChange}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div className="driver-form-group">
              <label>Oil Level</label>
              <select name="oilLevel" value={form.oilLevel} onChange={handleChange}>
                <option value="full">Full</option>
                <option value="low">Low</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="driver-form-group">
              <label>Brakes Status</label>
              <select name="brakesStatus" value={form.brakesStatus} onChange={handleChange}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
        </div>

        <div className="driver-form-card">
          <h3>Safety Checklist</h3>
          <div className="driver-checklist">
            {[
              { name: 'lightsWorking', label: 'Lights Working' },
              { name: 'wiperWorking',  label: 'Wipers Working' },
              { name: 'hornWorking',   label: 'Horn Working' },
              { name: 'seatbeltsOk',  label: 'Seatbelts OK' },
            ].map(item => (
              <label key={item.name} className="driver-check-item">
                <input type="checkbox" name={item.name} checked={form[item.name]} onChange={handleChange} />
                <span className="driver-checkmark"></span>
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="driver-form-card">
          <h3>Additional Notes</h3>
          <div className="driver-form-group">
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any issues or observations..." />
          </div>
        </div>

        <button type="submit" className="driver-submit-btn" disabled={saving}>
          {saving ? 'Submitting...' : 'Submit Inspection'}
        </button>
      </form>
    </div>
  );
}
