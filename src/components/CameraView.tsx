'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';

interface CameraViewProps {
  apiKey: string;
  onScanResult: (text: string, status: string) => void;
}

// ─── Upload Icon ──────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function IconFlash({ on }: { on: boolean }) {
  return on ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L11 22l8.91-10.96A1 1 0 0019 10h-6.5L13 2z"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L11 22l8.91-10.96A1 1 0 0019 10h-6.5L13 2z"/>
    </svg>
  );
}

// ─── AI Processing Loader ─────────────────────────────────────────────────────

function AILoader() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,8,16,0.85)',
      backdropFilter: 'blur(8px)',
      gap: '24px',
    }}>
      <Image
        src="/assets/Green_dots_AI_processing_indicator_202608142335.jpeg"
        alt="Processing"
        width={120}
        height={60}
        style={{ objectFit: 'contain', borderRadius: '30px' }}
        unoptimized
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>
          Reading sign…
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          AI is analyzing your parking sign
        </p>
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onClose,
}: {
  result: { text: string; status: string };
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 80, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.8)', delay: 0.05 }
    );
  }, []);

  const handleClose = () => {
    gsap.to(cardRef.current, { opacity: 0, y: 40, scale: 0.95, duration: 0.2, ease: 'power2.in' });
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, onComplete: onClose });
  };

  const isYes = result.status === 'yes';
  const isNo = result.status === 'no';
  const cardClass = isYes ? 'card-result-yes' : isNo ? 'card-result-no' : 'card-result-unknown';
  const iconSrc = isYes
    ? '/assets/Create_success_icon_for_app_202608142329.jpeg'
    : isNo
    ? '/assets/Create_danger_icon_for_app_202608142333.jpeg'
    : '/assets/Warning_icon_for_app_2K_202608142330.jpeg';
  const headline = isYes ? 'Vous pouvez parker ici' : isNo ? 'Parking interdit' : 'Réponse incertaine';
  const accentColor = isYes ? 'var(--accent)' : isNo ? 'var(--danger)' : 'var(--warning)';

  return (
    <>
      <div
        ref={backdropRef}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(8,8,16,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          zIndex: 10,
        }}
        onClick={handleClose}
      >
        <div
          ref={cardRef}
          className={cardClass}
          style={{ width: '100%', maxWidth: '360px', padding: '28px 24px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon + Close */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <Image
              src={iconSrc}
              alt={result.status}
              width={64}
              height={64}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
              unoptimized
            />
            <button
              onClick={handleClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em',
            color: accentColor, marginBottom: '12px',
          }}>
            {headline}
          </h2>

          {/* Full text */}
          <p style={{
            fontSize: '0.875rem', lineHeight: 1.65,
            color: 'var(--text-dim)',
            whiteSpace: 'pre-wrap',
            marginBottom: '16px',
          }}>
            {result.text}
          </p>

          {/* Timestamp + scan again */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '14px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {new Date().toLocaleString('fr-FR')}
            </span>
            <button
              onClick={handleClose}
              style={{
                padding: '6px 14px', borderRadius: '20px',
                border: `1px solid ${accentColor}`,
                background: 'transparent',
                color: accentColor,
                fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Scan again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Scanner Overlay ──────────────────────────────────────────────────────────

function ScannerOverlay() {
  const beamRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Frame entrance
    gsap.fromTo(frameRef.current,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
    );

    // Beam scan loop
    tlRef.current = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });
    tlRef.current
      .fromTo(beamRef.current,
        { top: '0%', opacity: 0 },
        { top: '2%', opacity: 1, duration: 0.15, ease: 'none' }
      )
      .to(beamRef.current, {
        top: '95%', duration: 1.8, ease: 'none',
      })
      .to(beamRef.current, { opacity: 0, duration: 0.15, ease: 'none' });

    return () => { tlRef.current?.kill(); };
  }, []);

  // Pulse the corners
  useEffect(() => {
    const corners = document.querySelectorAll('.scanner-corner');
    gsap.to(corners, {
      opacity: 0.4, duration: 1, ease: 'power2.inOut',
      yoyo: true, repeat: -1, stagger: 0.15,
    });
  }, []);

  return (
    <div className="scanner-frame" style={{ paddingBottom: 'calc(var(--bottom-nav-h) + 20px)' }}>
      {/* Neon frame from asset */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          ref={frameRef}
          className="scanner-target"
          style={{ opacity: 0 }}
        >
          {/* Neon scanning frame image overlay */}
          <Image
            src="/assets/Futuristic_camera_scanning_frame…_2K_202608142319.jpeg"
            alt=""
            fill
            style={{ objectFit: 'fill', opacity: 0.85, mixBlendMode: 'screen' }}
            unoptimized
            aria-hidden
          />
          {/* CSS corner accents */}
          <div className="scanner-corner tl" />
          <div className="scanner-corner tr" />
          <div className="scanner-corner bl" />
          <div className="scanner-corner br" />
          {/* Animated beam */}
          <div ref={beamRef} className="scanner-beam" />
        </div>

        <p style={{
          marginTop: '20px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}>
          Point at a parking sign
        </p>
      </div>
    </div>
  );
}

// ─── No Camera Fallback ───────────────────────────────────────────────────────

function NoCameraFallback({ onUpload }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    );
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', gap: '24px', padding: '40px 24px',
        textAlign: 'center', paddingBottom: 'calc(var(--bottom-nav-h) + 40px)',
        opacity: 0,
      }}
    >
      <Image
        src="/assets/Camera_app_button_asset_2K_202608142314.jpeg"
        alt="Camera"
        width={100}
        height={100}
        style={{ borderRadius: '24px', objectFit: 'cover', opacity: 0.8 }}
        unoptimized
      />
      <div>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Camera not available</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Upload a photo of a parking sign instead
        </p>
      </div>
      <label
        className="btn-primary"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          justifyContent: 'center', cursor: 'pointer',
          maxWidth: '280px', padding: '16px 32px',
        }}
      >
        <IconUpload />
        Upload Photo
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} style={{ display: 'none' }} />
      </label>
    </div>
  );
}

// ─── Main CameraView ──────────────────────────────────────────────────────────

export default function CameraView({ apiKey, onScanResult }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bottomControlsRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; status: string } | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [noCamera, setNoCamera] = useState(false);

  // ── Start Camera ────────────────────────────────────────────────────────────
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        localStream = mediaStream;
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setNoCamera(true);
      }
    }

    startCamera();

    // Bottom controls entrance
    gsap.fromTo(bottomControlsRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.3 }
    );

    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Capture Frame ───────────────────────────────────────────────────────────
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // ── Scan with Gemini ────────────────────────────────────────────────────────
  const handleScan = useCallback(async (imageBase64: string) => {
    if (!apiKey) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: 'Tu es un assistant parking expert à Rennes, France. Analyse ce panneau de stationnement. Réponds UNIQUEMENT avec:\n1. "OUI" ou "NON" (peut-on se garer?)\n2. Durée maximum (si applicable)\n3. Horaires (si applicable)\n4. Tarif (si applicable)\n5. Notes importantes\n\nSois concis et clair. En français.',
                },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } },
              ],
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
          }),
        }
      );

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      const cleaned = text.replace(/[*#_`~]/g, '').trim();
      const lower = cleaned.toLowerCase();
      const status =
        lower.startsWith('oui') || (lower.includes('oui') && !lower.includes('non'))
          ? 'yes'
          : lower.startsWith('non') || lower.includes('non')
          ? 'no'
          : 'unknown';

      setResult({ text: cleaned, status });
      onScanResult(cleaned, status);
    } catch (err) {
      setResult({
        text: `Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        status: 'unknown',
      });
    } finally {
      setLoading(false);
    }
  }, [apiKey, onScanResult]);

  // ── Upload Handler ──────────────────────────────────────────────────────────
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const r = ev.target?.result as string;
      if (r) handleScan(r);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  }, [handleScan]);

  // ── Scan Button Handler ─────────────────────────────────────────────────────
  const handleScanButton = useCallback(() => {
    const frame = captureFrame();
    if (frame) {
      // Flash effect on button press
      gsap.to(bottomControlsRef.current, {
        opacity: 0.3, duration: 0.08, yoyo: true, repeat: 1, ease: 'none',
      });
      handleScan(frame);
    }
  }, [captureFrame, handleScan]);

  // ── Flash Toggle ────────────────────────────────────────────────────────────
  const toggleFlash = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities?.torch) return;
    const newState = !flashOn;
    setFlashOn(newState);
    track.applyConstraints({ advanced: [{ torch: newState } as MediaTrackConstraintSet] });
  }, [flashOn]);

  // ── No API Key Warning ──────────────────────────────────────────────────────
  const noKeyWarning = !apiKey && (
    <div style={{
      position: 'absolute', top: 70, left: 16, right: 16, zIndex: 5,
      padding: '10px 16px',
      background: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 'var(--radius)',
      fontSize: '0.8rem',
      color: 'var(--warning)',
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      ⚠️ Add your API key in Settings to start scanning
    </div>
  );

  return (
    <div style={{ position: 'relative', height: '100%', background: '#000' }}>
      {/* Live video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Gradient vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,8,16,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* No API key banner */}
      {noKeyWarning}

      {/* No Camera fallback */}
      {noCamera && <NoCameraFallback onUpload={handleUpload} />}

      {/* Scanner overlay */}
      {!noCamera && !loading && !result && <ScannerOverlay />}

      {/* Loading overlay */}
      {loading && <AILoader />}

      {/* Result card */}
      {result && !loading && (
        <ResultCard result={result} onClose={() => setResult(null)} />
      )}

      {/* Bottom controls */}
      {!loading && !result && !noCamera && (
        <div
          ref={bottomControlsRef}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            paddingBottom: 'calc(var(--bottom-nav-h) + 16px)',
            paddingTop: '32px',
            paddingLeft: '32px',
            paddingRight: '32px',
            background: 'linear-gradient(to top, rgba(8,8,16,0.9) 0%, transparent 100%)',
            opacity: 0,
          }}
        >
          {/* Upload */}
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '6px', cursor: 'pointer',
          }}>
            <div className="btn-glass">
              <IconUpload />
            </div>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Upload
            </span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          </label>

          {/* Main Scan Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleScanButton}
              disabled={!apiKey}
              style={{
                width: 76, height: 76, borderRadius: '50%', border: 'none',
                background: apiKey
                  ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)'
                  : 'linear-gradient(135deg, #444 0%, #333 100%)',
                cursor: apiKey ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: apiKey
                  ? '0 0 0 4px rgba(8,8,16,0.8), 0 0 0 6px rgba(34,197,94,0.3), 0 0 30px rgba(34,197,94,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
                  : '0 0 0 4px rgba(8,8,16,0.8)',
                transition: 'all 0.2s ease',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                borderRadius: '50% 50% 0 0',
              }} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill={apiKey ? '#000' : '#888'}>
                <path d="M12 9a3 3 0 100 6 3 3 0 000-6z"/>
                <path fillRule="evenodd" d="M9.293 2.293A1 1 0 0110 2h4a1 1 0 01.707.293L16.414 4H19a3 3 0 013 3v11a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h2.586l1.707-1.707zM12 7a5 5 0 100 10A5 5 0 0012 7z" clipRule="evenodd"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Scan
            </span>
          </div>

          {/* Flash */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={toggleFlash}
              className={`btn-glass ${flashOn ? 'active' : ''}`}
            >
              <IconFlash on={flashOn} />
            </button>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: flashOn ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Flash
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
