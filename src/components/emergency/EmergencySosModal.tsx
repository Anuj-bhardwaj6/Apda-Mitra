"use client";

import React, { useState } from "react";
import { PhoneCall, X, MapPin, ShieldAlert, HeartPulse, Shield, Flame, Copy, Check, Share2 } from "lucide-react";
import { Language } from "@/constants/localization";

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords?: [number, number];
  locationName?: string;
  lang?: Language;
}

export function EmergencySosModal({
  isOpen,
  onClose,
  userCoords = [25.5788, 91.8933],
  locationName = "Current GPS Location",
  lang = "en",
}: EmergencySosModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const coordString = `${userCoords[0].toFixed(5)}° N, ${userCoords[1].toFixed(5)}° E`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`EMERGENCY: I need assistance at ${locationName} (${coordString}). Google Maps: https://maps.google.com/?q=${userCoords[0]},${userCoords[1]}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareSms = () => {
    const msg = encodeURIComponent(`EMERGENCY SOS: I need help at ${locationName}. Coordinates: ${coordString}. Map: https://maps.google.com/?q=${userCoords[0]},${userCoords[1]}`);
    window.location.href = `sms:?&body=${msg}`;
  };

  const emergencyNumbers = [
    {
      title: "112 - National Emergency Response",
      number: "112",
      badge: "Fastest Unified Dispatch",
      desc: "Police, Fire, Medical & Disaster Response Combined",
      color: "bg-[#C62828] text-white hover:bg-[#B71C1C]",
      icon: ShieldAlert,
    },
    {
      title: "1078 - NDRF Disaster Helpline",
      number: "1078",
      badge: "Specialized Rescue",
      desc: "National Disaster Response Force for Landslides & Floods",
      color: "bg-[#0F4C81] text-white hover:bg-[#0A365C]",
      icon: Shield,
    },
    {
      title: "108 - Emergency Medical Ambulance",
      number: "108",
      badge: "Ambulance",
      desc: "Trauma medical care & patient evacuation transit",
      color: "bg-[#2E7D32] text-white hover:bg-[#1B5E20]",
      icon: HeartPulse,
    },
    {
      title: "101 - Fire & Rescue Service",
      number: "101",
      badge: "Fire & Water Rescue",
      desc: "Rescue boats, fallen trees & hazard clearance",
      color: "bg-[#F59E0B] text-white hover:bg-[#D97706]",
      icon: Flame,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#E4E7EC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-[#FFEBEE] border-b border-[#C62828]/20 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C62828] text-white flex items-center justify-center shadow-md">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C62828]">
                Emergency SOS Dispatch
              </span>
              <h3 className="text-xl font-extrabold text-[#16202A] leading-tight">
                National Helplines
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-[#5F6D7E] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS readout box for 112 caller */}
        <div className="px-6 pt-5">
          <div className="p-4 rounded-2xl bg-[#F6F8FA] border border-[#E4E7EC] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#0F4C81] shrink-0" />
              <div>
                <span className="text-[11px] font-bold uppercase text-[#5F6D7E]">
                  Read this to the 112 Operator:
                </span>
                <p className="text-sm font-extrabold text-[#16202A] mt-0.5">{locationName}</p>
                <p className="text-xs font-mono font-bold text-[#0F4C81]">{coordString}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={handleCopy}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E4E7EC] hover:bg-[#EEF1F6] text-xs font-bold text-[#16202A] flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2E7D32]" /> : <Copy className="w-3.5 h-3.5 text-[#5F6D7E]" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleShareSms}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold flex items-center gap-1.5 transition hover:bg-[#0A365C]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Numbers List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {emergencyNumbers.map((em) => {
            const Icon = em.icon;
            return (
              <a
                key={em.number}
                href={`tel:${em.number}`}
                className={`w-full p-4 rounded-2xl flex items-center justify-between transition shadow-2xs group ${em.color}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-white">{em.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white">
                        {em.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 mt-0.5 leading-snug">{em.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white text-[#16202A] px-3 py-2 rounded-xl font-black text-sm shadow-xs group-hover:scale-105 transition shrink-0 ml-2">
                  <PhoneCall className="w-3.5 h-3.5 fill-current text-[#C62828]" />
                  <span>Call</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
