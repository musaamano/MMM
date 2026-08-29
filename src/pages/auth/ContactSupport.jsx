import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, User, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react';
import busLogo from '../../assets/bus.png';
import './forgotPassword.css';
import './contactSupport.css';

export default function ContactSupport() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="contact-support-page">
        <div className="contact-support-container">
          <div className="contact-support-card success-card">
            <CheckCircle className="success-icon" />
            <h2>Message Sent Successfully</h2>
            <p className="success-message">
              Thank you for contacting us! We have received your message and will respond to you shortly.
            </p>
            <p className="success-subtitle">
              You will receive an email confirmation at <strong>{formData.email}</strong>
            </p>
            <Link to="/login" className="back-to-login-btn">
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-support-page">
      <div className="contact-support-container">
        <div className="contact-support-card">
          <div className="logo-wrapper">
            <img src={busLogo} alt="Haramaya University Logo" className="forgot-logo" />
          </div>

          <h2>Contact Support</h2>
          <p className="subtitle">Need help? Send us a message and we'll get back to you</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <User className="input-icon" size={20} />
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <MessageSquare className="input-icon" size={20} />
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
                style={{ paddingLeft: '44px' }}
              >
                <option value="general">General Inquiry</option>
                <option value="password-reset">Password Reset Issue</option>
                <option value="account-access">Account Access Problem</option>
                <option value="technical-issue">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="input-group">
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                disabled={loading}
                style={{ paddingLeft: '14px' }}
              />
            </div>

            <div className="input-group">
              <textarea
                name="message"
                placeholder="Describe your issue or question..."
                value={formData.message}
                onChange={handleChange}
                disabled={loading}
                rows={5}
                style={{ paddingLeft: '14px', paddingTop: '14px' }}
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <Link to="/login" className="back-link">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
