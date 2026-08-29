import { useState, useEffect } from 'react';
import { getFuelRequests, dispenseFuel, getCurrentUser } from '../../api/api';
import './FuelRequests.css';
import './fuelstation.css';

const FuelRequests = () => {
  const currentUser = getCurrentUser();
  const [fuelRequests, setFuelRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('approved');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispensedAmount, setDispensedAmount] = useState('');
  const [approvalKey, setApprovalKey] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await getFuelRequests();
      setFuelRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleDispense = async () => {
    const liters = parseFloat(dispensedAmount);
    if (!liters || liters <= 0) { alert('Enter valid liters'); return; }
    if (liters > selectedRequest.permittedLiters) {
      alert(`Cannot exceed permitted amount: ${selectedRequest.permittedLiters}L`);
      return;
    }
    setActionLoading(true);
    try {
      const updated = await dispenseFuel(
        selectedRequest._id,
        liters,
        currentUser?.name || currentUser?.username,
        approvalKey
      );
      setFuelRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
      setShowDispenseModal(false);
      setSelectedRequest(null);
      setDispensedAmount('');
      setApprovalKey('');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', cancelled: '#ef4444', dispensed: '#3b82f6', confirmed: '#8b5cf6' };
  const filtered = filterStatus === 'all' ? fuelRequests : fuelRequests.filter(r => r.status === filterStatus);
  const stats = {
    total: fuelRequests.length,
    pending: fuelRequests.filter(r => r.status === 'pending').length,
    approved: fuelRequests.filter(r => r.status === 'approved').length,
    dispensed: fuelRequests.filter(r => r.status === 'dispensed').length,
  };

  return (
    <div className="fuel-requests-page">
      <div className="fuel-page-header">
        <h2>Fuel Requests</h2>
      <p>Dispense fuel for admin-approved requests after key verification</p>
      </div>

      <div className="fuel-stats-grid">
        <div className="fuel-stat-card blue"><div className="fuel-stat-icon">📋</div><div className="fuel-stat-value">{stats.total}</div><div className="fuel-stat-label">Total</div></div>
        <div className="fuel-stat-card orange"><div className="fuel-stat-icon">⏳</div><div className="fuel-stat-value">{stats.pending}</div><div className="fuel-stat-label">Pending (awaiting admin)</div></div>
        <div className="fuel-stat-card green"><div className="fuel-stat-icon">✓</div><div className="fuel-stat-value">{stats.approved}</div><div className="fuel-stat-label">Approved — Ready to Dispense</div></div>
        <div className="fuel-stat-card blue"><div className="fuel-stat-icon">⛽</div><div className="fuel-stat-value">{stats.dispensed}</div><div className="fuel-stat-label">Dispensed</div></div>
      </div>

      <div className="fuel-filter-section">
        <label className="fuel-filter-label">Filter:</label>
        <div className="fuel-filter-buttons">
          {['approved', 'dispensed', 'confirmed', 'pending', 'cancelled', 'all'].map(s => (
            <button key={s} className={`fuel-filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Loading...</p> : (
        <div className="fuel-table-container">
          <div className="fuel-table-header"><h3>Fuel Requests ({filtered.length})</h3></div>
          <div className="fuel-table-wrapper">
            <table className="fuel-table">
              <thead>
                <tr>
                  <th>Driver</th><th>Vehicle</th><th>Fuel Type</th>
                  <th>Requested</th><th>Permitted</th><th>Destination</th>
                  <th>Approved By</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No requests found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.driverName}</td>
                    <td>{r.vehiclePlate}{r.vehicleModel ? ` — ${r.vehicleModel}` : ''}</td>
                    <td><span className={`fuel-type-badge ${r.fuelType?.toLowerCase()}`}>{r.fuelType}</span></td>
                    <td>{r.requestedLiters}L</td>
                    <td style={{ fontWeight: 700, color: '#22c55e' }}>{r.permittedLiters ? `${r.permittedLiters}L` : '—'}</td>
                    <td>{r.destination}</td>
                    <td>{r.approvedBy || '—'}</td>
                    <td>
                      <span style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'approved' && (
                        <button className="action-btn approve"
                          onClick={() => { setSelectedRequest(r); setDispensedAmount(String(r.permittedLiters)); setApprovalKey(''); setShowDispenseModal(true); }}>
                          ⛽ Dispense
                        </button>
                      )}
                      {r.status === 'dispensed' && <span style={{ color: '#3b82f6', fontSize: 13 }}>✓ {r.dispensedLiters}L dispensed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDispenseModal && selectedRequest && (
        <div className="fuel-modal-overlay" onClick={() => setShowDispenseModal(false)}>
          <div className="fuel-modal" onClick={e => e.stopPropagation()}>
            <div className="fuel-modal-header">
              <h3>⛽ Dispense Fuel</h3>
              <button className="fuel-modal-close" onClick={() => setShowDispenseModal(false)}>×</button>
            </div>
            <div className="fuel-modal-content">
              <p><strong>Driver:</strong> {selectedRequest.driverName}</p>
              <p><strong>Vehicle:</strong> {selectedRequest.vehiclePlate}</p>
              <p><strong>Fuel Type:</strong> {selectedRequest.fuelType}</p>
              <p><strong>Destination:</strong> {selectedRequest.destination}</p>
              <p><strong>Approved by:</strong> {selectedRequest.approvedBy}</p>
              <div className="fuel-form-group">
                <label className="fuel-form-label">Approval Key *</label>
                <input
                  type="text"
                  value={approvalKey}
                  onChange={e => setApprovalKey(e.target.value.toUpperCase())}
                  className="fuel-form-input"
                  placeholder="Enter approval key from driver/admin"
                />
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', margin: '12px 0' }}>
                <strong style={{ color: '#16a34a' }}>Permitted amount: {selectedRequest.permittedLiters}L</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>You may only dispense up to this amount</p>
              </div>
              <div className="fuel-form-group">
                <label className="fuel-form-label">Liters to Dispense *</label>
                <input type="number" min="1" max={selectedRequest.permittedLiters} value={dispensedAmount}
                  onChange={e => setDispensedAmount(e.target.value)} className="fuel-form-input" />
              </div>
            </div>
            <div className="fuel-modal-actions">
              <button onClick={handleDispense} disabled={actionLoading || !approvalKey.trim()} className="fuel-btn-primary">
                {actionLoading ? 'Dispensing...' : '⛽ Confirm Dispense'}
              </button>
              <button onClick={() => setShowDispenseModal(false)} className="fuel-btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelRequests;
