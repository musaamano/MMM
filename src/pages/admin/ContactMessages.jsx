import { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, AlertCircle, Send, Trash2, Filter } from 'lucide-react';
import './adminTheme.css';
import './contactMessages.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', category: 'all' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.priority !== 'all') params.append('priority', filter.priority);
      if (filter.category !== 'all') params.append('category', filter.category);

      const response = await fetch(`${BASE}/contact?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (messageId) => {
    if (!adminResponse.trim()) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE}/contact/${messageId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminResponse, status: 'resolved' })
      });

      if (response.ok) {
        setAdminResponse('');
        setSelectedMessage(null);
        fetchMessages();
        alert('Response sent successfully!');
      }
    } catch (err) {
      console.error('Error sending response:', err);
      alert('Failed to send response');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (messageId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/contact/${messageId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchMessages();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/contact/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: '#f59e0b', bg: '#fef3c7' },
      'in-progress': { icon: AlertCircle, color: '#3b82f6', bg: '#dbeafe' },
      resolved: { icon: CheckCircle, color: '#16a34a', bg: '#dcfce7' }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 4, 
        padding: '4px 10px', 
        background: badge.bg, 
        color: badge.color, 
        borderRadius: 12, 
        fontSize: 12, 
        fontWeight: 600 
      }}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: '#64748b',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#dc2626'
    };
    return (
      <span style={{ 
        padding: '2px 8px', 
        background: colors[priority] + '20', 
        color: colors[priority], 
        borderRadius: 8, 
        fontSize: 11, 
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        {priority}
      </span>
    );
  };

  const stats = {
    total: messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    inProgress: messages.filter(m => m.status === 'in-progress').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>;
  }

  return (
    <div className="contact-messages-container">
      <div className="page-header">
        <div>
          <h1>Contact Messages</h1>
          <p className="subtitle">Manage user support requests and inquiries</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Mail size={24} color="#16a34a" />
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Messages</div>
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
          <AlertCircle size={24} color="#3b82f6" />
          <div>
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircle size={24} color="#16a34a" />
          <div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <Filter size={18} />
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}>
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="all">All Categories</option>
          <option value="password-reset">Password Reset</option>
          <option value="account-access">Account Access</option>
          <option value="technical-issue">Technical Issue</option>
          <option value="general">General</option>
        </select>
      </div>

      <div className="messages-list">
        {messages.map((msg) => (
          <div key={msg._id} className="message-card">
            <div className="message-header">
              <div className="message-info">
                <h3>{msg.subject}</h3>
                <div className="message-meta">
                  <span>{msg.name}</span>
                  <span>•</span>
                  <span>{msg.email}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="message-badges">
                {getPriorityBadge(msg.priority)}
                {getStatusBadge(msg.status)}
              </div>
            </div>

            <div className="message-body">
              <p>{msg.message}</p>
            </div>

            {msg.adminResponse && (
              <div className="admin-response-display">
                <strong>Admin Response:</strong>
                <p>{msg.adminResponse}</p>
                <small>Responded by {msg.respondedBy?.name} on {new Date(msg.respondedAt).toLocaleString()}</small>
              </div>
            )}

            <div className="message-actions">
              {msg.status !== 'resolved' && (
                <>
                  <button 
                    className="btn-respond"
                    onClick={() => setSelectedMessage(msg._id === selectedMessage ? null : msg._id)}
                  >
                    <Send size={16} />
                    Respond
                  </button>
                  <select 
                    value={msg.status}
                    onChange={(e) => handleStatusChange(msg._id, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </>
              )}
              <button className="btn-delete" onClick={() => handleDelete(msg._id)}>
                <Trash2 size={16} />
              </button>
            </div>

            {selectedMessage === msg._id && (
              <div className="response-form">
                <textarea
                  placeholder="Type your response here..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                />
                <div className="response-actions">
                  <button 
                    className="btn-send"
                    onClick={() => handleRespond(msg._id)}
                    disabled={sending || !adminResponse.trim()}
                  >
                    {sending ? 'Sending...' : 'Send Response'}
                  </button>
                  <button 
                    className="btn-cancel"
                    onClick={() => {
                      setSelectedMessage(null);
                      setAdminResponse('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="no-messages">
            <Mail size={48} color="#cbd5e1" />
            <p>No messages found</p>
          </div>
        )}
      </div>
    </div>
  );
}
