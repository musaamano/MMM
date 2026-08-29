import { useEffect, useRef, useState } from 'react';
import { BellRing, X, Car, Fuel, Wrench, Info } from 'lucide-react';
import './NotificationAlerts.css';

const typeMeta = {
  trip: { icon: Car, accent: '#2563eb' },
  fuel: { icon: Fuel, accent: '#d97706' },
  maintenance: { icon: Wrench, accent: '#16a34a' },
  general: { icon: Info, accent: '#7c3aed' },
};

const MAX_VISIBLE = 3;
const AUTO_CLOSE_MS = 5500;
const AUTO_CLOSE_SECONDS = Math.ceil(AUTO_CLOSE_MS / 1000);

export default function NotificationAlerts({ notifications = [] }) {
  const [alerts, setAlerts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const timersRef = useRef({});
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);

  const ensureAudioContext = () => {
    const AudioContextCls = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCls) return null;
    if (!audioCtxRef.current) {
      const ctx = new AudioContextCls();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      compressor.knee.setValueAtTime(15, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.2, ctx.currentTime);

      const master = ctx.createGain();
      master.gain.setValueAtTime(1.25, ctx.currentTime);

      compressor.connect(master);
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = compressor;
    }
    return audioCtxRef.current;
  };

  const playAlertChime = () => {
    try {
      const ctx = ensureAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      // Gentle "beautiful bell" pattern (major arpeggio with shimmer)
      const notes = [
        { freq: 659.25, at: 0.0, dur: 0.24 },
        { freq: 830.61, at: 0.11, dur: 0.24 },
        { freq: 987.77, at: 0.22, dur: 0.3 },
        { freq: 1318.51, at: 0.34, dur: 0.34 },
      ];
      notes.forEach(({ freq, at, dur }) => {
        const start = now + at;
        const end = start + dur;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        // High volume alert profile
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        osc.connect(gain);
        gain.connect(masterGainRef.current || ctx.destination);
        osc.start(start);
        osc.stop(end);
      });
    } catch {
      // no-op if sound cannot be played in current browser policy
    }
  };

  useEffect(() => {
    notifications.forEach((n) => {
      if (n?._id) seenIdsRef.current.add(n._id);
    });
  }, []);

  useEffect(() => {
    // Browser policy: unlock audio only after user gesture.
    const unlockAudio = () => {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const incoming = [];
    for (const n of notifications) {
      if (!n?._id) continue;
      if (seenIdsRef.current.has(n._id)) continue;
      seenIdsRef.current.add(n._id);
      incoming.push(n);
    }

    if (incoming.length === 0) return;
    playAlertChime();

    setAlerts((prev) => {
      const next = [...incoming.reverse(), ...prev];
      return next.slice(0, MAX_VISIBLE);
    });

    incoming.forEach((n) => {
      timersRef.current[n._id] = setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a._id !== n._id));
        delete timersRef.current[n._id];
      }, AUTO_CLOSE_MS);
    });
  }, [notifications]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  const dismiss = (id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="notif-alert-stack" aria-live="polite" aria-atomic="true">
      {alerts.map((n) => {
        const meta = typeMeta[n.type] || typeMeta.general;
        const Icon = meta.icon || BellRing;
        return (
          <div className="notif-alert-card" key={n._id} style={{ '--notif-accent': meta.accent }}>
            <div className="notif-alert-glow" />
            <div className="notif-alert-progress" />
            <div className="notif-alert-icon-wrap">
              <Icon size={16} />
            </div>
            <div className="notif-alert-content">
              <div className="notif-alert-title-row">
                <span className="notif-alert-title">{n.title || 'New notification'}</span>
                <span className="notif-alert-duration">{AUTO_CLOSE_SECONDS}s</span>
                <button className="notif-alert-close" onClick={() => dismiss(n._id)} aria-label="Dismiss alert">
                  <X size={14} />
                </button>
              </div>
              <p className="notif-alert-message">{n.message || 'You have a new update.'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

