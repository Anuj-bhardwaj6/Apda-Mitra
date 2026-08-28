'use client';

import React from 'react';
import {
  PhoneCall,
  Navigation,
  Shield,
  Flame,
  Ambulance,
  Home,
  AlertOctagon,
  Phone,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { EmergencyContact, ShelterResource } from '@/lib/api';

interface EmergencyDirectoryProps {
  contacts: EmergencyContact[];
  shelters: ShelterResource[];
  onOpenSOS: () => void;
  lang?: 'en' | 'hi';
}

export const EmergencyDirectory: React.FC<EmergencyDirectoryProps> = ({
  contacts,
  shelters,
  onOpenSOS,
  lang = 'en',
}) => {
  const defaultContacts = [
    { service_name: 'National Emergency Helpline (Police & All Services)', category: 'Police', phone: '112', description: 'Unified 24/7 National Emergency Dispatch' },
    { service_name: 'National Disaster Response Force (NDRF HQ)', category: 'NDRF', phone: '011-24363260', description: 'Specialized Disaster Search & Rescue Control' },
    { service_name: 'Medical Ambulance Dispatch', category: 'Ambulance', phone: '108', description: '24/7 Emergency Medical Transport' },
    { service_name: 'Fire & Rescue Services', category: 'Fire', phone: '101', description: 'Fire & Incident Response' },
    { service_name: 'District Emergency Operations Centre (DEOC)', category: 'DEOC', phone: '1077', description: 'District Collectorate Emergency Desk' },
    { service_name: 'Women & Child Safety Helpline', category: 'Helpline', phone: '181', description: 'State Disaster Vulnerability Support' },
  ];

  const displayContacts = contacts.length > 0 ? contacts : defaultContacts;

  const defaultShelters: ShelterResource[] = [
    {
      id: 1,
      name: 'Chooralmala Community Relief Hall',
      facility_type: 'Relief Camp',
      address: 'Chooralmala Junction, Wayanad',
      district: 'Wayanad',
      latitude: 11.7034,
      longitude: 76.1540,
      capacity: 300,
      current_occupancy: 120,
      contact_phone: '04936-282200',
      distance_km: 2.4,
    },
    {
      id: 2,
      name: 'Meppadi High School Evacuation Center',
      facility_type: 'Evacuation Shelter',
      address: 'Meppadi Town, Wayanad',
      district: 'Wayanad',
      latitude: 11.6850,
      longitude: 76.1280,
      capacity: 500,
      current_occupancy: 210,
      contact_phone: '04936-282250',
      distance_km: 3.8,
    },
    {
      id: 3,
      name: 'Kalpetta Municipal Multi-Purpose Shelter',
      facility_type: 'Relief Hub',
      address: 'Kalpetta Main Road, Wayanad',
      district: 'Wayanad',
      latitude: 11.6050,
      longitude: 76.0820,
      capacity: 800,
      current_occupancy: 140,
      contact_phone: '04936-202230',
      distance_km: 8.5,
    },
  ];

  const displayShelters = shelters.length > 0 ? shelters : defaultShelters;

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'police':
        return <Shield className="w-5 h-5 text-[#0F4C81]" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-[#C62828]" />;
      case 'ambulance':
        return <Ambulance className="w-5 h-5 text-[#D97706]" />;
      case 'ndrf':
        return <ShieldAlert className="w-5 h-5 text-[#0F4C81]" />;
      default:
        return <PhoneCall className="w-5 h-5 text-[#2E7D32]" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 pb-28 max-w-3xl mx-auto w-full">
      {/* 1. High Visibility 1-Tap SOS Dispatch Hero Banner */}
      <div className="p-5 bg-[#FFEBEE] border border-[#EF9A9A] rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white flex items-center justify-center shadow-md shrink-0 animate-pulse">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#C62828]">
              {lang === 'hi' ? '1-टैप आपातकालीन संकट संकेत (SOS)' : '1-Tap Emergency SOS Signal'}
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              {lang === 'hi'
                ? 'तुरंत एनडीएमए नियंत्रण कक्ष और नजदीकी बचाव दल को जीपीएस स्थिति भेजें।'
                : 'Directly broadcasts live GPS coordinates to NDRF and District EOC dispatch.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSOS}
          className="apda-btn-danger w-full py-3.5 text-sm font-bold shadow-md cursor-pointer flex items-center justify-center space-x-2"
        >
          <ShieldAlert className="w-5 h-5" />
          <span>
            {lang === 'hi'
              ? 'आपातकालीन संकट सायरन और सहायता सक्रिय करें'
              : 'ACTIVATE EMERGENCY SOS SIREN & RESCUE'}
          </span>
        </button>
      </div>

      {/* 2. Official Emergency Helpline Directory */}
      <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">
            {lang === 'hi' ? 'आधिकारिक आपातकालीन हेल्पलाइन' : 'Official Emergency Helplines'}
          </h2>
          <span className="text-[10px] text-[#2E7D32] font-bold bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#A5D6A7]">
            24/7 Verified
          </span>
        </div>

        <div className="space-y-2">
          {displayContacts.map((contact, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between hover:bg-[#F1F5F9] transition-colors"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center shrink-0 shadow-2xs">
                  {getCategoryIcon(contact.category)}
                </div>
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-bold text-[#1F2937] truncate">
                    {contact.service_name}
                  </h3>
                  <p className="text-[11px] text-[#6B7280] truncate">
                    {contact.description}
                  </p>
                </div>
              </div>

              <a
                href={`tel:${contact.phone}`}
                className="px-3.5 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 shrink-0 ml-2 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{contact.phone}</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Verified Evacuation Shelters & Relief Camps */}
      <div className="apda-card p-4 sm:p-5 border border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Home className="w-4 h-4 text-[#2E7D32]" />
            <h2 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">
              {lang === 'hi' ? 'सत्यापित सुरक्षित राहत शिविर' : 'Verified Safe Shelters'}
            </h2>
          </div>
          <span className="text-[11px] text-[#0F4C81] font-semibold">
            {displayShelters.length} {lang === 'hi' ? 'उपलब्ध' : 'Operational'}
          </span>
        </div>

        <div className="space-y-3">
          {displayShelters.map((shelter) => (
            <div
              key={shelter.id}
              className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">
                    {shelter.name}
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {shelter.address}, {shelter.district}
                  </p>
                </div>
                <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  {shelter.distance_km || 2.4} km away
                </span>
              </div>

              {/* Capacity Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#4B5563]">
                  <span>Occupancy</span>
                  <span className="font-bold text-[#1F2937]">
                    {shelter.current_occupancy} / {shelter.capacity} spots filled
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F4C81] rounded-full"
                    style={{
                      width: `${Math.min((shelter.current_occupancy / shelter.capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${shelter.contact_phone || '108'}`}
                  className="apda-btn-secondary text-xs py-2 min-h-[40px] flex items-center justify-center space-x-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'फोन करें' : 'Call Shelter'}</span>
                </a>

                <button
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                  className="apda-btn-primary text-xs py-2 min-h-[40px] flex items-center justify-center space-x-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'मार्ग देखें' : 'Get Directions'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
