import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Car, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '../../api/api';
import './NewDriverDashboard.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function NewDriverDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [stats, setStats] = useState({ totalTrips: 0, completedTrips: 0, todayTrips: 0, activeTrip: null, vehicle: null, status: 'available' });
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = token();
    if (!t) return;
    Promise.all([
      fetch(`${BASE}/driver/stats`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      fetch(`${BASE}/driver/trips`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
    ]).then(([s, trips]) => {
      if (s && !s.message) setStats(s);
      if (Array.isArray(trips)) setRecentTrips(trips.slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const barData = [
    { name: 'Total',     value: stats.totalTrips,     fill: '#3b82f6' },
    { name: 'Completed', value: stats.completedTrips, fill: '#16a34a' },
    { name: 'Today',     value: stats.todayTrips,     fill: '#f59e0b' },
  ];

  const STATUS_STYLE = {
    approved:    { bg: '#dbeafe', color: '#1e40af' },
    started:     { bg: '#fef3c7', color: '#92400e' },
    'in-progress': { bg: '#e0e7ff', color: '#3730a3' },
    completed:   { bg: '#dcfce7', color: '#166534' },
    rejected:    { bg: '#fee2e2', color: '#991b1b' },
  };

  if (loading) return <div className="driver-loading">Loading dashboard...</div>;

  return (
    <div className="driver-dashboard">
      <div className="driver-page-header">
        <h2>Dashboard</h2>
        <p>Welcome back, {currentUser?.name || 'Driver'}!</p>
      </div>

      {/* Active Trip Banner */}
      {stats.activeTrip && (
        <div className="driver-active-banner">
          <Car size={20} />
          <span>Active trip to <strong>{stats.activeTrip.destination}</strong></span>
          <button onClick={() => navigate('/driver/trips')}>View Trip →</button>
        </div>
      )}

      {/* Stats + Chart */}
      <div className="driver-charts-row">
        <div className="driver-chart-card">
          <h3>Trip Summary</h3>
          <p>Your trips by status</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={50} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="driver-chart-legend">
            {barData.map(s => (
              <div key={s.name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.fill }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="driver-chart-card">
          <h3>Quick Info</h3>
          <p>Current status</p>
          <div className="driver-info-grid">
            <div className="driver-info-item">
              <Car size={22} color="#16a34a" />
              <div>
                <div className="driver-info-label">Assigned Vehicle</div>
                <div className="driver-info-value">{stats.vehicle || '—'}</div>
              </div>
            </div>
            <div className="driver-info-item">
              <CheckCircle size={22} color="#16a34a" />
              <div>
                <div className="driver-info-label">Status</div>
                <div className="driver-info-value" style={{ textTransform: 'capitalize' }}>{stats.status}</div>
              </div>
            </div>
            <div className="driver-info-item">
              <Clock size={22} color="#f59e0b" />
              <div>
                <div className="driver-info-label">Today's Trips</div>
                <div className="driver-info-value">{stats.todayTrips}</div>
              </div>
            </div>
            <div className="driver-info-item">
              <AlertTriangle size={22} color="#dc2626" />
              <div>
                <div className="driver-info-label">Active Trip</div>
                <div className="driver-info-value">{stats.activeTrip ? 'Yes' : 'None'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="driver-quick-actions">
        <button onClick={() => navigate('/driver/trips')} className="driver-action-btn primary">🚗 My Trips</button>
        <button onClick={() => navigate('/driver/inspection')} className="driver-action-btn secondary">📋 Pre-Trip Inspection</button>
        <button onClick={() => navigate('/driver/fuel')} className="driver-action-btn secondary">⛽ Log Fuel</button>
        <button onClick={() => navigate('/driver/maintenance')} className="driver-action-btn secondary">🔧 Report Issue</button>
      </div>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <div className="driver-recent-card">
          <div className="driver-recent-header">
            <span>Recent Trips</span>
            <button onClick={() => navigate('/driver/trips')}>View All →</button>
          </div>
          {recentTrips.map(trip => {
            const st = STATUS_STYLE[trip.status] || STATUS_STYLE.approved;
            return (
              <div key={trip._id} className="driver-recent-item">
                <div>
                  <div className="driver-recent-dest">{trip.destination}</div>
                  <div className="driver-recent-meta">{trip.requester} · {trip.date}</div>
                </div>
                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {trip.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
