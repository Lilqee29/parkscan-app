'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for map (no SSR)
const ParkingMap = dynamic(() => import('@/components/ParkingMap'), { ssr: false });
const CameraView = dynamic(() => import('@/components/CameraView'), { ssr: false });

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ text: string; status: string; timestamp: number }>>([]);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Load saved data
  useEffect(() => {
    const savedKey = localStorage.getItem('parkscan_api_key') || '';
    const savedHistory = JSON.parse(localStorage.getItem('parkscan_history') || '[]');
    setApiKey(savedKey);
    setHistory(savedHistory);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Get user position
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        console.error,
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('parkscan_api_key', key);
    setShowSettings(false);
  };

  const addScanResult = (text: string, status: string) => {
    const entry = { text, status, timestamp: Date.now() };
    const newHistory = [entry, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('parkscan_history', JSON.stringify(newHistory));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[#0a0a0f] to-transparent pointer-events-none">
        <h1 className="text-lg font-bold pointer-events-auto">🅿️ ParkScan</h1>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`btn-glass ${showMap ? 'active' : ''}`}
          >
            🗺️
          </button>
          <button
            onClick={() => { setShowHistory(true); setShowSettings(false); }}
            className="btn-glass"
          >
            🕐
          </button>
          <button
            onClick={() => { setShowSettings(true); setShowHistory(false); }}
            className="btn-glass"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Content */}
      {showMap ? (
        <ParkingMap userPosition={userPosition} />
      ) : (
        <CameraView apiKey={apiKey} onScanResult={addScanResult} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm bg-[#14141f] h-full animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a3a]">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-2xl">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#888899] mb-1">Gemini API Key</label>
                <input
                  type="password"
                  defaultValue={apiKey}
                  placeholder="Enter your API key..."
                  className="input-premium"
                  id="settings-api-key"
                />
                <p className="text-xs text-[#888899] mt-1">
                  Free at <a href="https://aistudio.google.com/apikey" target="_blank" className="text-[#22c55e]">aistudio.google.com</a>
                </p>
              </div>
              <button
                onClick={() => {
                  const input = document.getElementById('settings-api-key') as HTMLInputElement;
                  saveApiKey(input.value.trim());
                }}
                className="btn-scan animate-pulse-glow"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-sm bg-[#14141f] h-full animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a3a]">
              <h2 className="text-lg font-semibold">Scan History</h2>
              <button onClick={() => setShowHistory(false)} className="text-2xl">&times;</button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-80px)]">
              {history.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No scans yet.</p>
              ) : (
                history.map((entry, i) => (
                  <div key={i} className="p-3 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg">
                    <div className={`font-semibold text-sm ${entry.status === 'yes' ? 'text-[#22c55e]' : entry.status === 'no' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                      {entry.status === 'yes' ? '✅' : entry.status === 'no' ? '❌' : '❓'}{' '}
                      {entry.text.slice(0, 60)}...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(entry.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))
              )}
            </div>
            {history.length > 0 && (
              <div className="p-4 border-t border-[#2a2a3a]">
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('parkscan_history');
                  }}
                  className="btn-danger"
                >
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Key Prompt (first time) */}
      {!apiKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="card-premium p-8 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-2">🅿️ Welcome to ParkScan</h2>
            <p className="text-[#888899] text-sm mb-4">
              Enter your Gemini API key to start reading parking signs.
            </p>
            <input
              type="password"
              placeholder="Paste your API key..."
              className="input-premium mb-2"
              id="prompt-api-key"
            />
            <p className="text-xs text-[#888899] mb-4">
              Free at <a href="https://aistudio.google.com/apikey" target="_blank" className="text-[#22c55e]">aistudio.google.com</a>
            </p>
            <button
              onClick={() => {
                const input = document.getElementById('prompt-api-key') as HTMLInputElement;
                const key = input.value.trim();
                if (key) saveApiKey(key);
              }}
              className="btn-gradient"
            >
              Let&apos;s Go!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
