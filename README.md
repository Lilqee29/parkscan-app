# 🅿️ ParkScan

**Point at French parking signs, get instant answers.** A PWA for Rennes, France that reads parking signs with AI and shows paid parking zones on a live map.

## What It Does

### 📸 AI Parking Sign Reader
Point your phone camera at any confusing French parking sign → get an instant plain-language answer:
- Can you park here RIGHT NOW?
- Until when?
- Any restrictions?
- How much does it cost?

### 🗺️ Live Parking Map
- See all parking zones near you on a dark-themed map
- **Green dots** = Free parking
- **Red dots** = Paid parking
- Tap any dot for details (operator, max stay, capacity)

### 🔔 Paid Zone Alerts
- Get notified when you're near paid parking
- Vibration + push notification
- Never get a parking ticket again

### 📱 Installable as App
- Add to Home Screen on iOS/Android
- Feels like a native app
- Works offline (cached assets)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| Map | Leaflet.js + OpenStreetMap |
| Parking Data | Overpass API (OpenStreetMap) |
| AI | Gemini Vision API |
| PWA | Service Worker + Web Manifest |
| Notifications | Web Push API |

## Project Structure

```
parkscan-app/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker (caching + push)
│   └── icons/                 # App icons
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with PWA meta
│   │   ├── page.tsx           # Main app (settings, history, panels)
│   │   └── globals.css        # Tailwind + custom styles
│   └── components/
│       ├── CameraView.tsx     # Camera, AI scanning, results
│       └── ParkingMap.tsx     # Leaflet map, Overpass API, alerts
├── .env.example               # API key template
├── .gitignore                 # Excludes .env*, node_modules, .next
├── next.config.ts             # PWA headers config
├── package.json               # Dependencies
└── README.md                  # This file
```

## Setup

### Prerequisites
- Node.js 18+
- A Gemini API key (free)

### 1. Get API Key
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key
3. Copy it

### 2. Configure
```bash
cp .env.example .env.local
# Edit .env.local and paste your API key
```

### 3. Run
```bash
npm install
npm run dev
```

### 4. Open on Phone
- Find your computer's IP: `ipconfig`
- Open `http://YOUR_IP:3000` on your phone
- Safari: Tap Share → Add to Home Screen
- Chrome: Tap menu → Add to Home Screen

## Features in Detail

### Camera Integration
- Rear camera by default (for photographing signs)
- Flash toggle for dark areas
- File upload fallback for devices without camera

### AI Sign Reading
- Uses Gemini 3.5 Flash (fast, cheap, accurate)
- French-first prompt tuned for Rennes parking signs
- Handles markdown formatting in responses
- Saves scan history locally

### Parking Zone Detection
- Queries Overpass API for zones near your GPS position
- Detects `fee=yes`, `parking=lane`, `access=customers` tags
- Checks if you're within 50m of a paid zone
- Alerts with vibration and push notification

### Dark Mode
- System-level dark theme
- Inverted map tiles for night-friendly display
- High contrast for outdoor visibility

## API Usage

| API | Cost | Limits |
|-----|------|--------|
| Gemini Vision | Free tier: 15 RPM, 1M tokens/day | Sufficient for personal use |
| Overpass API | Free (OpenStreetMap) | 10,000 requests/day |
| OpenStreetMap | Free | Attribution required |

## Privacy

- API key stored in `.env.local` (never committed to git)
- No user data sent to any server except Gemini API (for sign reading)
- No analytics, no tracking
- Scan history stored in localStorage only

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy the .next folder
```

### Self-Hosted
```bash
npm run build
npm start
```

## License

MIT

---

Built for Rennes, France 🇫🇷
