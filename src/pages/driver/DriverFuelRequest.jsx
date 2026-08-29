import { useState, useEffect } from 'react';
import { createFuelRequest, getFuelRequests, getVehicles, getCurrentUser, confirmFuelReceipt } from '../../api/api';
import './DriverFuelLog.css';

export default function DriverFuelRequest() {
  const currentUser = getCurrentUser();
  const [vehicles, setVehicles] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleType: '', fuelType: 'Diesel', requestedLiters: '', destination: '', purpose: '', odometer: '',
  });
  const [errors, setErrors] = useState({});

  const fetchData = async () => {
    try {
      const [vehs, reqs] = await Promise.all([
        getVehicles(),
        getFuelRequests(),
      ]);
      setVehicles(vehs);
      // Filter to show only this driver's requests by name
      const driverName = currentUser?.name || currentUser?.username;
      setMyRequests(reqs.filter(r => r.driverName === driverName));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const validate = () => {
    const e = {};
    if (!formData.vehicleType) e.vehicleType = 'Select a vehicle type';
    if (!formData.fuelType) e.fuelType = 'Select fuel type';
    if (!formData.requestedLiters || formData.requestedLiters <= 0) e.requestedLiters = 'Enter valid liters';
    if (!formData.destination) e.destination = 'Enter destination';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await createFuelRequest({
        driverName: currentUser?.name || currentUser?.username,
        vehicleType: formData.vehicleType,
        fuelType: formData.fuelType,
        requestedLiters: Number(formData.requestedLiters),
        destination: formData.destination,
        purpose: formData.purpose,
        odometer: Number(formData.odometer) || 0,
      });
      setShowForm(false);
      setFormData({ vehicleType: '', fuelType: 'Diesel', requestedLiters: '', destination: '', purpose: '', odometer: '' });
      setErrors({});
      fetchData();
    } catch (err) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', cancelled: '#ef4444', dispensed: '#3b82f6', confirmed: '#8b5cf6' };

  const handleConfirm = async (id) => {
    if (!window.confirm('Confirm that you have received the fuel?')) return;
    try {
      const updated = await confirmFuelReceipt(id);
      setMyRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
    } catch (err) {
      alert('Failed to confirm: ' + err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⛽ Fuel Requests</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Request fuel from the transport officer</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>New Fuel Request</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Vehicle Type *</label>
                <select value={formData.vehicleType} onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: errors.vehicleType ? '1px solid #ef4444' : '1px solid #d1d5db' }}>
                  <option value="">Select vehicle type</option>
                  <option value="Bus">Bus</option>
                  <option value="Minibus">Minibus</option>
                  <option value="Car">Car</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
                {errors.vehicleType && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.vehicleType}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Fuel Type *</label>
                <select value={formData.fuelType} onChange={e => setFormData(p => ({ ...p, fuelType: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Requested Liters *</label>
                <input type="number" min="1" value={formData.requestedLiters}
                  onChange={e => setFormData(p => ({ ...p, requestedLiters: e.target.value }))}
                  placeholder="e.g. 50"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: errors.requestedLiters ? '1px solid #ef4444' : '1px solid #d1d5db', boxSizing: 'border-box' }} />
                {errors.requestedLiters && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.requestedLiters}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Odometer (km)</label>
                <input type="number" min="0" value={formData.odometer}
                  onChange={e => setFormData(p => ({ ...p, odometer: e.target.value }))}
                  placeholder="Current odometer reading"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Destination *</label>
                <input type="text" value={formData.destination}
                  onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))}
                  placeholder="e.g. Dire Dawa"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: errors.destination ? '1px solid #ef4444' : '1px solid #d1d5db', boxSizing: 'border-box' }} />
                {errors.destination && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{errors.destination}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Purpose</label>
                <input type="text" value={formData.purpose}
                  onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))}
                  placeholder="e.g. Official trip"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button type="submit" disabled={submitting}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading...</p> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Vehicle', 'Fuel Type', 'Requested', 'Permitted', 'Approval Key', 'Destination', 'Status', 'Date', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myRequests.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No fuel requests yet</td></tr>
              ) : myRequests.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.vehicleType || r.vehiclePlate || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.fuelType}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.requestedLiters}L</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
                    {r.permittedLiters ? `${r.permittedLiters}L` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.approvalKey ? (
                      <span style={{
                        background: '#fef3c7', color: '#92400e',
                        fontWeight: 800, fontSize: 14,
                        padding: '4px 12px', borderRadius: 6,
                        border: '1.5px solid #fcd34d',
                        letterSpacing: 2, fontFamily: 'monospace',
                        display: 'inline-block',
                      }}>
                        🔑 {r.approvalKey}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.destination}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.status === 'dispensed' && (
                      <button onClick={() => handleConfirm(r._id)}
                        style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ✓ Confirm Received
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <span style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 600 }}>✓ Received {r.confirmedAt ? new Date(r.confirmedAt).toLocaleDateString() : ''}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
