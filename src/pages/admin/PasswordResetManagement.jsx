import { useState, useEffect } from 'react';
import { Key, Clock, CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import './adminTheme.css';
import './passwordResetManagement.css';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PasswordResetManagement() {
  const [resetLogs, setResetLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchResetLogs();
  }, []);

  const fetchResetLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/auth/reset-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setResetLogs(data);
    } catch (err) {
      console.error('Error fetching reset logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={18} color="#16a34a" />;
      case 'expired':
        return <XCircle size={18} color="#dc2626" />;
      case 'pending':
        return <Clock size={18} color="#f59e0b" />;
      case 'cancelled':
        return <AlertTriangle size={18} color="#64748b" />;
      default:
        return <Clock size={18} color="#94a3b8" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: { bg: '#dcfce7', color: '#16a34a' },
      expired: { bg: '#fee', color: '#dc2626' },
      pending: { bg: '#fef3c7', color: '#f59e0b' },
      cancelled: { bg: '#f1f5f9', color: '#64748b' }
    };
    const style = colors[status] || colors.pending;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: style.bg,
        color: style.color,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600
      }}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  const filteredLogs = filter === 'all' 
    ? resetLogs 
    : resetLogs.filter(log => log.status === filter);

  const stats = {
    total: resetLogs.length,
    pending: resetLogs.filter(l => l.status === 'pending').length,
    completed: resetLogs.filter(l => l.status === 'completed').length,
    expired: resetLogs.filter(l => l.status === 'expired').length,
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  }

  return (
    <div className="password-reset-management">
      <div className="page-header">
        <div>
          <h1>Password Reset Management</h1>
          <p className="subtitle">Monitor and manage password reset requests</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Key size={24} color="#16a34a" />
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
        </div>
        <div className="stat-card">
          <Clock size={24} color="#f59e0b" />
          <div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircle size={24} color="#16a34a" />
          <div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <XCircle size={24} color="#dc2626" />
          <div>
            <div className="stat-value">{stats.expired}</div>
            <div className="stat-label">Expired</div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={filter === 'expired' ? 'active' : ''}
          onClick={() => setFilter('expired')}
        >
          Expired
        </button>
      </div>

      <div className="reset-logs-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Requested At</th>
              <th>Expires At</th>
              <th>Status</th>
              <th>Completed At</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={16} color="#64748b" />
                    {log.user?.name || 'Unknown'}
                  </div>
                </td>
                <td>{log.user?.email || '—'}</td>
                <td>{new Date(log.requestedAt).toLocaleString()}</td>
                <td>
                  {log.tokenExpires ? (
                    <span style={{ 
                      color: new Date(log.tokenExpires) < new Date() ? '#dc2626' : '#64748b' 
                    }}>
                      {new Date(log.tokenExpires).toLocaleString()}
                    </span>
                  ) : '—'}
                </td>
                <td>{getStatusBadge(log.status)}</td>
                <td>{log.completedAt ? new Date(log.completedAt).toLocaleString() : '—'}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="no-data">
            <Key size={48} color="#cbd5e1" />
            <p>No password reset requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}
