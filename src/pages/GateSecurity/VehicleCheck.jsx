import { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldX, Search, LogIn, LogOut, Camera, CameraOff, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import './VehicleCheck.css';

const BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;
const ALPR  = 'http://localhost:5001';
const token = () => localStorage.getItem('token');

export default function VehicleCheck() {
  const [plate, setPlate]           = useState('');
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Local camera
  const [cameraOn, setCameraOn]     = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [alprOnline, setAlprOnline] = useState(false);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // External camera
  const [extUrl, setExtUrl]         = useState('');
  const [extConnected, setExtConnected] = useState(false);
  const [extScanning, setExtScanning]   = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check ALPR service health
  useEffect(() => {
    fetch(`${ALPR}/health`).then(r => r.ok && setAlprOnline(true)).catch(() => setAlprOnline(false));
  }, []);

  // Start local camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      showToast('Camera access denied. Check browser permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  // Capture frame and send to ALPR
  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width  = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      const res  = await fetch(`${ALPR}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (data.best) {
        setPlate(data.best);
        showToast(`Plate detected: ${data.best}`, 'success');
        // Auto-verify
        await verifyPlate(data.best);
      } else {
        showToast('No plate detected. Try again.', 'error');
      }
    } catch (err) {
      showToast('ALPR service unavailable', 'error');
    } finally {
      setScanning(false);
    }
  }, []);

  // Connect external camera
  const connectExternal = async () => {
    if (!extUrl.trim()) { showToast('Enter camera URL', 'error'); return; }
    try {
      const res  = await fetch(`${ALPR}/stream/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extUrl }),
      });
      const data = await res.json();
      if (data.success) { setExtConnected(true); showToast('External camera connected!'); }
      else showToast(data.error || 'Failed to connect', 'error');
    } catch { showToast('ALPR service unavailable', 'error'); }
  };

  const disconnectExternal = async () => {
    await fetch(`${ALPR}/stream/disconnect`, { method: 'POST' }).catch(() => {});
    setExtConnected(false);
    showToast('External camera disconnected');
  };

  const detectFromExternal = async () => {
    setExtScanning(true);
    try {
      const res  = await fetch(`${ALPR}/stream/detect`);
      const data = await res.json();
      if (data.best) {
        setPlate(data.best);
        showToast(`Plate detected: ${data.best}`, 'success');
        await verifyPlate(data.best);
      } else {
        showToast('No plate detected from stream', 'error');
      }
    } catch { showToast('Failed to detect from stream', 'error'); }
    finally { setExtScanning(false); }
  };

  // Verify plate against DB
  const verifyPlate = async (p) => {
    const plateToCheck = p || plate;
    if (!plateToCheck.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res  = await fetch(`${BASE}/security/verify/${plateToCheck.trim()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setResult(data);
    } catch { showToast('Failed to verify vehicle', 'error'); }
    finally { setLoading(false); }
  };

  const handleManualVerify = (e) => { e.preventDefault(); verifyPlate(); };

  const handleCheckin = async () => {
    setActionLoading('in');
    try {
      const res  = await fetch(`${BASE}/security/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          plateNumber: result.plateNumber,
          driverName:  result.trip?.assignedDriver || '',
          vehicleModel: result.vehicle?.model || '',
          tripId: result.trip?._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Check-in recorded!');
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleCheckout = async () => {
    setActionLoading('out');
    try {
      const res  = await fetch(`${BASE}/security/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ plateNumber: result.plateNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Check-out recorded!');
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="vehicle-check-page">
      {toast && <div className={`gate-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="gate-page-header">
        <h2>Vehicle Check</h2>
        <p>Verify vehicle authorization via camera or manual entry</p>
      </div>

      {/* ALPR Status */}
      <div className={`vc-alpr-status ${alprOnline ? 'online' : 'offline'}`}>
        {alprOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>ALPR Service: {alprOnline ? 'Online' : 'Offline — start alpr-service/app.py'}</span>
      </div>

      <div className="vc-layout">
        {/* Left: Camera panels */}
        <div className="vc-cameras">

          {/* Local Camera */}
          <div className="vc-camera-card">
            <div className="vc-camera-header">
              <span>📷 Local Camera</span>
              <button className={`vc-cam-toggle ${cameraOn ? 'stop' : 'start'}`} onClick={cameraOn ? stopCamera : startCamera}>
                {cameraOn ? <><CameraOff size={16} /> Stop</> : <><Camera size={16} /> Start</>}
              </button>
            </div>

            <div className="vc-video-wrap">
              {cameraOn
                ? <video ref={videoRef} autoPlay playsInline muted className="vc-video" />
                : <div className="vc-video-placeholder"><Camera size={40} /><p>Camera off</p></div>
              }
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {cameraOn && (
              <button className="vc-scan-btn" onClick={captureAndDetect} disabled={scanning || !alprOnline}>
                {scanning ? <><RefreshCw size={16} className="spin" /> Scanning...</> : '🔍 Scan Plate'}
              </button>
            )}
          </div>

          {/* External Camera */}
          <div className="vc-camera-card">
            <div className="vc-camera-header">
              <span>🌐 External Camera</span>
              <span className={`vc-ext-dot ${extConnected ? 'connected' : ''}`} />
            </div>

            <div className="vc-ext-input-row">
              <input
                type="text"
                value={extUrl}
                onChange={e => setExtUrl(e.target.value)}
                placeholder="http://192.168.x.x/snapshot.jpg"
                className="vc-ext-input"
                disabled={extConnected}
              />
              {extConnected
                ? <button className="vc-ext-btn disconnect" onClick={disconnectExternal}>Disconnect</button>
                : <button className="vc-ext-btn connect" onClick={connectExternal} disabled={!alprOnline}>Connect</button>
              }
            </div>

            {extConnected && (
              <>
                <div className="vc-ext-preview">
                  <img src={extUrl} alt="External feed" className="vc-ext-img"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <button className="vc-scan-btn" onClick={detectFromExternal} disabled={extScanning || !alprOnline}>
                  {extScanning ? <><RefreshCw size={16} className="spin" /> Scanning...</> : '🔍 Detect from Stream'}
                </button>
              </>
            )}

            {!extConnected && (
              <div className="vc-ext-hint">
                <p>Enter your IP camera snapshot URL and click Connect.</p>
                <p>Supports: MJPEG snapshot, IP webcam apps</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Manual + Result */}
        <div className="vc-right">
          {/* Manual Search */}
          <div className="vc-search-card">
            <h4>Manual Entry</h4>
            <form onSubmit={handleManualVerify} className="vc-search-form">
              <div className="vc-search-input-wrap">
                <Search size={20} className="vc-search-icon" />
                <input
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. AA-12345"
                  className="vc-search-input"
                />
              </div>
              <button type="submit" className="vc-search-btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (
            <div className={`vc-result-card ${result.status}`}>
              <div className="vc-result-header">
                {result.authorized
                  ? <><ShieldCheck size={28} color="#16a34a" /><span className="vc-result-title authorized">AUTHORIZED</span></>
                  : result.status === 'pending'
                    ? <><ShieldX size={28} color="#f59e0b" /><span className="vc-result-title pending">PENDING APPROVAL</span></>
                    : result.status === 'rejected'
                      ? <><ShieldX size={28} color="#dc2626" /><span className="vc-result-title unauthorized">REJECTED</span></>
                      : result.status === 'completed'
                        ? <><ShieldCheck size={28} color="#6b7280" /><span className="vc-result-title completed">TRIP COMPLETED</span></>
                        : <><ShieldX size={28} color="#dc2626" /><span className="vc-result-title unauthorized">UNAUTHORIZED</span></>
                }
                <span className="vc-result-plate">{result.plateNumber}</span>
              </div>

              {/* Status Banner */}
              <div className={`vc-status-banner ${result.status}`}>
                {result.status === 'authorized'   && '✅ Trip approved by Transport Officer — Entry allowed'}
                {result.status === 'pending'      && '⏳ Waiting for Transport Officer approval — Do not allow entry'}
                {result.status === 'rejected'     && `❌ Trip rejected — Entry denied${result.trip?.rejectionReason ? ': ' + result.trip.rejectionReason : ''}`}
                {result.status === 'completed'    && '✔ Trip already completed today'}
                {result.status === 'no-trip'      && '⚠ No trip scheduled for this vehicle today'}
                {result.status === 'unauthorized' && '🚫 Vehicle not registered in system'}
              </div>

              {result.insideCampus && (
                <div className="vc-inside-badge">🟢 Currently inside campus</div>
              )}

              {/* Scheduled upcoming trip */}
              {result.scheduledTrip && (
                <div className="vc-info-section">
                  <div className="vc-section-title">📅 Upcoming Scheduled Trip</div>
                  <div className="vc-detail-grid">
                    {[
                      ['Date',        result.scheduledTrip.date],
                      ['Destination', result.scheduledTrip.destination],
                      ['Driver',      result.scheduledTrip.assignedDriver || '—'],
                      ['Status',      result.scheduledTrip.status],
                    ].map(([l, v]) => (
                      <div key={l} className="vc-detail-item">
                        <span className="vc-detail-label">{l}</span>
                        <span className="vc-detail-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Info */}
              {result.vehicle && (
                <div className="vc-info-section">
                  <div className="vc-section-title">🚗 Vehicle Information</div>
                  <div className="vc-detail-grid">
                    {[
                      ['Plate',       result.vehicle.plateNumber],
                      ['Model',       result.vehicle.model],
                      ['Type',        result.vehicle.type],
                      ['Capacity',    result.vehicle.capacity ? `${result.vehicle.capacity} seats` : '—'],
                      ['Fuel Type',   result.vehicle.fuelType || '—'],
                      ['Fuel Level',  result.vehicle.fuelLevel != null ? `${result.vehicle.fuelLevel}%` : '—'],
                      ['Mileage',     result.vehicle.mileage ? `${result.vehicle.mileage} km` : '—'],
                      ['Status',      result.vehicle.status],
                    ].map(([l, v]) => (
                      <div key={l} className="vc-detail-item">
                        <span className="vc-detail-label">{l}</span>
                        <span className="vc-detail-value">{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {result.driver && (
                <div className="vc-info-section">
                  <div className="vc-section-title">👤 Assigned Driver</div>
                  <div className="vc-detail-grid">
                    {[
                      ['Name',          result.driver.name],
                      ['Phone',         result.driver.phone || '—'],
                      ['License No.',   result.driver.licenseNumber || '—'],
                      ['License Expiry',result.driver.licenseExpiry || '—'],
                      ['Status',        result.driver.status],
                      ['Rating',        result.driver.rating ? `${result.driver.rating}/5` : '—'],
                      ['Total Trips',   result.driver.totalTrips ?? '—'],
                    ].map(([l, v]) => (
                      <div key={l} className="vc-detail-item">
                        <span className="vc-detail-label">{l}</span>
                        <span className="vc-detail-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Trip */}
              {result.trip && (
                <div className="vc-info-section">
                  <div className="vc-section-title">📋 Today's Trip</div>
                  <div className="vc-detail-grid">
                    {[
                      ['Destination',  result.trip.destination],
                      ['Date',         result.trip.date],
                      ['Driver',       result.trip.assignedDriver || '—'],
                      ['Requester',    result.trip.requester || '—'],
                      ['Department',   result.trip.department || '—'],
                      ['Passengers',   result.trip.passengers || '—'],
                      ['Purpose',      result.trip.purpose || '—'],
                      ['Status',       result.trip.status],
                    ].map(([l, v]) => (
                      <div key={l} className="vc-detail-item">
                        <span className="vc-detail-label">{l}</span>
                        <span className="vc-detail-value">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trip History */}
              {result.tripHistory?.length > 0 && (
                <div className="vc-info-section">
                  <div className="vc-section-title">🕐 Recent Trip History</div>
                  {result.tripHistory.map((t, i) => (
                    <div key={i} className="vc-history-item">
                      <span className="vc-history-dest">{t.destination}</span>
                      <span className="vc-history-date">{t.date}</span>
                      <span className={`vc-history-status ${t.status}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Last Gate Activity */}
              {result.lastGateActivity && (
                <div className="vc-last-activity">
                  Last gate activity: <strong>{result.lastGateActivity.direction}</strong> at {new Date(result.lastGateActivity.time).toLocaleString()} by {result.lastGateActivity.officer}
                </div>
              )}

              {result.authorized && (
                <div className="vc-actions">
                  <button className="vc-btn checkin" onClick={handleCheckin} disabled={actionLoading === 'in'}>
                    <LogIn size={18} /> {actionLoading === 'in' ? 'Recording...' : 'Check In'}
                  </button>
                  <button className="vc-btn checkout" onClick={handleCheckout} disabled={actionLoading === 'out'}>
                    <LogOut size={18} /> {actionLoading === 'out' ? 'Recording...' : 'Check Out'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
