'use client';

import React, { useState } from 'react';
import { Navigation, AlertTriangle, CheckCircle2, Clock, ShieldCheck, X, ArrowRight, MapPin } from 'lucide-react';
import { JourneyRepository } from '@/repositories/ShelterAndJourneyRepository';
import { JourneyAssessment } from '@/shared/types';

interface PredictiveJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const PredictiveJourneyModal: React.FC<PredictiveJourneyModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [origin, setOrigin] = useState('Wayanad, Kerala');
  const [destination, setDestination] = useState('Ooty, Tamil Nadu');
  const [depTime, setDepTime] = useState('5:30 PM');
  const [assessment, setAssessment] = useState<JourneyAssessment | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  if (!isOpen) return null;

  const handleAssess = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const res = JourneyRepository.assessTrip(origin, destination, depTime);
      setAssessment(res);
      setIsEvaluating(false);
    }, 600);
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
      <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] w-full max-w-lg rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 relative animate-in fade-in zoom-in-95 text-[#1F2937] dark:text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1F2937] p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3FA] dark:bg-[#1B2738] flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA] shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black">
              {lang === 'hi' ? 'पूर्वानुमानित सुरक्षित यात्रा योजना' : 'Predictive Journey Safety AI'}
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {lang === 'hi' ? 'मार्ग में मौसम एवं भूस्खलन जोखिम का अग्रिम विश्लेषण' : 'Pre-trip weather & landslide hazard assessment'}
            </p>
          </div>
        </div>

        {/* Trip Inputs */}
        <div className="space-y-2.5 pt-1">
          <div className="p-3 bg-[#F8FAFC] dark:bg-[#1B2738] rounded-2xl border border-[#E2E8F0] dark:border-[#24344B] space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#2E7D32]" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="From..."
                className="w-full bg-transparent text-xs sm:text-sm font-semibold focus:outline-none"
              />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#D32F2F]" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="To..."
                className="w-full bg-transparent text-xs sm:text-sm font-semibold focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleAssess}
            disabled={isEvaluating}
            className="w-full min-h-[46px] bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isEvaluating
                ? (lang === 'hi' ? 'मार्ग विश्लेषण हो रहा है...' : 'Evaluating Route Hazards...')
                : (lang === 'hi' ? 'मार्ग सुरक्षा की जांच करें' : 'Assess Journey Safety')}
            </span>
          </button>
        </div>

        {/* AI Journey Assessment Card */}
        {assessment && (
          <div className="p-4 rounded-2xl bg-[#FFF3E0] dark:bg-[#2D1F10] border border-[#FFE082] dark:border-[#5A3816] space-y-3 animate-in slide-in-from-bottom-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E65100] text-white font-extrabold text-[10px]">
                🟠 {lang === 'hi' ? 'मध्यम जोखिम चेतावनी' : 'Moderate Risk'}
              </span>
              <span className="text-[#2E7D32] dark:text-[#81C784] font-black text-xs">
                +{assessment.safetyImprovementPct}% Safer
              </span>
            </div>

            <p className="font-bold text-[#1F2937] dark:text-white text-xs sm:text-sm leading-snug">
              {lang === 'hi' ? assessment.summaryHi : assessment.summary}
            </p>

            {/* Recommended Route Badge */}
            <div className="p-2.5 bg-white dark:bg-[#1B2738] rounded-xl border border-[#CBD5E1] dark:border-[#24344B] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block font-bold">
                  {lang === 'hi' ? 'अनुशंसित सुरक्षित मार्ग' : 'Recommended Route'}
                </span>
                <span className="font-extrabold text-[#0F4C81] dark:text-[#81D4FA] text-xs">
                  {assessment.recommendedRoute}
                </span>
              </div>
              <span className="text-[11px] text-[#E65100] font-bold">
                +{assessment.estimatedDelayMins} min delay
              </span>
            </div>

            {/* Waypoints Hazard Path */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase text-[#6B7280]">
                {lang === 'hi' ? 'मार्ग बिंदु स्थिति' : 'Waypoint Clearance'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {assessment.waypoints.map((wp, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                      wp.hazardStatus === 'warning'
                        ? 'bg-[#FFEBEE] border-[#FFCDD2] text-[#B71C1C] font-bold'
                        : 'bg-white/80 dark:bg-[#14202E] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="truncate">{wp.name}</span>
                    {wp.hazardStatus === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#D32F2F]" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2E7D32]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`, '_blank');
              }}
              className="w-full py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer text-xs sm:text-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>{lang === 'hi' ? 'सुरक्षित नेविगेशन शुरू करें' : 'Start Safe Navigation'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
