import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParkScan — AI Parking Sign Reader · Rennes",
  description:
    "Point your phone at any French parking sign and get an instant AI-powered answer. Live paid parking zone map for Rennes. Never get a ticket again.",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/parkscan_icon.jpeg",
    apple: "/assets/parkscan_icon.jpeg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ParkScan",
  },
  formatDetection: { telephone: false },
  keywords: ["parking", "Rennes", "France", "AI", "panneau", "stationnement", "PWA"],
  openGraph: {
    title: "ParkScan — AI Parking Sign Reader",
    description: "Never get a parking ticket in Rennes again.",
    type: "website",
    images: [{ url: "/assets/parkscan_icon.jpeg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#080810",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/assets/parkscan_icon.jpeg" />
        <link rel="icon" type="image/jpeg" href="/assets/parkscan_icon.jpeg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
