import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { LocationProvider } from "@/context/LocationProvider";
import { QueryProvider } from "@/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "APDA MITRA (आपदा मित्र) | National Disaster Intelligence Platform",
  description:
    "Official Government of India AI-Powered Disaster Intelligence Platform. Real-time early warnings, safe evacuation routing, verified relief shelters, and IMD Doppler tracking by NDMA.",
  applicationName: "APDA MITRA",
  authors: [{ name: "National Disaster Management Authority (NDMA)" }],
  keywords: [
    "NDMA",
    "IMD",
    "Disaster Management",
    "Cyclone Warning",
    "Flood Inundation",
    "Relief Camps",
    "Government of India",
    "Emergency 112",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0F4C81",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-gov-bg text-gov-text dark:bg-gov-dark dark:text-white min-h-screen flex flex-col antialiased selection:bg-gov-primary selection:text-white">
        <QueryProvider>
          <LocationProvider>
            <OfflineBanner />
            {children}
          </LocationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
