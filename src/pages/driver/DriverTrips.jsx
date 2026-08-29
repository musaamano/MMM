import { useState, useEffect } from 'react';
import TripQRCode from './TripQRCode';
import './DriverTrips.css';

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
const token = () => localStorage.getItem('token');

const STATUS_FLOW = { approved: 'started', started: 'in-progress', 'in-progress': 'completed' };
const STATUS_LABEL = { approved: 'Start Trip', started: 'Mark In Progress', 'in-progress': 'Complete Trip' };

export default function DriverTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = () => {
    fetch(`${BASE}/driver/trips`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTrips(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const updateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`${BASE}/driver/trips/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchTrips();
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter);

  const STATUS_STYLE = {
    approved:      { bg: '#dbeafe', color: '#1e40af' },
    started:       { bg: '#fef3c7', color: '#92400e' },
    'in-progress': { bg: '#e0e7ff', color: '#3730a3' },
    completed:     { bg: '#dcfce7', color: '#166534' },
  };

  if (loading) return <div className="driver-loading">Loading trips...</div>;

  return (
    <div className="driver-trips-page">
      <div className="driver-page-header">
        <h2>My Trips</h2>
        <p>Manage your assigned trips</p>
      </div>

      <div className="driver-filter-bar">
        {['all', 'approved', 'started', 'in-progress', 'completed'].map(f => (
          <button key={f} className={`driver-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="driver-empty">No trips found.</div>
      ) : (
        <div className="driver-trips-grid">
          {filtered.map(trip => {
            const st = STATUS_STYLE[trip.status] || STATUS_STYLE.approved;
            const nextStatus = STATUS_FLOW[trip.status];
            return (
              <div key={trip._id} className="driver-trip-card">
                <div className="driver-trip-header">
                  <h3>{trip.destination}</h3>
                  <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {trip.status}
                  </span>
                </div>
                <div className="driver-trip-details">
                  <div className="driver-trip-row"><span>Requester</span><span>{trip.requester || '—'}</span></div>
                  <div className="driver-trip-row"><span>Date</span><span>{trip.date || '—'}</span></div>
                  <div className="driver-trip-row"><span>Passengers</span><span>{trip.passengers || '—'}</span></div>
                  <div className="driver-trip-row"><span>Vehicle</span><span>{trip.assignedVehicle || '—'}</span></div>
                  <div className="driver-trip-row"><span>Purpose</span><span>{trip.purpose || '—'}</span></div>
                </div>
                {nextStatus && (
                  <button
                    className="driver-status-btn"
                    onClick={() => updateStatus(trip._id, nextStatus)}
                    disabled={updating === trip._id}
                  >
                    {updating === trip._id ? 'Updating...' : STATUS_LABEL[trip.status]}
                  </button>
                )}

                {/* QR Code for approved trips */}
                <TripQRCode
                  tripId={trip._id}
                  tripStatus={trip.status}
                  destination={trip.destination}
                  date={trip.date}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
