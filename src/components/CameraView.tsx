'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface CameraViewProps {
  apiKey: string;
  onScanResult: (text: string, status: string) => void;
}

export default function CameraView({ apiKey, onScanResult }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; status: string } | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [noCamera, setNoCamera] = useState(false);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch {
        setNoCamera(true);
      }
    }
    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture frame
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // Scan with Gemini
  const handleScan = useCallback(async (imageBase64: string) => {
    if (!apiKey) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Tu es un assistant parking à Rennes, France. Lis ce panneau de stationnement. Réponds avec OUI ou NON, puis les détails (durée, horaires, tarif). Sois concis.' },
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
      const status = lower.startsWith('oui') || lower.includes('oui') ? 'yes'
        : lower.startsWith('non') || lower.includes('non') ? 'no'
        : 'unknown';

      setResult({ text: cleaned, status });
      onScanResult(cleaned, status);
    } catch (err) {
      setResult({ text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, status: 'unknown' });
    } finally {
      setLoading(false);
    }
  }, [apiKey, onScanResult]);

  // Handle file upload
  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) handleScan(result);
    };
    reader.readAsDataURL(file);
  }, [handleScan]);

  // Toggle flash
  const toggleFlash = useCallback(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.();
    if (!capabilities?.torch) return;
    setFlashOn(!flashOn);
    track.applyConstraints({ advanced: [{ torch: !flashOn }] });
  }, [stream, flashOn]);

  return (
    <div className="relative h-screen">
      {/* Camera */}
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* No Camera Fallback */}
      {noCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] gap-4 p-8 text-center">
          <p className="text-xl text-gray-400">📷 Camera not available</p>
          <label className="px-6 py-3 bg-[#22c55e] text-black font-semibold rounded-xl cursor-pointer">
            Upload a Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      )}

      {/* Scanner Overlay */}
      {!noCamera && !loading && !result && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-64 h-48 relative animate-pulse">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#22c55e] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#22c55e] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#22c55e] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#22c55e] rounded-br-lg" />
          </div>
          <p className="text-white/80 mt-4 text-sm">Point at a parking sign</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
          <div className="w-12 h-12 border-4 border-[#2a2a3a] border-t-[#22c55e] rounded-full animate-spin" />
          <p className="text-gray-400">Reading sign...</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4" onClick={() => setResult(null)}>
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setResult(null)} className="absolute top-4 right-4 text-2xl text-gray-400">&times;</button>
            <div className={`text-2xl font-bold mb-4 ${result.status === 'yes' ? 'text-[#22c55e]' : result.status === 'no' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
              {result.status === 'yes' ? '✅ Vous pouvez parker ici' : result.status === 'no' ? '❌ Parking interdit' : '❓ Réponse unclear'}
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{result.text}</p>
            <p className="text-gray-500 text-xs mt-4">{new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {!loading && !result && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 pb-8 pt-16 bg-gradient-to-t from-[#0a0a0f] to-transparent">
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-2xl">🖼️</span>
            <span className="text-xs text-gray-400 uppercase">Upload</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
          </label>

          <button
            onClick={() => {
              const frame = captureFrame();
              if (frame) handleScan(frame);
            }}
            className="w-18 h-18 bg-[#22c55e] rounded-full flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(34,197,94,0.3)] active:scale-95 transition-transform"
          >
            📸
          </button>

          <button
            onClick={toggleFlash}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-2xl">{flashOn ? '✨' : '💡'}</span>
            <span className="text-xs text-gray-400 uppercase">Flash</span>
          </button>
        </div>
      )}
    </div>
  );
}
