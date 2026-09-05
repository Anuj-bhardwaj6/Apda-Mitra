'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  Radio,
  CheckCircle,
  X,
  ShieldAlert,
  MapPin,
  Clock,
  Phone,
  RotateCcw
} from 'lucide-react';

interface EmergencySOSProps {
  locationName: string;
  currentLat: number;
  currentLon: number;
  onClose: () => void;
  lang?: 'en' | 'hi';
}

export const EmergencySOSModal: React.FC<EmergencySOSProps> = ({
  locationName,
  currentLat,
  currentLon,
  onClose,
  lang = 'en',
}) => {
  const [sosActivated, setSosActivated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setSosActivated(true);
      setCountdown(null);
    }
  }, [countdown]);

  const handleCancelCountdown = () => {
    setCountdown(null);
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
      <div className="bg-white border-2 border-[#EF9A9A] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center relative space-y-4 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          aria-label="Close SOS"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SOS Siren Icon */}
        <div className="w-16 h-16 rounded-full bg-[#FFEBEE] border-2 border-[#EF9A9A] text-[#C62828] flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-9 h-9 animate-pulse" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-[#C62828] tracking-tight">
            {lang === 'hi' ? 'राष्ट्रीय आपातकालीन संकट संकेत (SOS)' : 'NATIONAL EMERGENCY SOS DISPATCH'}
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
            {lang === 'hi'
              ? 'यह संकेत तुरंत आपकी लाइव जीपीएस स्थिति एनडीएमए, एनडीआरएफ बटालियन और जिला नियंत्रण कक्ष को प्रसारित करेगा।'
              : 'Directly broadcasts high-priority distress alert & live GPS telemetry to NDRF Battalion 4 and District EOC.'}
          </p>
        </div>

        {/* Location Telemetry Box */}
        <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs text-left space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#6B7280] block">
            {lang === 'hi' ? 'प्रसारित जीपीएस स्थिति' : 'Broadcast GPS Telemetry'}
          </span>
          <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
            <MapPin className="w-3.5 h-3.5 text-[#C62828] shrink-0" />
            <span className="truncate">{locationName}</span>
          </div>
          <div className="text-[11px] text-[#6B7280] font-mono">
            {currentLat.toFixed(5)}°N, {currentLon.toFixed(5)}°E (±3m satellite lock)
          </div>
        </div>

        {/* State 1: Active Countdown */}
        {countdown !== null && (
          <div className="p-5 bg-[#FFEBEE] rounded-2xl border border-[#EF9A9A] space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-[#C62828] uppercase tracking-wider block">
              {lang === 'hi' ? 'संकट संकेत प्रसारण में शेष समय...' : 'Broadcasting SOS Signal in...'}
            </span>
            <div className="text-4xl font-extrabold text-[#C62828] animate-bounce">
              {countdown}
            </div>
            <button
              onClick={handleCancelCountdown}
              className="px-5 py-2 bg-white text-[#C62828] font-bold text-xs rounded-xl border border-[#EF9A9A] shadow-xs cursor-pointer flex items-center justify-center space-x-1 mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'रद्द करें (Abort)' : 'Abort Dispatch'}</span>
            </button>
          </div>
        )}

        {/* State 2: Dispatched Confirmation */}
        {sosActivated && (
          <div className="p-4 bg-[#E8F5E9] rounded-2xl border border-[#A5D6A7] text-xs text-left space-y-2 animate-in fade-in">
            <div className="flex items-center space-x-2 text-[#2E7D32] font-bold text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>{lang === 'hi' ? 'संकट संकेत सफलतापूर्वक प्रसारित!' : 'DISTRESS SIGNAL DISPATCHED!'}</span>
            </div>
            <p className="text-[11px] text-[#2E7D32] leading-relaxed">
              {lang === 'hi'
                ? 'एनडीआरएफ यूनिट और जिला मजिस्ट्रेट नियंत्रण कक्ष को आपकी स्थिति प्राप्त हो गई है। कृपया सुरक्षित स्थान पर रहें।'
                : 'District Emergency Command and NDRF Field Rescue have received your distress coordinates. Stay calm in a secure zone.'}
            </p>
          </div>
        )}

        {/* State 3: Normal Button */}
        {countdown === null && !sosActivated && (
          <button
            onClick={startCountdown}
            className="apda-btn-danger w-full py-4 text-sm font-extrabold rounded-2xl shadow-lg cursor-pointer flex items-center justify-center space-x-2"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>
              {lang === 'hi' ? '1-टैप आपातकालीन संकेत भेजें' : 'TRANSMIT 1-TAP EMERGENCY SOS'}
            </span>
          </button>
        )}

        {/* Direct Call Hotlines */}
        <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-2 gap-2">
          <a
            href="tel:112"
            className="apda-btn-primary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call 112 (Police)</span>
          </a>

          <a
            href="tel:108"
            className="apda-btn-secondary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Call 108 (Ambulance)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
