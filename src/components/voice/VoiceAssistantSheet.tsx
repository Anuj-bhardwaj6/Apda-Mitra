"use client";

import React, { useState } from "react";
import { Mic, MicOff, X, Sparkles, Navigation, PhoneCall, ShieldCheck, ArrowRight } from "lucide-react";
import { Language } from "@/constants/localization";

interface VoiceAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToShelter?: () => void;
  lang?: Language;
  currentLocationName?: string;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export function VoiceAssistantSheet({
  isOpen,
  onClose,
  onNavigateToShelter,
  lang = "en",
  currentLocationName = "Current Sector",
}: VoiceAssistantSheetProps) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: lang === "en"
        ? "How can I help keep you safe today?"
        : "नमस्ते! आज मैं आपकी सुरक्षा में कैसे मदद कर सकता हूँ?",
    },
  ]);

  const quickPrompts = lang === "en" ? [
    "Is it safe to travel to Shillong?",
    "Where is the nearest shelter?",
    "Is there flooding or landslides near me?",
    "Call national emergency 112",
  ] : [
    "क्या शिलांग की यात्रा करना सुरक्षित है?",
    "निकटतम सुरक्षित शिविर कहाँ है?",
    "क्या मेरे आस-पास भूस्खलन या बाढ़ है?",
    "आपातकालीन 112 पर कॉल करें",
  ];

  const handleSendPrompt = (prompt: string) => {
    setIsListening(false);
    setMessages((prev) => [...prev, { sender: "user", text: prompt }]);

    setTimeout(() => {
      let aiReply = "Checking live Doppler radar, GSI slope telemetry, and district reports...";
      let actionBtn = undefined;

      const p = prompt.toLowerCase();
      if (p.includes("shelter") || p.includes("शिविर")) {
        aiReply = lang === "en"
          ? `The nearest verified relief staging center is located 1.4 km from ${currentLocationName}. It has clean drinking water, backup power, and available beds.`
          : `निकटतम सत्यापित राहत केंद्र ${currentLocationName} से 1.4 किमी दूर है। यहाँ स्वच्छ पेयजल, बिजली और बिस्तर उपलब्ध हैं।`;
        actionBtn = {
          label: lang === "en" ? "Plot Safe Evacuation Route" : "सुरक्षित मार्ग देखें",
          onClick: () => {
            onNavigateToShelter?.();
            onClose();
          },
        };
      } else if (p.includes("shillong") || p.includes("travel") || p.includes("यात्रा") || p.includes("safe")) {
        aiReply = lang === "en"
          ? "Heavy rainfall has been observed along hillside passes. Upper Shillong Bypass remains open and clear, but NH-40 Old Section has loose rockfall warnings."
          : "पहाड़ी मार्गों पर भारी वर्षा जारी है। अपर शिलांग बाईपास खुला है, लेकिन पुराने मार्ग पर पत्थरों के गिरने की चेतावनी है।";
      } else if (p.includes("112") || p.includes("emergency") || p.includes("कॉल")) {
        aiReply = lang === "en"
          ? "Connecting you to National Emergency 112. Emergency GPS coordinates have been encoded into your dispatch."
          : "राष्ट्रीय आपातकालीन 112 से संपर्क किया जा रहा है। आपके जीपीएस निर्देशांक संलग्न हैं।";
      } else {
        aiReply = lang === "en"
          ? "Active IMD radar feeds show localized rain bands across the sector. Soil saturation is elevated on slopes over 25°. Avoid unpaved cutting edges."
          : "मौसम विज्ञान रडार के अनुसार क्षेत्र में वर्षा जारी है। 25° से अधिक ढलानों पर मिट्टी संतृप्त है। सीधी ढलानों से दूर रहें।";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: aiReply,
          actionButton: actionBtn,
        },
      ]);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-[#E4E7EC] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E4E7EC] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F1F8] flex items-center justify-center text-[#0F4C81]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#16202A]">
                {lang === "en" ? "AI Safety Assistant" : "एआई सुरक्षा सहायक"}
              </h3>
              <p className="text-[11px] text-[#5F6D7E]">
                {lang === "en" ? "Official disaster query & guidance" : "आधिकारिक आपदा सुरक्षा मार्गदर्शन"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F6F8FA] hover:bg-[#EEF1F6] flex items-center justify-center text-[#5F6D7E] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Stream */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 min-h-[220px]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-[#0F4C81] text-white rounded-br-xs font-semibold"
                    : "bg-[#F6F8FA] border border-[#E4E7EC] text-[#16202A] rounded-bl-xs font-medium"
                }`}
              >
                {m.text}
              </div>

              {m.actionButton && (
                <button
                  onClick={m.actionButton.onClick}
                  type="button"
                  className="mt-2 py-2 px-3.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition hover:bg-[#0A365C] active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  <span>{m.actionButton.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Quick Safety Query Chips */}
        <div className="px-5 py-2.5 border-t border-[#E4E7EC] bg-[#F6F8FA]">
          <span className="text-[10px] font-bold text-[#5F6D7E] uppercase tracking-wider block mb-1.5">
            {lang === "en" ? "Common Safety Queries:" : "सामान्य सुरक्षा प्रश्न:"}
          </span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(prompt)}
                type="button"
                className="px-3 py-1.5 rounded-full bg-white border border-[#E4E7EC] hover:border-[#0F4C81] text-xs font-semibold text-[#16202A] whitespace-nowrap transition shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Input Trigger Strip */}
        <div className="p-4 border-t border-[#E4E7EC] bg-white flex items-center gap-3">
          <button
            onClick={() => {
              setIsListening(!isListening);
              if (!isListening) {
                setTimeout(() => {
                  handleSendPrompt(quickPrompts[0]);
                }, 1500);
              }
            }}
            type="button"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shrink-0 ${
              isListening
                ? "bg-[#C62828] text-white animate-pulse"
                : "bg-[#0F4C81] text-white hover:bg-[#0A365C]"
            }`}
            title="Tap to speak"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            placeholder={
              isListening
                ? (lang === "en" ? "Listening..." : "सुन रहा हूँ...")
                : (lang === "en" ? "Ask safety query or tap mic..." : "सुरक्षा प्रश्न पूछें या माइक दबाएं...")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                handleSendPrompt(e.currentTarget.value.trim());
                e.currentTarget.value = "";
              }
            }}
            className="flex-1 bg-[#F6F8FA] border border-[#E4E7EC] rounded-2xl px-4 py-3 text-xs outline-none text-[#16202A] placeholder:text-[#5F6D7E] focus:border-[#0F4C81]"
          />
        </div>
      </div>
    </div>
  );
}
