import { useState, useEffect } from 'react';
import { QrCode, Download, RefreshCw } from 'lucide-react';
import './TripQRCode.css';
import API_BASE_URL from '../../config.js';

const BASE = API_BASE_URL;
const token = () => localStorage.getItem('token');

export default function TripQRCode({ tripId, tripStatus, destination, date }) {
  const [qrData, setQrData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchQR = async () => {
    if (!tripId || tripStatus !== 'approved') return;
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${BASE}/requests/${tripId}/qr`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setQrData(data);
    } catch (err) {
      setError(err.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQR(); }, [tripId, tripStatus]);

  const downloadQR = () => {
    if (!qrData?.qrCode) return;
    const a = document.createElement('a');
    a.href = qrData.qrCode;
    a.download = `trip-qr-${destination?.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  if (tripStatus !== 'approved') return null;

  return (
    <div className="trip-qr-card">
      <div className="trip-qr-header">
        <QrCode size={20} color="#16a34a" />
        <span>Trip Authorization QR</span>
      </div>

      {loading && (
        <div className="trip-qr-loading">
          <RefreshCw size={24} className="spin" />
          <p>Generating QR code...</p>
        </div>
      )}

      {error && (
        <div className="trip-qr-error">{error}</div>
      )}

      {qrData && !loading && (
        <>
          <div className="trip-qr-image-wrap">
            <img src={qrData.qrCode} alt="Trip QR Code" className="trip-qr-image" />
          </div>
          <div className="trip-qr-info">
            <p>Show this QR code to the gate security officer</p>
            <div className="trip-qr-details">
              <span>📍 {destination}</span>
              <span>📅 {date}</span>
            </div>
          </div>
          <button className="trip-qr-download" onClick={downloadQR}>
            <Download size={16} /> Download QR
          </button>
        </>
      )}
    </div>
  );
}
