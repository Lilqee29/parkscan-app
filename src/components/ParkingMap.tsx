'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ParkingMapProps {
  userPosition: { lat: number; lng: number } | null;
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

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ParkingMap({ userPosition }: ParkingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  const [parkingAlert, setParkingAlert] = useState<ParkingZone | null>(null);
  const [zoneCount, setZoneCount] = useState<{ free: number; paid: number }>({ free: 0, paid: 0 });

  // ── Initialize Map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [48.1173, -1.6778],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom dark-style tile filter
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
      className: 'dark-tiles',
    }).addTo(map);

    // Custom attribution (minimal)
    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

    // Zoom control (styled via CSS)
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    // Entrance animation
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
  }, []);

  // ── Fetch Parking Zones ─────────────────────────────────────────────────────
  const fetchParkingZones = useCallback(async (lat: number, lng: number) => {
    const radius = 350;
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
      const zones: ParkingZone[] = [];

      for (const el of data.elements) {
        const tags = el.tags || {};
        const isPaid = tags.fee === 'yes' || tags.parking === 'paid' || tags.parking === 'lane' || tags.access === 'customers';

        if (el.type === 'node') {
          zones.push({
            id: el.id, lat: el.lat, lng: el.lon,
            isPaid,
            name: tags.name || (isPaid ? 'Zone payante' : 'Parking gratuit'),
            operator: tags.operator || '',
            maxStay: tags.maxstay || '',
            capacity: tags.capacity || '',
          });
        }
      }

      if (!mapInstanceRef.current) return;

      const freeCount = zones.filter((z) => !z.isPaid).length;
      const paidCount = zones.filter((z) => z.isPaid).length;
      setZoneCount({ free: freeCount, paid: paidCount });

      // Add markers with permanent visible labels directly on map
      zones.forEach((zone) => {
        const shortTitle = zone.name.length > 18 ? zone.name.slice(0, 18) + '…' : zone.name;

        const icon = L.divIcon({
          className: 'parking-label-wrapper',
          html: `
            <div class="parking-label-badge ${zone.isPaid ? 'paid' : 'free'}">
              <span class="badge-dot ${zone.isPaid ? 'paid' : 'free'}"></span>
              <span class="badge-name">${shortTitle}</span>
              <span class="badge-status ${zone.isPaid ? 'paid' : 'free'}">${zone.isPaid ? 'PAYANT' : 'FREE'}</span>
            </div>
          `,
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        });

        L.marker([zone.lat, zone.lng], { icon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div style="font-family:'Inter',sans-serif;min-width:160px;padding:4px 0">
              <div style="font-weight:800;font-size:14px;margin-bottom:6px;color:#eaeaf8">${zone.name}</div>
              ${zone.operator ? `<div style="font-size:11px;color:#888899;margin-bottom:3px">🏢 Opérateur: ${zone.operator}</div>` : ''}
              ${zone.maxStay ? `<div style="font-size:11px;color:#888899;margin-bottom:6px">⏱️ Durée max: ${zone.maxStay}</div>` : ''}
              ${zone.capacity ? `<div style="font-size:11px;color:#888899;margin-bottom:6px">🅿️ Places: ${zone.capacity}</div>` : ''}
              <span style="
                display:inline-block;padding:4px 12px;border-radius:14px;
                font-size:11px;font-weight:800;letter-spacing:0.04em;
                background:${zone.isPaid ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
                color:${zone.isPaid ? '#ef4444' : '#22c55e'};
                border:1px solid ${zone.isPaid ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'};
              ">
                ${zone.isPaid ? '🔴 ZONE PAYANTE' : '🟢 PARKING GRATUIT'}
              </span>
            </div>
          `, { className: 'parkscan-popup' });
      });

      // Paid zone alert
      const nearestPaid = zones.find(
        (z) => z.isPaid && getDistance(lat, lng, z.lat, z.lng) < 60
      );
      if (nearestPaid) {
        setParkingAlert(nearestPaid);
        if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
        if (Notification.permission === 'granted') {
          new Notification('🅿️ Zone payante détectée!', {
            body: `${nearestPaid.name} — Parking payant à proximité`,
            icon: '/assets/parkscan_icon.jpeg',
          });
        }
      } else {
        setParkingAlert(null);
      }
    } catch (err) {
      console.error('Overpass error:', err);
    }
  }, []);

  // ── Update User Position ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userPosition || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker(
        [userPosition.lat, userPosition.lng],
        { icon: userIcon, zIndexOffset: 1000 }
      ).addTo(map);
    }

    map.setView([userPosition.lat, userPosition.lng], map.getZoom());
    fetchParkingZones(userPosition.lat, userPosition.lng);
  }, [userPosition, fetchParkingZones]);

  // ── Alert Animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!alertRef.current) return;
    if (parkingAlert) {
      gsap.fromTo(alertRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
      );
    }
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

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Dark tile CSS injection */}
      <style>{`
        .dark-tiles {
          filter:
            brightness(0.65)
            saturate(0.4)
            hue-rotate(180deg)
            contrast(1.1)
            invert(1);
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

      <div ref={mapRef} style={{ width: '100%', height: '100%', opacity: 0 }} />

      {/* Paid Zone Alert */}
      {parkingAlert && (
        <div
          ref={alertRef}
          style={{
            position: 'absolute',
            bottom: 'calc(var(--bottom-nav-h) + 16px)',
            left: '16px', right: '16px',
            zIndex: 20,
          }}
        >
          <div className="alert-banner">
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px' }}>
                Zone payante détectée
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

      {/* Legend */}
      <div
        ref={legendRef}
        style={{
          position: 'absolute',
          bottom: 'calc(var(--bottom-nav-h) + 16px)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
            Gratuit {zoneCount.free > 0 && <span style={{ color: 'var(--accent)' }}>({zoneCount.free})</span>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>
            Payant {zoneCount.paid > 0 && <span style={{ color: 'var(--danger)' }}>({zoneCount.paid})</span>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--info)', boxShadow: '0 0 6px rgba(59,130,246,0.6)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Vous</span>
        </div>
      </div>

      {/* Recenter button */}
      {userPosition && (
        <button
          onClick={() => {
            if (userPosition && mapInstanceRef.current) {
              mapInstanceRef.current.setView([userPosition.lat, userPosition.lng], 17, { animate: true });
            }
          }}
          style={{
            position: 'absolute',
            bottom: 'calc(var(--bottom-nav-h) + 16px)',
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
