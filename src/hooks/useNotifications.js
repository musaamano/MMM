import { useState, useEffect, useCallback } from 'react';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const fetch_ = useCallback(async () => {
    const t = token();
    if (!t) return;
    try {
      const res = await fetch(`${BASE}/notifications`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 15000); // poll every 15s
    return () => clearInterval(id);
  }, [fetch_]);

  const markRead = async (id) => {
    const t = token();
    await fetch(`${BASE}/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${t}` } });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const t = token();
    await fetch(`${BASE}/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${t}` } });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, refresh: fetch_ };
}
