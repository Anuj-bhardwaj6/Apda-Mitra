'use client';

import React from 'react';
import { Home, Hospital, Shield, Flame, Navigation, Phone, ChevronRight } from 'lucide-react';
import { ShelterItem } from '@/shared/types';

interface SafePlacesCarouselProps {
  places: ShelterItem[];
  onSelectPlace: (place: ShelterItem) => void;
  lang: 'en' | 'hi';
}

export const SafePlacesCarousel: React.FC<SafePlacesCarouselProps> = ({
  places,
  onSelectPlace,
  lang,
}) => {
  const getIcon = (type: ShelterItem['type']) => {
    switch (type) {
      case 'hospital':
        return <Hospital className="w-4 h-4 text-[#D32F2F]" />;
      case 'police':
        return <Shield className="w-4 h-4 text-[#0F4C81]" />;
      case 'fire_station':
        return <Flame className="w-4 h-4 text-[#E65100]" />;
      default:
        return <Home className="w-4 h-4 text-[#2E7D32]" />;
    }
  };

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
          {lang === 'hi' ? 'निकटवर्ती सुरक्षित स्थान' : 'Nearby Safe Places'}
        </h3>
        <span className="text-[11px] text-[#0F4C81] dark:text-[#81D4FA] font-bold">
          {lang === 'hi' ? '24/7 खुले केंद्र' : '24/7 Verified Safe'}
        </span>
      </div>

      <div className="flex items-center space-x-3 overflow-x-auto pb-1 no-scrollbar select-none">
        {places.map((place) => (
          <div
            key={place.id}
            onClick={() => onSelectPlace(place)}
            className="min-w-[260px] sm:min-w-[280px] p-3.5 bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 shrink-0"
          >
            {/* Top Row: Icon, Name & Distance */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] dark:bg-[#1B2738] flex items-center justify-center shrink-0">
                  {getIcon(place.type)}
                </div>
                <div className="truncate max-w-[150px]">
                  <h4 className="text-xs font-bold text-[#1F2937] dark:text-white truncate">
                    {lang === 'hi' ? place.nameHi : place.name}
                  </h4>
                  <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                    {place.address}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black text-[#2E7D32] bg-[#E8F5E9] dark:bg-[#1A3320] px-2 py-0.5 rounded-full shrink-0">
                {place.distanceKm} km
              </span>
            </div>

            {/* ETA & Capacity Row */}
            <div className="flex items-center justify-between text-[11px] text-[#4B5563] dark:text-[#CBD5E1]">
              <span className="font-semibold">
                ETA: <strong>{place.etaMins} mins</strong>
              </span>
              {place.capacity && (
                <span>
                  {place.occupancy}/{place.capacity} spots
                </span>
              )}
            </div>

            {/* Action Buttons: Call & Directions */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <a
                href={`tel:${place.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="py-2 bg-[#F8FAFC] dark:bg-[#1B2738] hover:bg-[#F1F5F9] border border-[#CBD5E1] dark:border-[#24344B] text-[#1F2937] dark:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Phone className="w-3 h-3" />
                <span>{lang === 'hi' ? 'कॉल' : 'Call'}</span>
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, '_blank');
                }}
                className="py-2 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-xs"
              >
                <Navigation className="w-3 h-3" />
                <span>{lang === 'hi' ? 'दिशा-मार्ग' : 'Navigate'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
