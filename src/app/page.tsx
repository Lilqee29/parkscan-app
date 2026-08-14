'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { gsap } from 'gsap';

const ParkingMap = dynamic(() => import('@/components/ParkingMap'), { ssr: false });
const CameraView = dynamic(() => import('@/components/CameraView'), { ssr: false });

type Tab = 'scan' | 'map' | 'history' | 'settings';
type PrimaryTab = 'scan' | 'map';
type HistoryEntry = { text: string; status: string; timestamp: number };

// ─── Haptic Feedback Helper ──────────────────────────────────────────────────

function triggerHaptic(duration = 10) {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    const enabled = localStorage.getItem('parkscan_haptic_enabled') !== 'false';
    if (enabled) {
      try { navigator.vibrate(duration); } catch {}
    }
  }
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconScan({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  );
}

function IconMap({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}

function IconHistory({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"/>
      <path fillRule="evenodd" d="M9.293 2.293A1 1 0 0110 2h4a1 1 0 01.707.293L16.414 4H19a3 3 0 013 3v11a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h2.586l1.707-1.707zM12 7a5 5 0 100 10A5 5 0 0012 7z" clipRule="evenodd"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconEye({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        triggerHaptic(8);
        onChange(!checked);
      }}
      style={{
        width: '46px',
        height: '26px',
        borderRadius: '13px',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        flexShrink: 0,
        outline: 'none',
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: checked ? '#000' : '#fff',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// ─── Bottom Sheet Wrapper ─────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      gsap.fromTo(panelRef.current, { y: '100%' }, { y: '0%', duration: 0.35, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [open]);

  const handleClose = useCallback(() => {
    triggerHaptic(8);
    gsap.to(panelRef.current, {
      y: '100%', duration: 0.25, ease: 'power3.in',
      onComplete: onClose,
    });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div ref={overlayRef} className="sheet-overlay" onClick={handleClose} />
      <div ref={panelRef} className="sheet-panel">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <span className="text-subheading">{title}</span>
          <button className="btn-glass" onClick={handleClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ─── History Sheet ────────────────────────────────────────────────────────────

function HistorySheet({
  open,
  onClose,
  history,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onClear: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll('.history-item');
    gsap.fromTo(items,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, delay: 0.15, ease: 'power2.out' }
    );
  }, [open, history]);

  const statusColor = (s: string) =>
    s === 'yes' ? 'var(--accent)' : s === 'no' ? 'var(--danger)' : 'var(--warning)';

  const statusIcon = (s: string) =>
    s === 'yes' ? '/assets/Create_success_icon_for_app_202608142329.jpeg'
    : s === 'no' ? '/assets/Create_danger_icon_for_app_202608142333.jpeg'
    : '/assets/Warning_icon_for_app_2K_202608142330.jpeg';

  return (
    <BottomSheet open={open} onClose={onClose} title="Scan History">
      <div ref={listRef} className="sheet-body">
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>📋</div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dim)' }}>No scans saved yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-muted)' }}>
              Point your camera at a parking sign to analyze it!
            </p>
          </div>
        ) : (
          history.map((entry, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                className="history-item"
                onClick={() => {
                  triggerHaptic(5);
                  setExpandedIndex(isExpanded ? null : i);
                }}
                style={{ marginBottom: '10px', cursor: 'pointer' }}
              >
                <Image
                  src={statusIcon(entry.status)}
                  alt={entry.status}
                  width={38}
                  height={38}
                  style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                  unoptimized
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <p style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: statusColor(entry.status),
                    }}>
                      {entry.status === 'yes' ? '✅ Parking Autorisé'
                        : entry.status === 'no' ? '❌ Parking Interdit'
                        : '❓ Résultat Incertain'}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-dim)',
                    lineHeight: 1.5,
                    overflow: isExpanded ? 'visible' : 'hidden',
                    textOverflow: isExpanded ? 'clip' : 'ellipsis',
                    whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                  }}>
                    {entry.text}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {new Date(entry.timestamp).toLocaleDateString('fr-FR')} {isExpanded ? '• Tap to collapse' : '• Tap to expand'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {history.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn-danger"
              onClick={() => {
                triggerHaptic(15);
                onClear();
              }}
            >
              Clear Scan History
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ─── Settings Sheet ───────────────────────────────────────────────────────────

function SettingsSheet({
  open,
  onClose,
  apiKey,
  envKey,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  envKey: string;
  onSave: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const hasEnv = Boolean(envKey);

  // Settings State
  const [geoEnabled, setGeoEnabled] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('parkscan_geo_enabled') !== 'false' : true
  );
  const [pushEnabled, setPushEnabled] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('parkscan_push_enabled') !== 'false' : true
  );
  const [hapticEnabled, setHapticEnabled] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('parkscan_haptic_enabled') !== 'false' : true
  );
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod/.test(navigator.userAgent);
  });
  const [isStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
  });

  const handleSaveKey = () => {
    triggerHaptic(12);
    const v = inputRef.current?.value.trim() || '';
    if (v) {
      onSave(v);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleToggleGeo = (val: boolean) => {
    setGeoEnabled(val);
    localStorage.setItem('parkscan_geo_enabled', String(val));
  };

  const handleTogglePush = async (val: boolean) => {
    setPushEnabled(val);
    localStorage.setItem('parkscan_push_enabled', String(val));

    if (val && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      setNotificationPermission(p);
    }
  };

  const handleToggleHaptic = (val: boolean) => {
    setHapticEnabled(val);
    localStorage.setItem('parkscan_haptic_enabled', String(val));
  };

  const handleTestNotification = async () => {
    triggerHaptic(20);

    if (!('Notification' in window)) {
      alert('Notifications are not supported by this browser.');
      return;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('🅿️ ParkScan Test Alert', {
          body: 'Push notifications are active and working perfectly in background!',
          icon: '/assets/parkscan_icon.jpeg',
          badge: '/assets/parkscan_icon.jpeg',
          data: { url: '/' },
          tag: 'test-notification',
          ...({ vibrate: [200, 100, 200, 100, 300] } as Record<string, unknown>),
        });
      } else {
        new Notification('🅿️ ParkScan Test Alert', {
          body: 'Push notifications are active and working!',
          icon: '/assets/parkscan_icon.jpeg',
        });
      }
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 2500);
    } else {
      alert('Notification permission was denied. Please enable notifications in your browser/device settings.');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="sheet-body">

        {/* API Key Section */}
        <div className="settings-section">
          <p className="settings-label">Gemini API Key</p>

          {hasEnv ? (
            <div className="settings-row">
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
                  API Key Active
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Loaded from system environment
                </p>
              </div>
              <span className="pill pill-green">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                Active
              </span>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  defaultValue={apiKey}
                  placeholder="Paste your Gemini API key…"
                  className="input-field"
                  style={{ paddingRight: '44px' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px',
                  }}
                  aria-label="Toggle password visibility"
                >
                  <IconEye open={showPassword} />
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Get a free key at{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                >
                  aistudio.google.com
                </a>
              </p>
              <button className="btn-primary" onClick={handleSaveKey}>
                {saveToast ? '✓ Saved Successfully!' : 'Save API Key'}
              </button>
            </div>
          )}
        </div>

        {/* Permissions & Access Control */}
        <div className="settings-section">
          <p className="settings-label">Permissions & Access Control</p>

          {/* Location Access */}
          <div className="settings-row">
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
                📍 GPS Location Access
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Find paid zones around your current location
              </p>
            </div>
            <ToggleSwitch checked={geoEnabled} onChange={handleToggleGeo} />
          </div>

          {/* Push Notifications */}
          <div className="settings-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  🔔 Push Notifications
                </p>
                <span className={`pill ${notificationPermission === 'granted' ? 'pill-green' : notificationPermission === 'denied' ? 'pill-red' : 'pill-yellow'}`}>
                  {notificationPermission}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Background alerts when entering paid parking zones
              </p>
            </div>
            <ToggleSwitch checked={pushEnabled} onChange={handleTogglePush} />
          </div>

          {/* Haptic Vibrations */}
          <div className="settings-row">
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '2px' }}>
                📳 Haptic Vibration
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tactile feedback on button presses and zone alerts
              </p>
            </div>
            <ToggleSwitch checked={hapticEnabled} onChange={handleToggleHaptic} />
          </div>

          {/* Test Notification Button */}
          <div style={{ marginTop: '12px' }}>
            <button
              className="btn-ghost"
              style={{ width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600 }}
              onClick={handleTestNotification}
            >
              {testSuccess ? '🔔 Notification Sent!' : '🧪 Send Test Push Notification'}
            </button>
          </div>
        </div>

        {/* iOS Push Compatibility Note */}
        {isIOS && !isStandalone && (
          <div style={{
            padding: '14px 16px',
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8rem',
            color: 'var(--info)',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}>
            📱 <strong>iPhone Push Setup:</strong> To receive background push alerts on iOS, tap Safari Share button ➔ <strong>&quot;Add to Home Screen&quot;</strong> and open ParkScan from your home screen!
          </div>
        )}

        {/* App Info */}
        <div className="settings-section">
          <p className="settings-label">App Info</p>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>Version</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>1.2.0</span>
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>AI Engine</span>
            <span className="pill pill-dim">Gemini 2.0 Flash</span>
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>City</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>🇫🇷 Rennes, France</span>
          </div>
          <div className="settings-row">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>PWA Mode</span>
            <span className={`pill ${isStandalone ? 'pill-green' : 'pill-dim'}`}>
              {isStandalone ? 'Installed App' : 'Browser Web'}
            </span>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────

function WelcomeModal({
  onDismiss,
  onSave,
  onRequestPermissions,
}: {
  onDismiss: () => void;
  onSave: (k: string) => void;
  onRequestPermissions: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.5)', delay: 0.1 }
    );
  }, []);

  const handleStart = () => {
    triggerHaptic(12);
    onRequestPermissions();
    const k = inputRef.current?.value.trim() || '';
    if (k) onSave(k);
    else onDismiss();
  };

  return (
    <div className="welcome-modal">
      <div ref={cardRef} className="welcome-card">
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <Image
            src="/assets/parkscan_icon.jpeg"
            alt="ParkScan"
            width={80}
            height={80}
            style={{ borderRadius: '22px', boxShadow: '0 0 40px rgba(34,197,94,0.3)' }}
            unoptimized
          />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Welcome to ParkScan
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
          AI-powered parking sign reader &amp; live paid zone map for Rennes.<br />
          Enter your Gemini API key to get started.
        </p>

        <input
          ref={inputRef}
          type="password"
          placeholder="Paste your Gemini API key…"
          className="input-field"
          style={{ marginBottom: '12px' }}
          autoComplete="off"
        />
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            aistudio.google.com
          </a>
        </p>

        <button
          className="btn-primary"
          style={{ marginBottom: '10px' }}
          onClick={handleStart}
        >
          Enable Permissions &amp; Start 🚀
        </button>
        <button
          onClick={() => {
            triggerHaptic(5);
            onRequestPermissions();
            onDismiss();
          }}
          style={{
            width: '100%', padding: '10px', background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          Skip for now (browse map)
        </button>
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('scan');
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('parkscan_api_key') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    const effective = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('parkscan_api_key') || '';
    return !effective;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('parkscan_history') || '[]');
    } catch {
      return [];
    }
  });
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Request All Permissions Helper ──────────────────────────────────────────
  const requestAllPermissions = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 1. Push Notification Permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    // 2. Geolocation Permission
    if ('geolocation' in navigator) {
      const geoEnabled = localStorage.getItem('parkscan_geo_enabled') !== 'false';
      if (geoEnabled) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          console.error,
          { enableHighAccuracy: true }
        );
      }
    }
  }, []);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (apiKey) {
      requestAllPermissions();
    }

    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Header & nav entrance
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 }
    );
    gsap.fromTo(navRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.2 }
    );
  }, [apiKey, requestAllPermissions]);

  const saveApiKey = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem('parkscan_api_key', key);
    setShowWelcome(false);
    setShowSettings(false);
    setActiveTab('scan');
    setPrimaryTab('scan');
    requestAllPermissions();
  }, [requestAllPermissions]);

  const addScanResult = useCallback((text: string, status: string) => {
    const entry = { text, status, timestamp: Date.now() };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem('parkscan_history', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Tab Switching Logic ──────────────────────────────────────────────────────
  const switchTab = (tab: Tab) => {
    triggerHaptic(8);

    if (tab === 'history') {
      setShowHistory(true);
      setShowSettings(false);
      setActiveTab('history');
      return;
    }

    if (tab === 'settings') {
      setShowSettings(true);
      setShowHistory(false);
      setActiveTab('settings');
      return;
    }

    // Switching to Scan or Map
    setShowHistory(false);
    setShowSettings(false);
    setActiveTab(tab);
    setPrimaryTab(tab);

    // Smooth content transition
    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0.4, scale: 0.99 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  };

  const handleScanClick = () => {
    triggerHaptic(12);
    setShowHistory(false);
    setShowSettings(false);

    const effective = apiKey || (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
    if (!effective) {
      setShowSettings(true);
      setActiveTab('settings');
    } else {
      setActiveTab('scan');
      setPrimaryTab('scan');
    }
  };

  const handleCloseSheet = () => {
    setShowHistory(false);
    setShowSettings(false);
    setActiveTab(primaryTab);
  };

  const effectiveKey = apiKey || (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

  return (
    <div style={{ position: 'relative', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <header
        ref={headerRef}
        className="top-bar"
        style={{ opacity: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image
            src="/assets/parkscan_logo.jpeg"
            alt="ParkScan logo"
            width={28}
            height={28}
            style={{ borderRadius: '7px', objectFit: 'cover' }}
            unoptimized
          />
          <span className="text-logo">ParkScan</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {primaryTab === 'map' && activeTab !== 'history' && activeTab !== 'settings' && (
            <span className="pill pill-green">
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              Live Map
            </span>
          )}
          {effectiveKey && (
            <span className="pill pill-dim">AI Ready</span>
          )}
        </div>
      </header>

      {/* ── Main Content View ── */}
      <div
        ref={contentRef}
        style={{ position: 'absolute', inset: 0, paddingBottom: 'var(--bottom-nav-h)' }}
      >
        {/* Render CameraView when scan is active */}
        {primaryTab === 'scan' && activeTab !== 'history' && activeTab !== 'settings' && (
          <CameraView apiKey={effectiveKey} onScanResult={addScanResult} />
        )}

        {/* Render ParkingMap when map is active */}
        {primaryTab === 'map' && activeTab !== 'history' && activeTab !== 'settings' && (
          <ParkingMap userPosition={userPosition} />
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav ref={navRef} className="bottom-nav" style={{ opacity: 0 }}>
        <button
          className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => switchTab('scan')}
          aria-label="Scan"
        >
          <IconScan active={activeTab === 'scan'} />
          <span className="nav-label">Scan</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => switchTab('map')}
          aria-label="Map"
        >
          <IconMap active={activeTab === 'map'} />
          <span className="nav-label">Map</span>
        </button>

        {/* Center Scan FAB */}
        <button
          className="nav-scan-btn animate-glow"
          onClick={handleScanClick}
          aria-label="Scan parking sign"
        >
          <IconCamera />
        </button>

        <button
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => switchTab('history')}
          aria-label="History"
        >
          <IconHistory active={activeTab === 'history'} />
          <span className="nav-label">History</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => switchTab('settings')}
          aria-label="Settings"
        >
          <IconSettings active={activeTab === 'settings'} />
          <span className="nav-label">Settings</span>
        </button>
      </nav>

      {/* ── Bottom Sheets ── */}
      <HistorySheet
        open={showHistory}
        onClose={handleCloseSheet}
        history={history}
        onClear={() => {
          setHistory([]);
          localStorage.removeItem('parkscan_history');
        }}
      />

      <SettingsSheet
        open={showSettings}
        onClose={handleCloseSheet}
        apiKey={apiKey}
        envKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''}
        onSave={saveApiKey}
      />

      {/* ── Welcome Modal ── */}
      {showWelcome && (
        <WelcomeModal
          onDismiss={() => setShowWelcome(false)}
          onSave={saveApiKey}
          onRequestPermissions={requestAllPermissions}
        />
      )}
    </div>
  );
}
