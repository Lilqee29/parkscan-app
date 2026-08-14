# 🅿️ ParkScan — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** August 14, 2026
**Author:** Ibrahim Qoyum

---

## 1. Executive Summary

ParkScan is a premium mobile-first PWA that solves a real problem in Rennes, France: confusing parking signs and unexpected paid parking zones. Users point their phone camera at any parking sign and get an instant AI-powered plain-language answer. A live map shows free vs paid parking zones, with real-time alerts when entering paid areas.

**Tagline:** "Never get a parking ticket in Rennes again."

---

## 2. Problem Statement

### The Pain
- French parking signs are notoriously complex ("Blanche 15h-19h sauf jours ouvrés excepté...")
- Drivers waste 5-10 minutes decoding signs
- Wrong interpretation = €30-150 parking tickets
- Paid parking zones are not clearly marked on the street
- No unified tool exists for French parking

### The Solution
- AI reads and interprets signs in 2 seconds
- Live map shows paid zones before you park
- Instant alerts prevent accidental paid parking
- Installable as an app on any phone

---

## 3. Target Users

| Persona | Description | Need |
|---------|-------------|------|
| **Rennes Driver** | Local resident, parks daily | Avoid tickets, save time |
| **Student** | University of Rennes, budget-conscious | Find free parking, avoid fines |
| **Visitor** | Tourist or business traveler | Understand unfamiliar signs |
| **Delivery Driver** | Uber/Deliveroo, parks frequently | Quick decisions, maximize time |

---

## 4. Core Features

### 4.1 AI Parking Sign Reader
- **Input:** Camera photo or uploaded image of a parking sign
- **Processing:** Gemini 3.5 Flash Vision API
- **Output:** Plain-language answer (OUI/NON + details)
- **Response Time:** < 3 seconds
- **Languages:** French (default), English

### 4.2 Live Parking Map
- **Map Engine:** Leaflet.js + OpenStreetMap
- **Data Source:** Overpass API (OpenStreetMap data)
- **Update Frequency:** Real-time on position change
- **Markers:** Green (free), Red (paid), Yellow (restricted)
- **Popups:** Zone name, operator, max stay, capacity

### 4.3 Geolocation & Alerts
- **Tracking:** Continuous GPS (when app is open)
- **Detection Radius:** 50m from paid zone
- **Alert Types:** Visual (banner), Haptic (vibration), Push notification
- **Trigger:** Entering paid zone radius

### 4.4 PWA (Progressive Web App)
- **Installable:** Add to Home Screen (iOS/Android)
- **Offline:** Cached assets, service worker
- **Standalone:** No browser chrome
- **Icons:** App icon on home screen

### 4.5 Scan History
- **Storage:** localStorage
- **Capacity:** 50 scans
- **Data:** Timestamp, result text, status (yes/no)
- **Clear:** Manual clear option

---

## 5. Design System

### 5.1 Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#0a0a0f` | Main background |
| **Card** | `#14141f` | Cards, panels |
| **Border** | `#2a2a3a` | Borders, dividers |
| **Accent** | `#22c55e` | Primary actions, free parking |
| **Danger** | `#ef4444` | Errors, paid parking |
| **Warning** | `#f59e0b` | Unknown states |
| **Info** | `#3b82f6` | User location |
| **Text Primary** | `#e8e8f0` | Main text |
| **Text Dim** | `#888899` | Secondary text |

### 5.2 Typography

- **Font Family:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Logo:** 1.2rem, font-weight 700, letter-spacing -0.02em
- **Headings:** 1.8rem, font-weight 800
- **Body:** 1rem, line-height 1.6
- **Small:** 0.85rem
- **Tiny:** 0.75rem

### 5.3 Spacing & Sizing

| Element | Size |
|---------|------|
| Border radius (cards) | 16px |
| Border radius (buttons) | 10px |
| Border radius (pills) | 20px |
| Scan button | 72px diameter |
| Icon buttons | 40px diameter |
| Panel width | 100% / max 380px |

### 5.4 Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| Panel slide-in | 0.25s | ease-out |
| Scanner pulse | 2s | ease-in-out infinite |
| Button tap | 0.15s | ease |
| Toast fade | 0.3s | ease |
| Loading spinner | 0.8s | linear infinite |

### 5.5 Premium Button Design (Nano Banana Style)

Generate 3 premium buttons with these specs:

#### Button 1: Primary Scan Button
- **Text:** "Scan Parking Sign"
- **Icon:** Camera icon (centered)
- **Size:** 72px diameter circle
- **Background:** Gradient from `#22c55e` to `#16a34a`
- **Shadow:** `0 0 30px rgba(34, 197, 94, 0.4)`
- **Hover:** Glow effect, scale 1.05
- **Active:** Scale 0.95
- **Style:** Glassmorphism, subtle inner shadow, metallic sheen

#### Button 2: Map Toggle Button
- **Text:** "🗺️" (emoji centered)
- **Size:** 44px diameter circle
- **Background:** `#14141f` with `backdrop-blur(10px)`
- **Border:** 1px solid `#2a2a3a`
- **Active State:** Background `#22c55e`, icon turns black
- **Shadow:** `0 4px 12px rgba(0,0,0,0.3)`
- **Style:** Floating glassmorphic pill

#### Button 3: Upload/Action Button
- **Text:** "Upload Photo" + camera icon
- **Size:** Full-width rounded rectangle
- **Background:** Gradient from `#3b82f6` to `#2563eb`
- **Border:** None
- **Radius:** 12px
- **Shadow:** `0 4px 20px rgba(59, 130, 246, 0.3)`
- **Style:** Premium gradient, subtle texture overlay

---

## 6. Technical Architecture

### 6.1 Tech Stack

```
┌─────────────────────────────────────┐
│           Frontend (PWA)            │
├─────────────────────────────────────┤
│  Next.js 16 (App Router)           │
│  React 19                          │
│  TypeScript                        │
│  Tailwind CSS                      │
├─────────────────────────────────────┤
│           Map Layer                 │
├─────────────────────────────────────┤
│  Leaflet.js 1.9                    │
│  OpenStreetMap Tiles               │
│  Overpass API                      │
├─────────────────────────────────────┤
│           AI Layer                  │
├─────────────────────────────────────┤
│  Gemini 3.5 Flash Vision API       │
│  Base64 Image Encoding             │
├─────────────────────────────────────┤
│           Storage                   │
├─────────────────────────────────────┤
│  localStorage (history, settings)  │
│  Service Worker Cache (assets)     │
│  Cache API (API responses)         │
├─────────────────────────────────────┤
│           Notifications             │
├─────────────────────────────────────┤
│  Web Push API                      │
│  Service Worker Push Handler       │
│  Vibration API                     │
└─────────────────────────────────────┘
```

### 6.2 Data Flow

```
User opens app
    ↓
Service Worker caches assets (offline support)
    ↓
Geolocation API gets user position
    ↓
User taps "Scan" → Camera captures frame
    ↓
Frame sent to Gemini API (base64)
    ↓
AI responds with OUI/NON + details
    ↓
Result displayed + saved to localStorage
    ↓
Overpass API queried for nearby parking zones
    ↓
Zones displayed on map (green/red dots)
    ↓
If user in paid zone → Alert (vibrate + push)
```

### 6.3 Storage Strategy

| Data | Storage | Duration | Size Limit |
|------|---------|----------|------------|
| API Key | localStorage | Permanent | ~100 bytes |
| Scan History | localStorage | Permanent | ~50 entries |
| Language Pref | localStorage | Permanent | ~10 bytes |
| App Assets | Service Worker Cache | Until updated | ~2MB |
| API Responses | Cache API | 5 minutes | ~10MB |
| User Position | In-memory (state) | Session | ~50 bytes |

### 6.4 Caching Rules

```
Service Worker:
├── Static Assets (/, /offline, etc.)
│   └── Cache First → Network Fallback
│
├── API Calls (Gemini, Overpass)
│   └── Network First → Cache Fallback
│
├── Map Tiles (OpenStreetMap)
│   └── Cache First → Network
│
└── Images
    └── Cache First → Network
```

---

## 7. User Interface

### 7.1 Screens

#### Screen 1: Camera View (Default)
```
┌─────────────────────────────┐
│ 🅿️ ParkScan    🗺️ 🕐 ⚙️    │ ← Top bar (gradient fade)
│                             │
│                             │
│      ┌─────────────┐        │
│      │  ┌───────┐  │        │ ← Scanner frame
│      │  │       │  │        │    (animated corners)
│      │  └───────┘  │        │
│      └─────────────┘        │
│   Point at a parking sign   │
│                             │
│                             │
│  🖼️        📸         💡   │ ← Bottom controls
│ Upload    Scan        Flash │
└─────────────────────────────┘
```

#### Screen 2: Map View
```
┌─────────────────────────────┐
│ 🅿️ ParkScan    🗺️ 🕐 ⚙️    │
│                    [Zoom]   │
│                             │
│     🟢          🔴          │ ← Parking zones
│  (free)    (paid)           │
│         👤                  │ ← User location
│    (blue pulse)             │
│                             │
│ ┌─────────────────┐         │ ← Alert banner
│ │ ⚠️ Zone payante │         │    (when in paid zone)
│ └─────────────────┘         │
│ 🟢 Gratuit  🔴 Payant      │ ← Legend
└─────────────────────────────┘
```

#### Screen 3: Result Overlay
```
┌─────────────────────────────┐
│                             │
│    ┌───────────────────┐    │
│    │  ✅ Vous pouvez   │    │
│    │  parker ici       │    │
│    │                   │    │
│    │  Durée max: 2h    │    │
│    │  Horaires: 8h-20h │    │
│    │  Tarif: Gratuit   │    │
│    │                   │    │
│    │  14/08/2026 22:30 │    │
│    └───────────────────┘    │
│                             │
└─────────────────────────────┘
```

---

## 8. API Integration

### 8.1 Gemini Vision API

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`

**Request:**
```json
{
  "contents": [{
    "parts": [
      { "text": "Tu es un assistant parking à Rennes..." },
      { "inlineData": { "mimeType": "image/jpeg", "data": "base64..." } }
    ]
  }],
  "generationConfig": { "temperature": 0.2, "maxOutputTokens": 500 }
}
```

**Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "OUI\nDurée max: 2h\nHoraires: 8h-20h\nTarif: Gratuit" }]
    }
  }]
}
```

### 8.2 Overpass API

**Endpoint:** `https://overpass-api.de/api/interpreter`

**Query:**
```
[out:json][timeout:10];
(
  way["amenity"="parking"]["fee"="yes"](around:300,48.1173,-1.6778);
  way["amenity"="parking"]["parking"="lane"](around:300,48.1173,-1.6778);
  node["amenity"="parking"](around:300,48.1173,-1.6778);
);
out body; >; out skel qt;
```

---

## 9. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| AI Response Time | < 3s |
| Map Load Time | < 2s |
| Bundle Size | < 500KB |
| Cache Hit Rate | > 80% |

---

## 10. Security

| Concern | Solution |
|---------|----------|
| API Key Exposure | `.env.local` gitignored, never in code |
| No HTTPS | Service worker won't register (expected) |
| No Tracking | No analytics, no third-party scripts |
| Data Privacy | All data stored locally, no server |
| CORS | API calls to Google/OpenStreetMap (allowed) |

---

## 11. Future Enhancements

| Feature | Priority | Complexity |
|---------|----------|------------|
| Offline mode (cached signs) | P2 | Medium |
| Multi-city support | P2 | Low |
| Share scan result | P3 | Low |
| Timer (countdown to parking expiry) | P2 | Low |
| Voice input ("Hey ParkScan, can I park here?") | P3 | High |
| AI learns from user corrections | P4 | High |
| Integration with city parking APIs | P4 | High |
| Social features (report bad signs) | P4 | Medium |

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users | 100+ (Rennes) |
| Scan Accuracy | > 90% correct OUI/NON |
| Avg Response Time | < 2.5s |
| User Retention (7-day) | > 40% |
| Parking Tickets Avoided | Track via surveys |

---

## 13. Launch Plan

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| MVP | Tonight | Working app, AI scan, map, alerts |
| Beta | Week 1 | Polish, icons, deploy to Vercel |
| Launch | Week 2 | Marketing, social, Reddit posts |
| Growth | Month 1 | Multi-city, user feedback |

---

*Document generated for ParkScan v1.0 — Rennes, France*
