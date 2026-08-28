'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, Navigation, CheckCircle2, AlertTriangle } from 'lucide-react';

interface VoiceAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const VoiceAssistantSheet: React.FC<VoiceAssistantSheetProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [isListening, setIsListening] = useState(true);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<{
    headline: string;
    headlineHi: string;
    advice: string;
    adviceHi: string;
    status: 'safe' | 'alert' | 'action';
  } | null>(null);

  if (!isOpen) return null;

  const handleAskPrompt = (sampleText: string) => {
    setQuery(sampleText);
    setIsListening(false);

    // Simulate AI voice processing & speech response
    setTimeout(() => {
      let resp: {
        headline: string;
        headlineHi: string;
        advice: string;
        adviceHi: string;
        status: 'safe' | 'alert' | 'action';
      } = {
        headline: 'Moderate Landslide Risk along NH-766 Ghat Section',
        headlineHi: 'NH-766 घाट सेक्शन पर मध्यम भूस्खलन जोखिम',
        advice: 'Travel to Ooty is advised via Gudalur bypass. Heavy rainfall begins around 6:15 PM.',
        adviceHi: 'गुडलूर बाईपास होकर ऊटी जाने की सलाह दी जाती है। शाम 6:15 बजे के आसपास भारी बारिश शुरू होगी।',
        status: 'alert',
      };

      if (sampleText.toLowerCase().includes('shelter') || sampleText.toLowerCase().includes('आश्रय')) {
        resp = {
          headline: 'Nearest Safe Shelter: Chooralmala Relief Camp (1.8 km)',
          headlineHi: 'निकटतम सुरक्षित आश्रय: चूरलमाला राहत शिविर (1.8 किमी)',
          advice: '24/7 medical & food facilities open with 210 vacant spots.',
          adviceHi: '24/7 चिकित्सा एवं भोजन सुविधाओं के साथ 210 स्थान रिक्त हैं।',
          status: 'safe' as const,
        };
      }

      setResponse(resp);

      // Web Speech API Synthesis for Spoken AI
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const textToSpeak = lang === 'hi' ? resp.adviceHi : resp.advice;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
      <div className="bg-white dark:bg-[#131D2A] border-t border-[#CBD5E1] dark:border-[#24344B] w-full max-w-lg rounded-t-[32px] shadow-2xl p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-300 text-[#1F2937] dark:text-white">
        {/* Top Handle & Close */}
        <div className="flex items-center justify-between pb-1">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assistant Header & Waveform */}
        <div className="flex flex-col items-center text-center space-y-2 pt-1">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl ${
              isListening ? 'bg-[#0F4C81] animate-pulse' : 'bg-[#2E7D32]'
            }`}>
              <Mic className="w-8 h-8" />
            </div>
            {isListening && (
              <span className="absolute -inset-1 rounded-full border-2 border-[#0F4C81] animate-ping" />
            )}
          </div>

          <h3 className="text-base font-bold">
            {isListening
              ? (lang === 'hi' ? '🎙️ सुन रहा हूँ... बोलिए' : '🎙️ Listening... Ask anything')
              : (lang === 'hi' ? 'एआई आपदा उत्तर' : 'Apda Mitra Voice AI')}
          </h3>

          {/* Animated Audio Wave bars */}
          {isListening && (
            <div className="flex items-center space-x-1.5 py-1">
              {[40, 70, 95, 60, 85, 45, 90, 55].map((h, idx) => (
                <span
                  key={idx}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-[#0F4C81] dark:bg-[#81D4FA] rounded-full animate-pulse min-h-[12px] max-h-[30px]"
                />
              ))}
            </div>
          )}
        </div>

        {/* Suggested Voice Prompts */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-[#6B7280] dark:text-[#9CA3AF] block text-center">
            {lang === 'hi' ? 'सुझाए गए प्रश्न (टैप करें)' : 'Try asking:'}
          </span>
          <div className="flex flex-col space-y-1.5">
            {[
              lang === 'hi' ? 'क्या अभी ऊटी की यात्रा करना सुरक्षित है?' : 'Is it safe to travel to Ooty right now?',
              lang === 'hi' ? 'निकटतम सुरक्षित राहत शिविर कहाँ है?' : 'Where is the nearest medical shelter?',
              lang === 'hi' ? 'क्या वायनाड में पहाड़ी मार्ग खुले हैं?' : 'Are mountain roads in Wayanad open?',
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleAskPrompt(p)}
                className="p-2.5 bg-[#F8FAFC] dark:bg-[#1B2738] hover:bg-[#EBF3FA] dark:hover:bg-[#24344B] rounded-xl text-xs font-semibold text-left border border-[#E2E8F0] dark:border-[#24344B] transition-all cursor-pointer truncate"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        {/* AI Voice Answer Card */}
        {response && (
          <div className="p-4 rounded-2xl bg-[#EBF3FA] dark:bg-[#1B2738] border border-[#D0E2F2] dark:border-[#24344B] space-y-2 animate-in slide-in-from-bottom-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#0F4C81] dark:text-[#81D4FA] text-xs sm:text-sm">
                {lang === 'hi' ? response.headlineHi : response.headline}
              </span>
              <Volume2 className="w-4 h-4 text-[#0F4C81] dark:text-[#81D4FA] animate-bounce" />
            </div>
            <p className="text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-relaxed">
              {lang === 'hi' ? response.adviceHi : response.advice}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
