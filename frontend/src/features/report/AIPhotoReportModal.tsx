'use client';

import React, { useState } from 'react';
import { Camera, Sparkles, CheckCircle2, AlertTriangle, X, Upload } from 'lucide-react';

interface AIPhotoReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  lang: 'en' | 'hi';
}

export const AIPhotoReportModal: React.FC<AIPhotoReportModalProps> = ({
  isOpen,
  onClose,
  locationName,
  lang,
}) => {
  const [step, setStep] = useState<'capture' | 'detecting' | 'confirm' | 'submitted'>('capture');
  const [detectedCategory, setDetectedCategory] = useState('Landslide Debris on Road');
  const [detectedConfidence, setDetectedConfidence] = useState(94);

  if (!isOpen) return null;

  const handleCapture = () => {
    setStep('detecting');
    setTimeout(() => {
      setStep('confirm');
    }, 800);
  };

  const handleFinalSubmit = () => {
    setStep('submitted');
    setTimeout(() => {
      setStep('capture');
      onClose();
    }, 1200);
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
      <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 text-[#1F2937] dark:text-white relative animate-in fade-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3FA] dark:bg-[#1B2738] flex items-center justify-center text-[#0F4C81] dark:text-[#81D4FA]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black">
              {lang === 'hi' ? 'स्मार्ट घटना रिपोर्ट' : '3-Step AI Incident Report'}
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {locationName}
            </p>
          </div>
        </div>

        {/* Step 1: Capture Photo */}
        {step === 'capture' && (
          <div className="space-y-3 pt-2">
            <div
              onClick={handleCapture}
              className="h-44 rounded-2xl border-2 border-dashed border-[#CBD5E1] dark:border-[#24344B] flex flex-col items-center justify-center space-y-2 bg-[#F8FAFC] dark:bg-[#1B2738] cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#0F4C81] text-white flex items-center justify-center shadow-md">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#0F4C81] dark:text-[#81D4FA]">
                {lang === 'hi' ? 'फोटो खींचें या अपलोड करें' : 'Tap to Take / Upload Photo'}
              </span>
              <span className="text-[10px] text-gray-400">
                {lang === 'hi' ? 'एआई स्वतः खतरे की पहचान करेगा' : 'AI will automatically detect hazard type'}
              </span>
            </div>

            <button
              onClick={handleCapture}
              className="w-full py-3 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm"
            >
              {lang === 'hi' ? 'फोटो सिमुलेशन शुरू करें' : 'Simulate Hazard Photo'}
            </button>
          </div>
        )}

        {/* Step 2: AI Detecting */}
        {step === 'detecting' && (
          <div className="py-10 flex flex-col items-center justify-center space-y-3 text-center">
            <Sparkles className="w-10 h-10 text-[#0F4C81] dark:text-[#81D4FA] animate-spin" />
            <h4 className="text-sm font-bold">
              {lang === 'hi' ? 'एआई खतरे का विश्लेषण कर रहा है...' : 'AI Analyzing Photo Features...'}
            </h4>
            <p className="text-xs text-gray-400">
              {lang === 'hi' ? 'मॉडल: NDMA Vision Model v3' : 'Computer Vision Classifier running'}
            </p>
          </div>
        )}

        {/* Step 3: AI Detected Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-3 pt-1 animate-in slide-in-from-bottom-2 text-xs">
            <div className="p-3.5 bg-[#E8F5E9] dark:bg-[#162A1B] border border-[#A5D6A7] dark:border-[#265330] rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-[#2E7D32] dark:text-[#81C784] uppercase">
                {lang === 'hi' ? '✓ एआई द्वारा पहचाना गया खतरा' : '✓ AI Hazard Detected'}
              </span>
              <h4 className="text-sm font-black text-[#1B5E20] dark:text-[#A5D6A7]">
                {detectedCategory}
              </h4>
              <span className="text-[11px] text-gray-600 dark:text-gray-300 block">
                Confidence: {detectedConfidence}% • Location: {locationName}
              </span>
            </div>

            <button
              onClick={handleFinalSubmit}
              className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'hi' ? 'पुष्टि करें एवं ईओसी को भेजें' : 'Confirm & Transmit to District EOC'}</span>
            </button>
          </div>
        )}

        {/* Step 4: Submitted Success */}
        {step === 'submitted' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center text-xs">
            <CheckCircle2 className="w-12 h-12 text-[#2E7D32] animate-bounce" />
            <h4 className="text-sm font-black text-[#2E7D32]">
              {lang === 'hi' ? 'रिपोर्ट सफलतापूर्वक दर्ज की गई!' : 'Report Dispatched & Verified!'}
            </h4>
            <p className="text-gray-500">
              {lang === 'hi' ? 'धन्यवाद। आपकी रिपोर्ट अन्य नागरिकों को सुरक्षित रखेगी।' : 'Broadcasting safety notice to nearby citizens.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
