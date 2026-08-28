'use client';

import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  MapPin,
  ShieldCheck,
  Home,
  GraduationCap,
  Building2,
  Trees,
  Users,
  Navigation,
  ChevronRight,
  ShieldAlert,
  User,
  Phone,
  Settings
} from 'lucide-react';
import { SavedPlace } from '@/lib/api';

interface SavedPlacesProps {
  places: SavedPlace[];
  onAddPlace: (name: string, placeType: string, lat: number, lon: number) => void;
  onRemovePlace: (id: number) => void;
  onSelectPlace: (lat: number, lon: number, name: string) => void;
  lang?: 'en' | 'hi';
}

export const SavedPlacesCard: React.FC<SavedPlacesProps> = ({
  places,
  onAddPlace,
  onRemovePlace,
  onSelectPlace,
  lang = 'en',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('home');
  const [newLat, setNewLat] = useState('11.5540');
  const [newLon, setNewLon] = useState('76.1280');

  const defaultMockPlaces: SavedPlace[] = [
    {
      id: 1,
      name: 'Family Residence (Home)',
      place_type: 'home',
      latitude: 11.6854,
      longitude: 76.1320,
      last_risk_level: 'Moderate',
      last_risk_score: 45.0,
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Parents' House (Attamala)",
      place_type: 'parents_house',
      latitude: 11.6420,
      longitude: 76.1150,
      last_risk_level: 'High',
      last_risk_score: 72.0,
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Children's High School (Meppadi)",
      place_type: 'school',
      latitude: 11.6910,
      longitude: 76.1400,
      last_risk_level: 'Low',
      last_risk_score: 18.0,
      updated_at: new Date().toISOString(),
    },
  ];

  const displayPlaces = places.length > 0 ? places : defaultMockPlaces;

  const getPlaceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home':
        return <Home className="w-5 h-5 text-[#0F4C81]" />;
      case 'parents_house':
        return <Users className="w-5 h-5 text-[#2E7D32]" />;
      case 'school':
        return <GraduationCap className="w-5 h-5 text-[#D97706]" />;
      case 'office':
        return <Building2 className="w-5 h-5 text-[#7C3AED]" />;
      case 'farm':
        return <Trees className="w-5 h-5 text-[#059669]" />;
      default:
        return <MapPin className="w-5 h-5 text-[#6B7280]" />;
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddPlace(newName.trim(), newType, parseFloat(newLat), parseFloat(newLon));
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-28 max-w-3xl mx-auto w-full">
      {/* 1. Citizen Profile Header */}
      <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#1F2937]">
                {lang === 'hi' ? 'नागरिक सुरक्षा प्रोफाइल' : 'Citizen Safety Profile'}
              </h2>
              <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {lang === 'hi' ? 'सक्रिय' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {lang === 'hi' ? 'एनडीएमए राष्ट्रीय आपदा नेटवर्क से संबद्ध' : 'Connected to NDMA Disaster Network • Kerala Sector'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="apda-btn-primary text-xs py-2 px-3.5 min-h-[40px] font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">{lang === 'hi' ? 'स्थान जोड़ें' : 'Add Place'}</span>
        </button>
      </div>

      {/* 2. Add New Place Form (Collapsible) */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="apda-card p-4 sm:p-5 border-2 border-[#0F4C81] bg-[#F8FAFC] space-y-3 animate-in fade-in"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F4C81]">
            {lang === 'hi' ? 'नया आवश्यक स्थान सुरक्षित करें' : 'Monitor New Family Location'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">
                {lang === 'hi' ? 'स्थान का नाम' : 'Location Name'}
              </label>
              <input
                type="text"
                placeholder={lang === 'hi' ? 'उदा. घर, माता-पिता का घर' : 'e.g. Home, Parents House'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">
                {lang === 'hi' ? 'स्थान का प्रकार' : 'Place Category'}
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-white text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="home">Home / निवास</option>
                <option value="parents_house">Parents House / माता-पिता का घर</option>
                <option value="school">School / College / विद्यालय</option>
                <option value="office">Office / Workplace / कार्यस्थल</option>
                <option value="farm">Farm / Plantation / बागान</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Latitude</label>
              <input
                type="text"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                className="w-full bg-white text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#4B5563] block mb-1">Longitude</label>
              <input
                type="text"
                value={newLon}
                onChange={(e) => setNewLon(e.target.value)}
                className="w-full bg-white text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 text-[#4B5563] text-xs font-semibold rounded-xl"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="apda-btn-primary text-xs py-2 px-5 min-h-[38px] font-bold"
            >
              {lang === 'hi' ? 'सहेजें और निगरानी करें' : 'Save & Monitor Risk'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Saved Places Safety Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-[#0F4C81]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
              {lang === 'hi' ? 'सहेजे गए स्थान और सुरक्षा स्थिति' : 'Monitored Locations & Real-Time Safety'}
            </h3>
          </div>
          <span className="text-[11px] text-[#6B7280]">
            {displayPlaces.length} {lang === 'hi' ? 'स्थान' : 'Monitored'}
          </span>
        </div>

        {displayPlaces.map((place) => {
          const isHigh = place.last_risk_level?.toLowerCase() === 'high';
          const isMod = place.last_risk_level?.toLowerCase() === 'moderate';
          return (
            <div
              key={place.id}
              className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3 hover:border-[#0F4C81]/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center shrink-0 shadow-2xs">
                    {getPlaceIcon(place.place_type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1F2937]">{place.name}</h4>
                    <p className="text-xs text-[#6B7280]">
                      {place.address || `GPS: ${place.latitude.toFixed(4)}°N, ${place.longitude.toFixed(4)}°E`}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    isHigh
                      ? 'bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]'
                      : isMod
                      ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                      : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                  }`}
                >
                  {place.last_risk_level} ({place.last_risk_score}/100)
                </span>
              </div>

              {/* Status & Navigation Action */}
              <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                <button
                  onClick={() => onSelectPlace(place.latitude, place.longitude, place.name)}
                  className="text-xs text-[#0F4C81] hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hi' ? 'लाइव मानचित्र पर देखें' : 'Inspect Risk on Map'}
                  </span>
                </button>

                <button
                  onClick={() => onRemovePlace(place.id)}
                  className="p-1.5 text-[#9CA3AF] hover:text-[#C62828] rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Remove location"
                  aria-label="Remove location"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
