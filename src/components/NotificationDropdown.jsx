import { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, X, CheckCheck } from 'lucide-react';
import './NotificationDropdown.css';

const typeColor = { trip: '#3b82f6', fuel: '#f59e0b', maintenance: '#16a34a', general: '#6366f1' };
const typeIcon  = { trip: 'ℹ️', fuel: '⛽', maintenance: '🔧', general: '🔔' };

const includesAny = (value = '', keys = []) => {
  const v = value.toLowerCase();
  return keys.some((k) => v.includes(k));
};

const resolveNotificationRoute = (notification, pathname) => {
  const title = notification?.title || '';
  const message = notification?.message || '';
  const type = notification?.type || 'general';
  const text = `${title} ${message}`.toLowerCase();

  // ADMIN
  if (pathname.startsWith('/admin')) {
    if (type === 'trip') {
      if (includesAny(text, ['assigned', 'awaiting approval', 'approved', 'rejected', 'cancelled'])) {
        return '/admin/trip-approvals';
      }
      return '/admin/user-request-report';
    }
    if (type === 'fuel') return '/admin/fuel-approvals';
    if (type === 'maintenance') return '/admin/maintenance-reports';
    return '/admin/dashboard';
  }

  // TRANSPORT
  if (pathname.startsWith('/transport')) {
    if (type === 'trip') {
      if (includesAny(text, ['new trip request', 'requested a trip', 'request'])) return '/transport/requests';
      if (includesAny(text, ['approved', 'rejected', 'cancelled'])) return '/transport/trips';
      return '/transport/requests';
    }
    if (type === 'fuel') return '/transport/fuel-approvals';
    if (type === 'maintenance') return '/transport/tracking';
    return '/transport/dashboard';
  }

  // DRIVER
  if (pathname.startsWith('/driver')) {
    if (type === 'trip') return '/driver/trips';
    if (type === 'fuel') return '/driver/fuel-request';
    if (type === 'maintenance') return '/driver/maintenance';
    return '/driver/dashboard';
  }

  // MAINTENANCE
  if (pathname.startsWith('/maintenance')) {
    if (type === 'maintenance') return '/maintenance/issues';
    if (type === 'trip') return '/maintenance/reports';
    return '/maintenance/dashboard';
  }

  // USER
  if (pathname.startsWith('/user')) {
    if (type === 'trip') return '/user/my-requests';
    if (type === 'maintenance') return '/user/notifications';
    return '/user/notifications';
  }

  // FUEL OFFICER
  if (pathname.startsWith('/fuel')) {
    if (type === 'fuel') return '/fuel/requests';
    return '/fuel/notifications';
  }

  // GATE OFFICER
  if (pathname.startsWith('/gate')) {
    if (type === 'trip') return '/gate/qr-scan';
    return '/gate/alerts';
  }

  return null;
};

export default function NotificationDropdown({ notifications, unreadCount, onMarkRead, onMarkAllRead, open, onToggle }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onToggle(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onToggle]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleNotifClick = (n) => {
    if (!n.read && onMarkRead) onMarkRead(n._id);
    onToggle(false);
    const targetRoute = resolveNotificationRoute(n, location.pathname);
    if (targetRoute) navigate(targetRoute);
  };

  return (
    <div className="user-notif-wrapper" ref={ref}>
      {/* Bell button */}
      <button
        className="user-header-icon-btn"
        onClick={() => onToggle(!open)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="user-notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="user-notif-panel">
          {/* Header */}
          <div className="user-notif-panel-header">
            <span>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 20,
                }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button className="user-notif-mark-all" onClick={onMarkAllRead} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button className="user-notif-close" onClick={() => onToggle(false)}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="user-notif-list">
            {notifications.length === 0 ? (
              <div className="user-notif-empty">
                <Bell size={32} color="#d1d5db" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`user-notif-item ${n.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotifClick(n)}
                >
                  <span className="user-notif-type-icon">{typeIcon[n.type] || '🔔'}</span>
                  <div className="user-notif-body">
                    <div className="user-notif-title" style={{ color: typeColor[n.type] || '#6366f1' }}>
                      {n.title}
                    </div>
                    <div className="user-notif-msg">
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
                                  fontWeight: 800, fontSize: 13,
                                  padding: '1px 6px', borderRadius: 4,
                                  border: '1px solid #fcd34d', letterSpacing: 1,
                                }}>{key}</span>
                                {parts[1]}
                              </>
                            );
                          })()
                        : n.message
                      }
                    </div>
                    <div className="user-notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.read && <span className="user-notif-dot" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="user-notif-footer" onClick={onMarkAllRead}>
            {unreadCount > 0
              ? `${unreadCount} unread · Mark all as read`
              : 'All caught up ✓'
            }
          </div>
        </div>
      )}
    </div>
  );
}
