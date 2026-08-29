import { useState, useEffect } from 'react';
import { getFuelRequests, approveFuelRequest, rejectFuelRequest, getFuelInventory, getCurrentUser } from '../../api/api';

export default function FuelApprovals() {
  const currentUser = getCurrentUser();
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [permittedLiters, setPermittedLiters] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('pending');

  const fetchData = async () => {
    try {
      const [reqs, inv] = await Promise.all([getFuelRequests(), getFuelInventory()]);
      setRequests(reqs);
      setInventory(inv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async () => {
    if (!permittedLiters || Number(permittedLiters) <= 0) { alert('Enter valid liters'); return; }
    setActionLoading(true);
    try {
      const updated = await approveFuelRequest(selected._id, Number(permittedLiters), currentUser?.name || currentUser?.username);
      setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
      setShowApprove(false); setSelected(null); setPermittedLiters('');
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { alert('Enter rejection reason'); return; }
    setActionLoading(true);
    try {
      const updated = await rejectFuelRequest(selected._id, rejectionReason);
      setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
      setShowReject(false); setSelected(null); setRejectionReason('');
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const statusColor = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', cancelled: '#ef4444', dispensed: '#3b82f6', confirmed: '#8b5cf6' };
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const getStock = (fuelType) => inventory.find(i => i.fuelType === fuelType);
  const stockColor = (inv) => {
    if (!inv || !inv.capacity) return '#6b7280';
    const pct = (inv.available / inv.capacity) * 100;
    if (pct > 50) return '#22c55e';
    if (pct > 20) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>⛽ Fuel Requests</h2>
      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>Admin-controlled fuel authorization panel</p>

      {/* Fuel Station Inventory Banner */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['Diesel', 'Petrol'].map(ft => {
          const inv = getStock(ft);
          const pct = inv?.capacity ? ((inv.available / inv.capacity) * 100).toFixed(1) : null;
          return (
            <div key={ft} style={{ flex: 1, background: '#f8fafc', border: `1px solid ${stockColor(inv)}44`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{ft === 'Diesel' ? '🟢' : '🟠'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ft}</div>
                <div style={{ fontSize: 13, color: '#374151' }}>
                  <span style={{ fontWeight: 700, color: stockColor(inv) }}>{inv?.available?.toLocaleString() ?? 0}L</span>
                  {inv?.capacity ? ` / ${inv.capacity.toLocaleString()}L` : ''}
                  {pct && <span style={{ marginLeft: 8, color: stockColor(inv), fontWeight: 600 }}>({pct}%)</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'approved', 'dispensed', 'confirmed', 'cancelled', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: filter === s ? '#2563eb' : '#f1f5f9', color: filter === s ? '#fff' : '#374151' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading...</p> : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Driver', 'Vehicle', 'Fuel Type', 'Requested', 'Destination', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No requests found</td></tr>
              ) : filtered.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{r.driverName}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.vehiclePlate}{r.vehicleModel ? ` — ${r.vehicleModel}` : ''}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.fuelType}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.requestedLiters}L
                    {r.permittedLiters && <span style={{ color: '#22c55e', fontWeight: 700, marginLeft: 6 }}>→ {r.permittedLiters}L permitted</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{r.destination}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setSelected(r); setPermittedLiters(String(r.requestedLiters)); setShowApprove(true); }}
                          style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Approve
                        </button>
                        <button onClick={() => { setSelected(r); setShowReject(true); }}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Modal */}
      {showApprove && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowApprove(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Approve Fuel Request</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Driver: <strong>{selected.driverName}</strong> | Vehicle: <strong>{selected.vehiclePlate}</strong></p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Destination: <strong>{selected.destination}</strong> | Requested: <strong>{selected.requestedLiters}L {selected.fuelType}</strong></p>
            {/* Show current stock for the requested fuel type */}
            {(() => {
              const inv = getStock(selected.fuelType);
              const pct = inv?.capacity ? ((inv.available / inv.capacity) * 100).toFixed(1) : null;
              return (
                <div style={{ background: stockColor(inv) + '11', border: `1px solid ${stockColor(inv)}44`, borderRadius: 8, padding: '10px 14px', margin: '12px 0', fontSize: 13 }}>
                  <strong>Station {selected.fuelType} Stock:</strong>{' '}
                  <span style={{ color: stockColor(inv), fontWeight: 700 }}>{inv?.available?.toLocaleString() ?? 0}L available</span>
                  {pct && ` (${pct}%)`}
                </div>
              );
            })()}
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Permitted Liters *</label>
              <input type="number" min="1" max={selected.requestedLiters} value={permittedLiters}
                onChange={e => setPermittedLiters(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, boxSizing: 'border-box' }} />
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Driver requested {selected.requestedLiters}L — set the amount you permit based on the route</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={handleApprove} disabled={actionLoading}
                style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                {actionLoading ? 'Approving...' : '✓ Confirm Approval'}
              </button>
              <button onClick={() => setShowApprove(false)}
                style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowReject(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Reject Fuel Request</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Driver: <strong>{selected.driverName}</strong> | {selected.requestedLiters}L {selected.fuelType}</p>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Reason *</label>
              <textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={handleReject} disabled={actionLoading}
                style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                {actionLoading ? 'Rejecting...' : '✗ Confirm Rejection'}
              </button>
              <button onClick={() => setShowReject(false)}
                style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
