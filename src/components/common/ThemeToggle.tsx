"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDarkSaved = localStorage.getItem("apda_theme") === "dark";
    setIsDark(isDarkSaved);
    if (isDarkSaved) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("apda_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("apda_theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-btn text-gov-muted hover:text-gov-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none"
      title={isDark ? "Switch to Calm Daylight Mode" : "Switch to Low-Light Night Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gov-primary" />}
    </button>
  );
}
