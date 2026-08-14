'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function ParkingMap({ userPosition }: ParkingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [parkingAlert, setParkingAlert] = useState<ParkingZone | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [48.1173, -1.6778], // Rennes center
      zoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user position
  useEffect(() => {
    if (!userPosition || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon }).addTo(map);
    }

    map.setView([userPosition.lat, userPosition.lng], map.getZoom());

    // Fetch nearby parking zones
    fetchParkingZones(userPosition.lat, userPosition.lng);
  }, [userPosition]);

  // Fetch parking zones from Overpass API
  async function fetchParkingZones(lat: number, lng: number) {
    const radius = 300;
    const query = `
      [out:json][timeout:10];
      (
        way["amenity"="parking"]["fee"="yes"](around:${radius},${lat},${lng});
        way["amenity"="parking"]["parking"="lane"](around:${radius},${lat},${lng});
        relation["amenity"="parking"]["fee"="yes"](around:${radius},${lat},${lng});
        node["amenity"="parking"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
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
        const isPaid = tags.fee === 'yes' || tags.parking === 'paid' || tags.parking === 'lane';

        if (el.type === 'node') {
          zones.push({
            id: el.id,
            lat: el.lat,
            lng: el.lon,
            isPaid,
            name: tags.name || 'Parking',
            operator: tags.operator || '',
            maxStay: tags.maxstay || '',
            capacity: tags.capacity || '',
          });
        }
      }

      // Add markers to map
      if (mapInstanceRef.current) {
        zones.forEach((zone) => {
          const icon = L.divIcon({
            className: zone.isPaid ? 'parking-zone-paid' : 'parking-zone-free',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const marker = L.marker([zone.lat, zone.lng], { icon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div style="font-weight:700;margin-bottom:4px">${zone.name}</div>
              <div style="font-size:12px;color:#888">
                ${zone.operator ? `Opérateur: ${zone.operator}<br>` : ''}
                ${zone.maxStay ? `Durée max: ${zone.maxStay}` : ''}
              </div>
              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;margin-top:6px;background:${zone.isPaid ? '#ef4444' : '#22c55e'};color:${zone.isPaid ? '#fff' : '#000'}">
                ${zone.isPaid ? 'Payant' : 'Gratuit'}
              </span>
            `);
        });

        // Check if user is in paid zone
        const nearestPaid = zones.find((z) => z.isPaid && getDistance(lat, lng, z.lat, z.lng) < 50);
        if (nearestPaid) {
          setParkingAlert(nearestPaid);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          if (Notification.permission === 'granted') {
            new Notification('🅿️ Zone payante detectee!', {
              body: `${nearestPaid.name} — Parking payant a proximite`,
              icon: '/icons/icon-192.png',
            });
          }
        } else {
          setParkingAlert(null);
        }
      }
    } catch (err) {
      console.error('Overpass error:', err);
    }
  }

  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return (
    <div className="relative h-screen">
      <div ref={mapRef} className="w-full h-full" />

      {/* Dark map tiles overlay */}
      <style jsx global>{`
        .leaflet-tile-pane { filter: brightness(0.7) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
        .user-location { background: #3b82f6; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px rgba(59,130,246,0.6); animation: pulse 2s infinite; }
        .parking-zone-free { background: #22c55e; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .parking-zone-paid { background: #ef4444; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.6); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.9); } }
        .leaflet-popup-content-wrapper { background: #14141f !important; color: #fff !important; border-radius: 12px !important; border: 1px solid #2a2a3a !important; }
        .leaflet-popup-tip { background: #14141f !important; }
      `}</style>

      {/* Parking Alert Banner */}
      {parkingAlert && (
        <div className="fixed bottom-24 left-4 right-4 z-30">
          <div className="bg-[#14141f] border border-[#ef4444] rounded-2xl p-4 flex items-center gap-3 shadow-[0_10px_40px_rgba(239,68,68,0.3)]">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <strong className="text-sm">Zone payante detectee</strong>
              <p className="text-xs text-gray-400">{parkingAlert.name}</p>
            </div>
            <button onClick={() => setParkingAlert(null)} className="text-xl text-gray-400">&times;</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="fixed bottom-24 left-4 z-20 bg-[#14141f]/90 backdrop-blur rounded-xl p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span>Gratuit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Payant</span>
        </div>
      </div>
    </div>
  );
}
