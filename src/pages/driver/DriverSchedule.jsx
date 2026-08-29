import { useState, useEffect } from 'react';
import './DriverSchedule.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

export default function DriverSchedule() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/driver/schedule`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTrips(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayTrips = trips.filter(t => t.date === today);
  const upcomingTrips = trips.filter(t => t.date > today);

  const STATUS_STYLE = {
    approved:      { bg: '#dbeafe', color: '#1e40af' },
    started:       { bg: '#fef3c7', color: '#92400e' },
    'in-progress': { bg: '#e0e7ff', color: '#3730a3' },
    completed:     { bg: '#dcfce7', color: '#166534' },
  };

  if (loading) return <div className="driver-loading">Loading schedule...</div>;

  return (
    <div className="driver-schedule-page">
      <div className="driver-page-header">
        <h2>Schedule</h2>
        <p>Your weekly trip schedule</p>
      </div>

      <div className="driver-schedule-section">
        <h3>Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        {todayTrips.length === 0
          ? <div className="driver-schedule-empty">No trips scheduled for today.</div>
          : (
            <table className="driver-schedule-table">
              <thead>
                <tr><th>Destination</th><th>Requester</th><th>Passengers</th><th>Vehicle</th><th>Status</th></tr>
              </thead>
              <tbody>
                {todayTrips.map(t => {
                  const st = STATUS_STYLE[t.status] || STATUS_STYLE.approved;
                  return (
                    <tr key={t._id}>
                      <td>{t.destination}</td>
                      <td>{t.requester || '—'}</td>
                      <td>{t.passengers || '—'}</td>
                      <td>{t.assignedVehicle || '—'}</td>
                      <td><span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>

      <div className="driver-schedule-section">
        <h3>Upcoming This Week</h3>
        {upcomingTrips.length === 0
          ? <div className="driver-schedule-empty">No upcoming trips this week.</div>
          : (
            <table className="driver-schedule-table">
              <thead>
                <tr><th>Date</th><th>Destination</th><th>Requester</th><th>Passengers</th><th>Status</th></tr>
              </thead>
              <tbody>
                {upcomingTrips.map(t => {
                  const st = STATUS_STYLE[t.status] || STATUS_STYLE.approved;
                  return (
                    <tr key={t._id}>
                      <td>{t.date}</td>
                      <td>{t.destination}</td>
                      <td>{t.requester || '—'}</td>
                      <td>{t.passengers || '—'}</td>
                      <td><span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
