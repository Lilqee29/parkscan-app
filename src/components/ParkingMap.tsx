'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Speed thresholds ────────────────────────────────────────────────────────
//  > 25 m/s  (~90 km/h)  → highway/expressway, never notify
//  8–25 m/s  (~30–90)    → driving in city, watch but don't alert yet
//  2–8 m/s   (~7–30)     → slowing down / looking for parking  ← NOTIFY HERE
//  < 2 m/s               → walking or stopped near a zone      ← NOTIFY HERE
const SPEED_HIGHWAY   = 25;   // m/s — above this: silent
const SPEED_PARKING   = 8;    // m/s — below this: user is likely parking
const ZONE_RADIUS_M   = 100;  // metres — proximity trigger
const ZONE_COOLDOWN   = 10 * 60 * 1000; // 10 min per-zone cooldown
const CLEAR_RADIUS_M  = 300;  // metres — beyond this, reset all cooldowns

interface ParkingMapProps {
  userPosition: { lat: number; lng: number; speed: number | null } | null;
}

interface ParkingZone {
  id: number;
  lat: number;
  lng: number;
  isPaid: boolean;
  name: string;
  operator: string;
  maxStay: string;
  capacity: string;
}

interface ScreenPoint { x: number; y: number; }

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Classify motion context from GPS speed */
function getMotionMode(speedMs: number | null): 'highway' | 'driving' | 'parking' | 'walking' {
  if (speedMs === null || speedMs === undefined) return 'walking';
  if (speedMs > SPEED_HIGHWAY) return 'highway';
  if (speedMs > SPEED_PARKING) return 'driving';
  if (speedMs > 1.5) return 'parking';
  return 'walking';
}

export default function ParkingMap({ userPosition }: ParkingMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<L.Map | null>(null);
  const userMarkerRef   = useRef<L.Marker | null>(null);
  const alertRef        = useRef<HTMLDivElement>(null);
  const legendRef       = useRef<HTMLDivElement>(null);
  const speedIndicRef   = useRef<HTMLDivElement>(null);

  // Smart notification dedup: zone id → timestamp of last notification
  const zoneCooldownRef = useRef<Map<number, number>>(new Map());

  const [parkingAlert, setParkingAlert] = useState<ParkingZone | null>(null);
  const [zoneCount, setZoneCount]       = useState<{ free: number; paid: number }>({ free: 0, paid: 0 });
  const [zones, setZones]               = useState<ParkingZone[]>([]);
  const [screenPoints, setScreenPoints] = useState<Record<number, ScreenPoint>>({});
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);
  const [motionMode, setMotionMode]     = useState<'highway' | 'driving' | 'parking' | 'walking'>('walking');

  // ── Update overlay card screen positions on map move/zoom ─────────────────
  const updateScreenPoints = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pts: Record<number, ScreenPoint> = {};
    zones.forEach((z) => {
      const p = map.latLngToContainerPoint([z.lat, z.lng]);
      pts[z.id] = { x: p.x, y: p.y };
    });
    setScreenPoints(pts);
  }, [zones]);

  // ── Initialize Map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [48.1173, -1.6778],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
      className: 'dark-tiles',
    }).addTo(map);

    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    map.on('move zoom moveend zoomend', updateScreenPoints);

    gsap.fromTo(mapRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 }
    );
    gsap.fromTo(legendRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.4 }
    );

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-bind move listener whenever zones change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('move zoom moveend zoomend');
    map.on('move zoom moveend zoomend', updateScreenPoints);
    updateScreenPoints();
  }, [updateScreenPoints]);

  // ── Smart Notification Engine ─────────────────────────────────────────────
  const maybeNotify = useCallback((zone: ParkingZone, speed: number | null) => {
    const mode = getMotionMode(speed);
    // Only notify when slowing down or walking — never at highway/city speed
    if (mode === 'highway' || mode === 'driving') return;

    const now = Date.now();
    const lastNotified = zoneCooldownRef.current.get(zone.id) ?? 0;
    if (now - lastNotified < ZONE_COOLDOWN) return; // still in cooldown

    zoneCooldownRef.current.set(zone.id, now);

    const modeLabel = mode === 'parking' ? 'Vous ralentissez' : 'À pied à proximité';
    const body = `${zone.name} — ${modeLabel}, zone payante à ${ZONE_RADIUS_M}m`;

    if (Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification('🅿️ Zone payante détectée', {
          body,
          icon: '/assets/parkscan_icon.jpeg',
          badge: '/assets/parkscan_icon.jpeg',
          tag: `paid-zone-${zone.id}`,
          ...({ vibrate: [150, 80, 150] } as Record<string, unknown>),
        });
      });
    } else {
      new Notification('🅿️ Zone payante détectée', {
        body,
        icon: '/assets/parkscan_icon.jpeg',
      });
    }

    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
  }, []);

  // ── Fetch Parking Zones from Overpass ────────────────────────────────────
  const fetchParkingZones = useCallback(async (lat: number, lng: number) => {
    const radius = 500;
    const query = `
      [out:json][timeout:15];
      (
        way["amenity"="parking"]["fee"="yes"](around:${radius},${lat},${lng});
        way["amenity"="parking"]["parking"="lane"](around:${radius},${lat},${lng});
        way["amenity"="parking"](around:${radius},${lat},${lng});
        relation["amenity"="parking"]["fee"="yes"](around:${radius},${lat},${lng});
        node["amenity"="parking"](around:${radius},${lat},${lng});
      );
      out body;>;out skel qt;
    `;

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) return;

      const data = await res.json();
      const fetched: ParkingZone[] = [];

      for (const el of data.elements) {
        const tags = el.tags || {};
        const isPaid =
          tags.fee === 'yes' ||
          tags.parking === 'paid' ||
          tags.parking === 'lane' ||
          tags.access === 'customers';

        let elLat: number | undefined;
        let elLng: number | undefined;
        if (el.type === 'node') { elLat = el.lat; elLng = el.lon; }
        else if (el.center)    { elLat = el.center.lat; elLng = el.center.lon; }
        if (elLat === undefined || elLng === undefined) continue;

        fetched.push({
          id: el.id,
          lat: elLat,
          lng: elLng,
          isPaid,
          name: tags.name || (isPaid ? 'Zone payante' : 'Parking gratuit'),
          operator: tags.operator || '',
          maxStay: tags.maxstay || '',
          capacity: tags.capacity || '',
        });
      }

      setZones(fetched);
      setZoneCount({
        free: fetched.filter((z) => !z.isPaid).length,
        paid: fetched.filter((z) => z.isPaid).length,
      });
    } catch (err) {
      console.error('Overpass error:', err);
    }
  }, []);

  // ── Update position, marker, and run smart proximity check ───────────────
  useEffect(() => {
    if (!userPosition || !mapInstanceRef.current) return;

    const { lat, lng, speed } = userPosition;
    const map = mapInstanceRef.current;
    const mode = getMotionMode(speed);
    setMotionMode(mode);

    // Move or create user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    map.setView([lat, lng], map.getZoom());

    // Fetch new zones when user has moved (don't spam Overpass)
    fetchParkingZones(lat, lng);

    // ── Smart proximity + notification check ───────────────────────────────
    if (mode === 'highway') {
      // Driving fast — no alerts, clear banner
      setParkingAlert(null);
      return;
    }

    const nearestPaid = zones.find(
      (z) => z.isPaid && getDistance(lat, lng, z.lat, z.lng) < ZONE_RADIUS_M
    );

    if (nearestPaid) {
      setParkingAlert(nearestPaid);
      maybeNotify(nearestPaid, speed);
    } else {
      setParkingAlert(null);
      // If far from all paid zones → reset all cooldowns so they're fresh next time
      const anyNearby = zones.some(
        (z) => z.isPaid && getDistance(lat, lng, z.lat, z.lng) < CLEAR_RADIUS_M
      );
      if (!anyNearby) zoneCooldownRef.current.clear();
    }
  }, [userPosition, zones, fetchParkingZones, maybeNotify]);

  // Update screen overlay when zones load
  useEffect(() => { updateScreenPoints(); }, [zones, updateScreenPoints]);

  // Alert entrance animation
  useEffect(() => {
    if (!alertRef.current || !parkingAlert) return;
    gsap.fromTo(alertRef.current,
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, [parkingAlert]);

  const dismissAlert = () => {
    if (alertRef.current) {
      gsap.to(alertRef.current, {
        opacity: 0, y: 10, scale: 0.95, duration: 0.2, ease: 'power2.in',
        onComplete: () => setParkingAlert(null),
      });
    } else {
      setParkingAlert(null);
    }
  };

  // Motion mode display config
  const motionConfig = {
    highway: { icon: '🛣️', label: 'Autoroute', color: '#7070a0' },
    driving: { icon: '🚗', label: 'En voiture', color: '#3b82f6' },
    parking: { icon: '🔍', label: 'Cherche parking', color: '#f59e0b' },
    walking: { icon: '🚶', label: 'À pied / Arrêté', color: '#22c55e' },
  }[motionMode];

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .dark-tiles {
          filter: brightness(0.65) saturate(0.4) hue-rotate(180deg) contrast(1.1) invert(1);
        }
        .parkscan-popup .leaflet-popup-content-wrapper {
          background: #16162a !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          color: #eaeaf8 !important;
        }
        .parkscan-popup .leaflet-popup-tip { background: #16162a !important; }
        .parkscan-popup .leaflet-popup-close-button { color: #7070a0 !important; top: 10px !important; right: 10px !important; font-size: 18px !important; }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution { background: rgba(16,16,28,0.7) !important; color: #404060 !important; font-size: 10px !important; border-radius: 4px !important; }
      `}</style>

      {/* Map canvas */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', opacity: 0 }} />

      {/* ── React overlay zone cards ─────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
        {zones.map((zone) => {
          const pt = screenPoints[zone.id];
          if (!pt) return null;
          const shortTitle = zone.name.length > 16 ? zone.name.slice(0, 16) + '…' : zone.name;
          return (
            <div
              key={zone.id}
              className="zone-card-overlay"
              style={{ left: pt.x, top: pt.y, pointerEvents: 'auto' }}
              onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
            >
              <div className={`zone-card ${zone.isPaid ? 'paid' : 'free'}`}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: zone.isPaid ? '#ef4444' : '#22c55e',
                  boxShadow: zone.isPaid ? '0 0 6px rgba(239,68,68,0.8)' : '0 0 6px rgba(34,197,94,0.8)',
                }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#eaeaf8', letterSpacing: '-0.01em' }}>
                  {shortTitle}
                </span>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px',
                  borderRadius: 8, letterSpacing: '0.04em',
                  background: zone.isPaid ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)',
                  color: zone.isPaid ? '#ef4444' : '#22c55e',
                }}>
                  {zone.isPaid ? 'PAYANT' : 'FREE'}
                </span>
              </div>

              {/* Expanded popup */}
              {selectedZone?.id === zone.id && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(16,16,28,0.97)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${zone.isPaid ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  minWidth: 180,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                  pointerEvents: 'auto',
                  zIndex: 20,
                }}>
                  <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 6, color: '#eaeaf8' }}>
                    {zone.name}
                  </p>
                  {zone.operator && (
                    <p style={{ fontSize: '0.72rem', color: '#7070a0', marginBottom: 3 }}>🏢 {zone.operator}</p>
                  )}
                  {zone.maxStay && (
                    <p style={{ fontSize: '0.72rem', color: '#7070a0', marginBottom: 3 }}>⏱️ Max: {zone.maxStay}</p>
                  )}
                  {zone.capacity && (
                    <p style={{ fontSize: '0.72rem', color: '#7070a0', marginBottom: 6 }}>🅿️ Places: {zone.capacity}</p>
                  )}
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                    fontSize: '0.7rem', fontWeight: 800,
                    background: zone.isPaid ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: zone.isPaid ? '#ef4444' : '#22c55e',
                    border: `1px solid ${zone.isPaid ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
                  }}>
                    {zone.isPaid ? '🔴 ZONE PAYANTE' : '🟢 PARKING GRATUIT'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Motion mode indicator (top-right corner of map) ──────────────── */}
      <div
        ref={speedIndicRef}
        style={{
          position: 'absolute',
          top: 12,
          right: 56, // leave room for zoom control
          zIndex: 20,
          background: 'rgba(10,10,18,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${motionConfig.color}33`,
          borderRadius: 20,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '0.75rem' }}>{motionConfig.icon}</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: motionConfig.color, letterSpacing: '0.03em' }}>
          {motionConfig.label}
        </span>
        {motionMode === 'highway' && (
          <span style={{ fontSize: '0.6rem', color: '#404060', marginLeft: 2 }}>
            Alertes suspendues
          </span>
        )}
      </div>

      {/* ── Paid Zone Alert Banner ─────────────────────────────────────────── */}
      {parkingAlert && (
        <div
          ref={alertRef}
          style={{
            position: 'absolute',
            bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)',
            left: '16px', right: '16px',
            zIndex: 20,
          }}
        >
          <div className="alert-banner">
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px' }}>
                {motionMode === 'parking' ? '🔍 Parking payant proche' : '🅿️ Zone payante à proximité'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {parkingAlert.name}
              </p>
            </div>
            <button
              onClick={dismissAlert}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.1)',
                color: 'var(--danger)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', lineHeight: 1, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div
        ref={legendRef}
        style={{
          position: 'absolute',
          bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)',
          left: '16px',
          zIndex: 20,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          display: parkingAlert ? 'none' : 'flex',
          flexDirection: 'column',
          gap: '6px',
          opacity: 0,
        }}
      >
        {[
          { color: 'var(--accent)', shadow: 'rgba(34,197,94,0.6)', label: 'Gratuit', count: zoneCount.free, countColor: 'var(--accent)' },
          { color: 'var(--danger)', shadow: 'rgba(239,68,68,0.6)', label: 'Payant', count: zoneCount.paid, countColor: 'var(--danger)' },
          { color: 'var(--info)',   shadow: 'rgba(59,130,246,0.6)', label: 'Vous', count: 0, countColor: '' },
        ].map(({ color, shadow, label, count, countColor }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${shadow}` }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
              {label} {count > 0 && <span style={{ color: countColor }}>({count})</span>}
            </span>
          </div>
        ))}
      </div>

      {/* ── Recenter button ─────────────────────────────────────────────────── */}
      {userPosition && (
        <button
          onClick={() => {
            if (userPosition && mapInstanceRef.current) {
              mapInstanceRef.current.setView([userPosition.lat, userPosition.lng], 17, { animate: true });
            }
          }}
          style={{
            position: 'absolute',
            bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 16px)',
            right: '16px',
            zIndex: 20,
            width: 42, height: 42, borderRadius: '50%',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            color: 'var(--info)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
          aria-label="Recenter map"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </button>
      )}
    </div>
  );
}
