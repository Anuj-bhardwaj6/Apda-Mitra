'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Navigation, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface LocationSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (name: string, lat: number, lon: number) => void;
  onUseCurrentGPS?: () => void;
  lang: 'en' | 'hi';
}

interface SearchResultItem {
  name: string;
  sub: string;
  lat: number;
  lon: number;
  type?: string;
}

interface GeocodingResultItem {
  name?: string;
  formatted_name?: string;
  city?: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
}

type GeocodingSearchResponse = GeocodingResultItem[] | { success?: boolean; data?: GeocodingResultItem[] };

export const LocationSearchSheet: React.FC<LocationSearchSheetProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  onUseCurrentGPS,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const defaultPreservePlaces: SearchResultItem[] = [
    { name: 'Shimla, Himachal Pradesh', sub: 'Himalayan Ridge • High Slope Risk', lat: 31.1048, lon: 77.1734 },
    { name: 'Darjeeling, West Bengal', sub: 'Eastern Himalayas • Rainfall Catchment', lat: 27.041, lon: 88.2663 },
    { name: 'Munnar (Idukki), Kerala', sub: 'Western Ghats • Tea Estate Valleys', lat: 10.0889, lon: 77.0595 },
    { name: 'Wayanad, Kerala', sub: 'Western Ghats Sector Headquarters', lat: 11.6854, lon: 76.132 },
    { name: 'Dehradun, Uttarakhand', sub: 'Garhwal Valley • Flash Flood Watch', lat: 30.3165, lon: 78.0322 },
    { name: 'Joshimath (Chamoli), Uttarakhand', sub: 'Subsidence Monitoring Zone', lat: 30.557, lon: 79.5665 },
    { name: 'Guwahati, Assam', sub: 'Brahmaputra Flood Plain', lat: 26.1445, lon: 91.7362 },
  ];

  // Live Debounced Search to Photon OpenStreetMap API via FastAPI
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults(defaultPreservePlaces);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetchApi<GeocodingSearchResponse>(`/geocoding/search?q=${encodeURIComponent(searchTerm)}&limit=7`);
        const items = Array.isArray(res) ? res : res.data || [];
        if (items.length > 0) {
          const mapped: SearchResultItem[] = items.map((item) => ({
            name: item.name || item.formatted_name || `Location ${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`,
            sub: [item.city, item.district, item.state].filter(Boolean).join(', ') || 'India',
            lat: item.latitude,
            lon: item.longitude,
          }));
          setResults(mapped);
        } else {
          // Fallback to client filtered default
          setResults(
            defaultPreservePlaces.filter((p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
        }
      } catch (err) {
        setResults(
          defaultPreservePlaces.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 text-[#1F2937] dark:text-white max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black">
              {lang === 'hi' ? 'आप कहाँ देखना चाहते हैं?' : 'Search Any Location in India'}
            </h3>
            <p className="text-[11px] text-gray-500">
              {lang === 'hi' ? 'वास्तविक समय भू-स्थानिक खोज (Open-Meteo & OSM)' : 'Live Open-Meteo & OpenStreetMap Geocoding'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA] absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              lang === 'hi'
                ? 'शहर, कस्बा, गांव या राहत शिविर खोजें...'
                : 'Search town, village, school, hospital, relief camp...'
            }
            className="w-full h-12 pl-10 pr-10 bg-[#F8FAFC] dark:bg-[#1B2738] border border-[#CBD5E1] dark:border-[#24344B] rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#0F4C81] dark:focus:border-[#81D4FA]"
            autoFocus
          />
          {isLoading && (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin absolute right-3.5 top-4" />
          )}
        </div>

        {/* Quick GPS Location Button */}
        <button
          onClick={() => {
            if (onUseCurrentGPS) {
              onUseCurrentGPS();
              onClose();
            }
          }}
          className="w-full py-2.5 px-3.5 bg-[#EBF3FA] dark:bg-[#1B2738] hover:bg-[#DDF0FD] dark:hover:bg-[#24344B] border border-[#D0E2F2] dark:border-[#24344B] rounded-2xl text-xs text-[#0F4C81] dark:text-[#81D4FA] font-bold flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA]" />
            <span>{lang === 'hi' ? 'वर्तमान जीपीएस स्थान का उपयोग करें' : 'Use Current Live GPS Location'}</span>
          </div>
          <span className="text-[10px] text-[#2E7D32] dark:text-[#81C784] bg-white dark:bg-[#131D2A] px-2 py-0.5 rounded-full border border-[#A5D6A7] dark:border-[#2E7D32] font-bold">
            Live GPS
          </span>
        </button>

        {/* Quick Suggestions List */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-[#9CA3AF] block">
            {searchTerm
              ? lang === 'hi' ? 'खोज परिणाम' : 'Live Search Results'
              : lang === 'hi' ? 'सुझाए गए आपदा प्रवण क्षेत्र' : 'High Vulnerability Hazard Sectors'}
          </span>

          {results.length === 0 && !isLoading && (
            <div className="py-6 text-center text-xs text-gray-400">
              No matching locations found. Try searching for Shimla, Munnar, or Wayanad.
            </div>
          )}

          {results.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectLocation(item.name, item.lat, item.lon);
                onClose();
              }}
              className="w-full p-3 rounded-2xl bg-white dark:bg-[#1B2738] hover:bg-[#F1F5F9] dark:hover:bg-[#24344B] border border-[#E2E8F0] dark:border-[#24344B] flex items-center justify-between transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-[#EBF3FA] dark:bg-[#14202E] text-[#0F4C81] dark:text-[#81D4FA] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-[#1F2937] dark:text-white truncate">
                    {item.name}
                  </h4>
                  <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate block">
                    {item.sub}
                  </span>
                </div>
              </div>
              <Navigation className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#0F4C81] transition-colors shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
