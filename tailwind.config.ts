import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          primary: "#0F4C81",
          deep: "#123B5D",
          primaryHover: "#0A365C",
          primaryLight: "#E8F1F8",
          bg: "#F6F8FA",
          surface: "#FFFFFF",
          neutral: "#64748B",
          text: "#16202A",
          muted: "#5F6D7E",
          border: "#E4E7EC",
          dark: "#0B111A",
          darkSurface: "#121A24",
          darkBorder: "#1E293B",
        },
        status: {
          success: "#2E7D32",
          successLight: "#E8F5E9",
          warning: "#F59E0B",
          warningLight: "#FEF3C7",
          danger: "#C62828",
          dangerLight: "#FFEBEE",
          info: "#1976D2",
          infoLight: "#E8F1F8",
        },
      },
      borderRadius: {
        btn: "16px",
        card: "24px",
        sheet: "28px",
        pill: "9999px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(15, 76, 129, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        card: "0 4px 16px -2px rgba(15, 76, 129, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
        elevation: "0 12px 32px -4px rgba(15, 76, 129, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
        sheet: "0 -8px 32px rgba(15, 76, 129, 0.1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
