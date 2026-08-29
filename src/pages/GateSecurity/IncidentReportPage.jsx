import { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import './IncidentReportPage.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const ALPR  = 'http://localhost:5001';
const token = () => localStorage.getItem('token');

const INIT = { plateNumber: '', description: '', incidentType: 'unauthorized', severity: 'medium', image: null };

const SEV_STYLE = { low: { bg: '#dcfce7', color: '#166534' }, medium: { bg: '#fef3c7', color: '#92400e' }, high: { bg: '#fee2e2', color: '#991b1b' } };
const STATUS_STYLE = { open: { bg: '#fee2e2', color: '#991b1b' }, investigating: { bg: '#dbeafe', color: '#1e40af' }, resolved: { bg: '#dcfce7', color: '#166534' } };

export default function IncidentReportPage() {
  const [form, setForm] = useState(INIT);
  const [reports, setReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('submit');
  const [imgPreview, setImgPreview] = useState(null);
  const fileRef  = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const [cameraOn, setCameraOn]   = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = () => {
    fetch(`${BASE}/security/reports`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setReports(d); }).catch(console.error);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch { showToast('Camera access denied', 'error'); }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraOn(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCapturing(true);
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const b64 = canvas.toDataURL('image/jpeg', 0.85);
    setForm(p => ({ ...p, image: b64 }));
    setImgPreview(b64);
    stopCamera();
    setCapturing(false);
    showToast('Photo captured!');

    // Also try ALPR to auto-detect plate from captured image
    try {
      const res  = await fetch(`${ALPR}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 }),
      });
      const data = await res.json();
      if (data.best && !form.plateNumber) {
        setForm(p => ({ ...p, plateNumber: data.best }));
        showToast(`Plate auto-detected: ${data.best}`);
      }
    } catch { /* ALPR offline, no problem */ }
  };

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800; let { width, height } = img;
      if (width > MAX) { height = height * MAX / width; width = MAX; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const b64 = canvas.toDataURL('image/jpeg', 0.8);
      setForm(p => ({ ...p, image: b64 })); setImgPreview(b64);
    }; img.src = url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { showToast('Description required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/security/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Incident reported!');
      setForm(INIT); setImgPreview(null);
      fetchReports(); setTab('history');
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="incident-page">
      {toast && <div className={`gate-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="gate-page-header"><h2>Incident Reports</h2><p>Report and track security incidents</p></div>

      <div className="ir-tabs">
        <button className={`ir-tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Report Incident</button>
        <button className={`ir-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          History {reports.length > 0 && <span className="ir-count">{reports.length}</span>}
        </button>
      </div>

      {tab === 'submit' && (
        <div className="ir-form-card">
          <form onSubmit={handleSubmit}>
            <div className="ir-form-row">
              <div className="ir-form-group">
                <label>Plate Number</label>
                <input type="text" value={form.plateNumber} onChange={e => setForm(p => ({...p, plateNumber: e.target.value.toUpperCase()}))} placeholder="e.g. AA-12345" />
              </div>
              <div className="ir-form-group">
                <label>Incident Type</label>
                <select value={form.incidentType} onChange={e => setForm(p => ({...p, incidentType: e.target.value}))}>
                  <option value="unauthorized">Unauthorized Entry</option>
                  <option value="accident">Accident</option>
                  <option value="suspicious">Suspicious Activity</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="ir-form-group">
              <label>Severity</label>
              <div className="ir-severity-btns">
                {['low', 'medium', 'high'].map(s => (
                  <button key={s} type="button"
                    className={`ir-sev-btn ${form.severity === s ? 'selected' : ''}`}
                    style={form.severity === s ? { background: SEV_STYLE[s].bg, color: SEV_STYLE[s].color, borderColor: SEV_STYLE[s].color } : {}}
                    onClick={() => setForm(p => ({...p, severity: s}))}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="ir-form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} required rows={4} placeholder="Describe the incident in detail..." />
            </div>
            <div className="ir-form-group">
              <label>Evidence Image — Camera or Upload</label>

              {/* Camera capture */}
              <div className="ir-camera-row">
                {!cameraOn ? (
                  <button type="button" className="ir-cam-btn" onClick={startCamera}>
                    <Camera size={16} /> Use Camera
                  </button>
                ) : (
                  <>
                    <button type="button" className="ir-cam-btn capture" onClick={capturePhoto} disabled={capturing}>
                      {capturing ? <RefreshCw size={16} className="spin" /> : '📸'} Capture
                    </button>
                    <button type="button" className="ir-cam-btn stop" onClick={stopCamera}>
                      <CameraOff size={16} /> Stop
                    </button>
                  </>
                )}
                <button type="button" className="ir-cam-btn upload" onClick={() => fileRef.current.click()}>
                  📁 Upload File
                </button>
              </div>

              {/* Live camera preview */}
              {cameraOn && (
                <div className="ir-camera-preview">
                  <video ref={videoRef} autoPlay playsInline muted className="ir-camera-video" />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              )}

              {/* Captured/uploaded image preview */}
              {!cameraOn && (
                <div className="ir-img-upload" onClick={() => fileRef.current.click()}>
                  {imgPreview ? <img src={imgPreview} alt="evidence" className="ir-img-preview" /> : (
                    <div className="ir-img-placeholder"><span>📷</span><p>Click to upload image</p></div>
                  )}
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              {imgPreview && <button type="button" className="ir-remove-img" onClick={() => { setImgPreview(null); setForm(p => ({...p, image: null})); }}>✕ Remove</button>}
            </div>
            <button type="submit" className="ir-submit-btn" disabled={saving}>{saving ? 'Submitting...' : 'Submit Report'}</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {reports.length === 0 ? <div className="gate-empty">No incidents reported yet.</div>
            : reports.map(r => {
              const ss = SEV_STYLE[r.severity] || SEV_STYLE.medium;
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.open;
              return (
                <div key={r._id} className="ir-report-card">
                  <div className="ir-report-header">
                    <div>
                      <span className="ir-report-type">{r.incidentType?.replace('-', ' ')}</span>
                      {r.plateNumber && <span className="ir-report-plate">{r.plateNumber}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ background: ss.bg, color: ss.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{r.severity}</span>
                      <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                    </div>
                  </div>
                  <p className="ir-report-desc">{r.description}</p>
                  {r.image && <img src={r.image} alt="evidence" className="ir-evidence-thumb" onClick={() => window.open(r.image)} />}
                  <div className="ir-report-meta">By {r.reportedBy} · {new Date(r.createdAt).toLocaleString()}</div>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
