import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ShieldCheck, ShieldX, QrCode, AlertTriangle } from 'lucide-react';
import './QRScanner.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function QRScanner() {
  const [scanning, setScanning]   = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const startScanner = async () => {
    setError(''); setResult(null);
    try {
      html5QrRef.current = new Html5Qrcode('qr-reader');
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner();
          handleQRResult(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setError('Camera access denied or not available');
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  const handleQRResult = async (text) => {
    // Extract token from URL or use raw text
    const parts = text.split('/');
    const qrToken = parts[parts.length - 1];
    await verifyToken(qrToken);
  };

  const verifyToken = async (qrToken) => {
    if (!qrToken?.trim()) return;
    setResult({ loading: true });
    try {
      const res  = await fetch(`${BASE}/security/verify-trip/${qrToken.trim()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setResult({ ...data, loading: false });
    } catch (err) {
      setResult({ status: 'denied', message: 'Failed to verify — check connection', loading: false });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    verifyToken(manualToken);
  };

  return (
    <div className="qr-scanner-page">
      <div className="gate-page-header">
        <h2>QR Code Scanner</h2>
        <p>Scan driver's trip QR code to verify authorization</p>
      </div>

      <div className="qr-layout">
        {/* Scanner */}
        <div className="qr-scanner-card">
          <div className="qr-scanner-header">
            <QrCode size={20} color="#16a34a" />
            <span>Camera Scanner</span>
          </div>

          {/* QR reader container */}
          <div id="qr-reader" className="qr-reader-box" />

          <div className="qr-scanner-actions">
            {!scanning ? (
              <button className="qr-btn start" onClick={startScanner}>
                📷 Start Scanner
              </button>
            ) : (
              <button className="qr-btn stop" onClick={stopScanner}>
                ⏹ Stop Scanner
              </button>
            )}
          </div>

          {error && <div className="qr-error">{error}</div>}

          {/* Manual token entry */}
          <div className="qr-manual">
            <p>Or enter token manually:</p>
            <form onSubmit={handleManualSubmit} className="qr-manual-form">
              <input
                type="text"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                placeholder="Paste QR token here..."
                className="qr-manual-input"
              />
              <button type="submit" className="qr-btn verify">Verify</button>
            </form>
          </div>
        </div>

        {/* Result */}
        <div className="qr-result-panel">
          {!result && (
            <div className="qr-waiting">
              <QrCode size={64} color="#d1d5db" />
              <p>Scan a QR code to see trip details</p>
            </div>
          )}

          {result?.loading && (
            <div className="qr-waiting">
              <div className="qr-spinner" />
              <p>Verifying...</p>
            </div>
          )}

          {result && !result.loading && (
            <div className={`qr-result-card ${result.status}`}>
              <div className="qr-result-header">
                {result.status === 'approved'
                  ? <ShieldCheck size={40} color="#16a34a" />
                  : <ShieldX size={40} color="#dc2626" />
                }
                <div>
                  <div className={`qr-result-status ${result.status}`}>
                    {result.status === 'approved' ? '✅ ACCESS GRANTED' : '❌ ACCESS DENIED'}
                  </div>
                  <div className="qr-result-message">{result.message}</div>
                </div>
              </div>

              {result.isLate && (
                <div className="qr-late-warning">
                  <AlertTriangle size={16} /> Vehicle is LATE — flag for transport officer
                </div>
              )}

              {result.trip && (
                <div className="qr-trip-details">
                  {[
                    ['Destination',  result.trip.destination],
                    ['Date',         result.trip.date],
                    ['Vehicle',      result.trip.assignedVehicle],
                    ['Driver',       result.trip.assignedDriver || '—'],
                    ['Requester',    result.trip.requester],
                    ['Department',   result.trip.department || '—'],
                    ['Passengers',   result.trip.passengers || '—'],
                    ['Purpose',      result.trip.purpose || '—'],
                    ['Approved By',  result.trip.approvedBy || '—'],
                  ].map(([l, v]) => (
                    <div key={l} className="qr-detail-row">
                      <span className="qr-detail-label">{l}</span>
                      <span className="qr-detail-value">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="qr-scan-again" onClick={() => { setResult(null); setManualToken(''); }}>
                Scan Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
