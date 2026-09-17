"use client";

import React, { useState } from "react";
import { Search, X, MapPin, Mic, Navigation2 } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onLocateMe?: () => void;
  className?: string;
}

export function SearchBar({
  placeholder = "Search districts, relief shelters, cyclone track...",
  onSearch,
  onLocateMe,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleClear = () => {
    setValue("");
    onSearch?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.(value);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full bg-gov-surface dark:bg-gov-darkSurface rounded-card shadow-elevation px-4 py-3 transition-shadow duration-200 focus-within:shadow-floating",
        className
      )}
    >
      <Search className="w-5 h-5 text-gov-primary shrink-0 mr-3" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch?.(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent border-none text-gov-text dark:text-white placeholder:text-gov-muted text-base focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 rounded-full text-gov-muted hover:text-gov-text hover:bg-black/5 transition-colors mr-1"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}

      {onLocateMe && (
        <button
          type="button"
          onClick={onLocateMe}
          className="p-2 rounded-btn text-gov-primary hover:bg-gov-primaryLight transition-colors ml-1 flex items-center gap-1.5 text-xs font-semibold"
          title="Detect Current Location"
        >
          <Navigation2 className="w-4 h-4" />
          <span className="hidden sm:inline">Locate</span>
        </button>
      )}
    </div>
  );
}
