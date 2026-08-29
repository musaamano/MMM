import { useState } from 'react';
import { useNotifications } from '../../../hooks/useNotifications';
import './DriverNotifications.css';

const typeIcon = {
  trip:        '🚗',
  fuel:        '⛽',
  maintenance: '🔧',
  general:     '📢',
};

const typeLabel = {
  trip:        'Trip',
  fuel:        'Fuel',
  maintenance: 'Maintenance',
  general:     'General',
};

const DriverNotifications = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.type === filter);

  return (
    <div className="driver-notifications">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>
          Notifications
          {unreadCount > 0 && (
            <span style={{
              marginLeft: 10, background: '#dc2626', color: '#fff',
              fontSize: 12, fontWeight: 700, padding: '3px 10px',
              borderRadius: 20, verticalAlign: 'middle',
            }}>
              {unreadCount} new
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: '8px 18px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            ✓ Mark All Read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="filter-buttons">
        {['all', 'unread', 'trip', 'fuel', 'maintenance'].map(f => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadCount})` : typeLabel[f]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="notifications-list">
        {filtered.length === 0 ? (
          <p className="no-notifications">No notifications</p>
        ) : (
          filtered.map(n => (
            <div
              key={n._id}
              className={`notification-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => !n.read && markRead(n._id)}
            >
              <div className="notification-icon">
                {typeIcon[n.type] || '📢'}
              </div>
              <div className="notification-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h4>{n.title}</h4>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 12, background: n.type === 'fuel' ? '#fef3c7' : n.type === 'trip' ? '#dbeafe' : '#dcfce7',
                    color: n.type === 'fuel' ? '#92400e' : n.type === 'trip' ? '#1e40af' : '#166534',
                    flexShrink: 0,
                  }}>
                    {typeLabel[n.type] || 'General'}
                  </span>
                </div>
                <p>
                  {n.type === 'fuel' && n.message.includes('approval key')
                    ? (() => {
                        const keyMatch = n.message.match(/approval key is ([A-Z0-9]+)/i);
                        if (!keyMatch) return n.message;
                        const [full, key] = keyMatch;
                        const parts = n.message.split(full);
                        return (
                          <>
                            {parts[0]}approval key is{' '}
                            <span style={{
                              background: '#fef3c7', color: '#92400e',
                              fontWeight: 800, fontSize: 15,
                              padding: '2px 10px', borderRadius: 6,
                              border: '1.5px solid #fcd34d',
                              letterSpacing: 2, display: 'inline-block',
                              marginTop: 4,
                            }}>{key}</span>
                            {parts[1]}
                          </>
                        );
                      })()
                    : n.message
                  }
                </p>
                <span className="notification-time">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {!n.read && <div className="unread-indicator" />}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {notifications.length > 0 && (
        <div style={{
          marginTop: 24, padding: '16px 20px',
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb',
          display: 'flex', gap: 32,
        }}>
          {[
            { label: 'Total',       value: notifications.length,                          color: '#374151' },
            { label: 'Unread',      value: unreadCount,                                   color: '#dc2626' },
            { label: 'Read',        value: notifications.length - unreadCount,            color: '#16a34a' },
            { label: 'Fuel',        value: notifications.filter(n=>n.type==='fuel').length,        color: '#f59e0b' },
            { label: 'Trips',       value: notifications.filter(n=>n.type==='trip').length,        color: '#3b82f6' },
            { label: 'Maintenance', value: notifications.filter(n=>n.type==='maintenance').length, color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverNotifications;
