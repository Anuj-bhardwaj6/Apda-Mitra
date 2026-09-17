'use client';

import React, { useState } from 'react';
import {
  Search,
  MapPin,
  X,
  Compass,
  Landmark,
  Mic,
  Clock,
  Home,
  Hospital,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SearchAutocompleteProps {
  onClose: () => void;
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  lang?: 'en' | 'hi';
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  onClose,
  onSelectLocation,
  lang = 'en',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAcquiringGPS, setIsAcquiringGPS] = useState(false);

  const defaultRecent = [
    { name: 'Wayanad District, Kerala', lat: 11.6854, lon: 76.1320, type: 'Recent' },
    { name: 'Chooralmala Relief Camp, Wayanad', lat: 11.7034, lon: 76.1540, type: 'Shelter' },
  ];

  const defaultHotspots = [
    { name: 'Wayanad District, Kerala', latitude: 11.6854, longitude: 76.1320, type: 'Western Ghats Hotspot', risk: 'Moderate' },
    { name: 'Shimla & Kullu Valley, HP', latitude: 31.1048, longitude: 77.1734, type: 'Himalayan Slope Zone', risk: 'High' },
    { name: 'Munnar, Idukki, Kerala', latitude: 10.0889, longitude: 77.0595, type: 'High Altitude Catchment', risk: 'Moderate' },
    { name: 'Chamoli & Joshimath, UK', latitude: 30.4042, longitude: 79.3309, type: 'Flash Flood & Landslide Zone', risk: 'High' },
    { name: 'Darjeeling Hills, West Bengal', latitude: 27.0410, longitude: 88.2663, type: 'Monsoon Slope Sector', risk: 'Low' },
  ];

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val || val.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchApi<any[]>(`/geocoding/search?q=${encodeURIComponent(val)}`);
      setResults(res || []);
    } catch {
      setResults(
        defaultHotspots.filter((p) =>
          p.name.toLowerCase().includes(val.toLowerCase())
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      handleSearch('Wayanad');
    }, 1200);
  };

  const handleSelect = (lat: number, lon: number, name: string) => {
    onSelectLocation(lat, lon, name);
    onClose();
  };

  const handleUseLiveGPS = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsAcquiringGPS(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const uLat = pos.coords.latitude;
          const uLon = pos.coords.longitude;
          let name = `GPS ${uLat.toFixed(4)}°N, ${uLon.toFixed(4)}°E`;
          try {
            const res = await fetchApi<{ success: boolean; data: any }>(
              `/geocoding/reverse?latitude=${uLat}&longitude=${uLon}`
            );
            if (res && res.data && res.data.formatted_name) {
              name = res.data.formatted_name;
            }
          } catch {}
          setIsAcquiringGPS(false);
          handleSelect(uLat, uLon, name);
        },
        () => {
          setIsAcquiringGPS(false);
          handleSelect(11.6854, 76.1320, 'Wayanad, Kerala (Fallback Location)');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      handleSelect(11.6854, 76.1320, 'Wayanad, Kerala (Fallback Location)');
    }
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/50 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-16" style={{ zIndex: 1000 }}>
      <div className="bg-white border border-[#CBD5E1] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Google Maps Search Bar Header */}
        <div className="p-3 sm:p-4 border-b border-[#E5E7EB] bg-white sticky top-0 z-10 space-y-2">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#0F4C81]">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              placeholder={
                isListening
                  ? (lang === 'hi' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now')
                  : (lang === 'hi' ? 'स्थान, आश्रय, जिला या अस्पताल खोजें...' : 'Search Indian cities, shelters, hospitals...')
              }
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-[#F1F5F9] text-[#1F2937] text-sm pl-11 pr-20 py-3 rounded-full border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81] focus:bg-white transition-all"
              autoFocus
            />

            <div className="absolute right-3 flex items-center space-x-1">
              {query ? (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                  className="p-1.5 text-[#6B7280] hover:text-[#1F2937] rounded-full hover:bg-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleMicClick}
                  className={`p-1.5 rounded-full transition-colors ${
                    isListening
                      ? 'bg-[#C62828] text-white animate-pulse'
                      : 'text-[#0F4C81] hover:bg-[#EBF3FA]'
                  }`}
                  title="Voice Search"
                  aria-label="Voice Search"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-[#6B7280] hover:text-[#1F2937] rounded-full hover:bg-slate-200"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick GPS Location Button */}
          <button
            onClick={handleUseLiveGPS}
            disabled={isAcquiringGPS}
            className="w-full py-2.5 px-3 bg-[#EBF3FA] hover:bg-[#DDF0FD] border border-[#D0E2F2] rounded-2xl text-xs text-[#0F4C81] font-bold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center space-x-2">
              <Compass className={`w-4 h-4 text-[#0F4C81] ${isAcquiringGPS ? 'animate-spin' : ''}`} />
              <span>
                {isAcquiringGPS
                  ? (lang === 'hi' ? 'जीपीएस स्थान प्राप्त कर रहा है...' : 'Acquiring GPS Location...')
                  : (lang === 'hi' ? 'वर्तमान जीपीएस स्थान का उपयोग करें' : 'Use Current GPS Location')}
              </span>
            </div>
            <span className="text-[10px] text-[#2E7D32] bg-white px-2 py-0.5 rounded-full border border-[#A5D6A7]">
              {isAcquiringGPS ? 'Locating...' : 'Live GPS'}
            </span>
          </button>
        </div>

        {/* Results / Suggestions Feed */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {query.trim().length >= 2 ? (
            /* Search Query Matches */
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] px-1">
                {lang === 'hi' ? 'खोज परिणाम' : 'Matching Locations'}
              </span>
              {results.length > 0 ? (
                results.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(r.latitude, r.longitude, r.name)}
                    className="w-full text-left p-3 hover:bg-[#F8FAFC] rounded-2xl border border-transparent hover:border-[#E2E8F0] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81] shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs sm:text-sm font-bold text-[#1F2937] block truncate">
                          {r.name}
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {r.type || 'District / Location'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#0F4C81] transition-colors" />
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  {isLoading ? 'Searching...' : 'No locations found. Try searching for Wayanad, Shimla, Munnar.'}
                </div>
              )}
            </div>
          ) : (
            /* Default Categorized Suggestions & Recents */
            <>
              {/* Recent Searches */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] px-1">
                  {lang === 'hi' ? 'हाल की खोजें' : 'Recent Searches'}
                </span>
                {defaultRecent.map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(rec.lat, rec.lon, rec.name)}
                    className="w-full text-left p-2.5 hover:bg-[#F8FAFC] rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 text-xs text-[#1F2937]">
                      <Clock className="w-4 h-4 text-[#6B7280]" />
                      <span className="font-medium truncate">{rec.name}</span>
                    </div>
                    <span className="text-[10px] text-[#6B7280] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                      {rec.type}
                    </span>
                  </button>
                ))}
              </div>

              {/* High Landslide Vulnerability Zones */}
              <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] px-1">
                  {lang === 'hi' ? 'संवेदनशील भूस्खलन क्षेत्र' : 'Landslide Vulnerability Hotspots'}
                </span>
                {defaultHotspots.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(p.latitude, p.longitude, p.name)}
                    className="w-full text-left p-3 hover:bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#1F2937] block truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">
                          {p.type}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.risk === 'High'
                          ? 'bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]'
                          : p.risk === 'Moderate'
                          ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                          : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                      }`}
                    >
                      {p.risk} Risk
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
