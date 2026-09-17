import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APDA MITRA - India's Disaster Intelligence Platform",
    short_name: "Apda Mitra",
    description: "Official AI Powered Disaster Intelligence & Emergency Platform, Government of India",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#0F4C81",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
