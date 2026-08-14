# ParkScan App

Parking sign reader for Rennes, France. Point at a French parking sign, get an instant answer.

## Features

- **AI Sign Reader** — Point camera at parking signs, get instant plain-language answers
- **Live Parking Map** — See free (green) and paid (red) parking zones near you
- **Paid Zone Alerts** — Get notified when you're near paid parking
- **PWA Installable** — Add to home screen, feels like a native app
- **Push Notifications** — iOS and Android support

## Setup

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Copy `.env.example` to `.env.local` and add your key
3. Run the dev server: `npm run dev`
4. Open on your phone: `http://YOUR_IP:3000`

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS
- Leaflet.js + OpenStreetMap
- Overpass API (parking zones)
- Gemini Vision API (sign reading)
- PWA (installable, offline support)
- Web Push Notifications

## Build & Deploy

```bash
npm run build
npm start
```

Deploy to Vercel, Netlify, or any Node.js hosting.

## License

MIT
