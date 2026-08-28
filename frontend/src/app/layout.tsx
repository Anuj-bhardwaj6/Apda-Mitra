import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Apda Mitra | India's National Disaster Intelligence Platform",
  description:
    "Mission-critical disaster risk intelligence, real-time landslide warnings, verified evacuation shelters, and emergency operations support powered by NDMA and Ministry of Earth Sciences.",
  keywords: [
    "Apda Mitra",
    "Disaster Management India",
    "NDMA",
    "Landslide Warning",
    "Emergency Shelters",
    "Weather Intelligence",
  ],
  authors: [{ name: "National Disaster Management Authority (NDMA)" }],
};

export const viewport: Viewport = {
  themeColor: "#0F4C81",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F7F8FA] text-[#1F2937] font-sans selection:bg-[#0F4C81] selection:text-white">
        {children}
      </body>
    </html>
  );
}
