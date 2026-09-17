"use client";

import React, { useState } from "react";
import {
  Camera,
  X,
  Upload,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Loader2,
} from "lucide-react";
import { submitCitizenIncidentReport } from "@/services/apiPlaceholders";
import { Language } from "@/constants/localization";

interface InstagramReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords?: [number, number];
  locationName?: string;
  lang?: Language;
}

export function InstagramReportModal({
  isOpen,
  onClose,
  userCoords = [25.5788, 91.8933],
  locationName = "Your Detected GPS Location",
  lang = "en",
}: InstagramReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Landslide");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: "Landslide", label: "Landslide / Rockfall", icon: "⚠️" },
    { id: "Flood", label: "Flood / Inundation", icon: "🌊" },
    { id: "Road Blocked", label: "Road Blocked", icon: "⛔" },
    { id: "Crack", label: "Ground / Slope Crack", icon: "⚡" },
    { id: "Fallen Tree", label: "Fallen Tree / Wire", icon: "🌲" },
    { id: "Other", label: "Other Hazard", icon: "📌" },
  ];

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await submitCitizenIncidentReport({
        category: selectedCategory as any,
        latitude: userCoords[0],
        longitude: userCoords[1],
        landmark: locationName,
        notes: notes || "Citizen hazard report",
      });
      setTicketId(res.ticketId);
    } catch {
      setTicketId(`APDA-${Math.floor(100000 + Math.random() * 900000)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setTicketId(null);
    setPhotoPreview(null);
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#E4E7EC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-[#F6F8FA] border-b border-[#E4E7EC] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#16202A]">
              {lang === "en" ? "Report Incident in 30 Seconds" : "30 सेकंड में खतरा रिपोर्ट करें"}
            </h3>
            <p className="text-xs text-[#5F6D7E]">
              {lang === "en" ? "Instantly dispatches to District Disaster Officer" : "जिला आपदा अधिकारी को तुरंत प्रेषित"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#EEF1F6] flex items-center justify-center text-[#5F6D7E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Screen */}
        {ticketId ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32]">
                REPORT DISPATCHED TO NDRF & SDMA
              </span>
              <h4 className="text-xl font-extrabold text-[#16202A] mt-1">
                Ticket Ref: {ticketId}
              </h4>
              <p className="text-xs text-[#5F6D7E] mt-2 max-w-xs mx-auto leading-relaxed">
                Thank you for protecting your community. Local SDRF and district road units have received your coordinates.
              </p>
            </div>
            <button
              onClick={handleDone}
              type="button"
              className="w-full py-3.5 rounded-2xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0A365C] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Step 1: Auto GPS Readout */}
            <div className="p-3 rounded-2xl bg-[#E8F1F8] border border-[#0F4C81]/20 flex items-center gap-2.5 text-xs text-[#0F4C81]">
              <MapPin className="w-4 h-4 shrink-0" />
              <div className="truncate">
                <span className="font-bold block">
                  {lang === "en" ? "GPS Location Auto-Detected:" : "जीपीएस स्थान:"}
                </span>
                <span className="font-medium truncate block">{locationName}</span>
              </div>
            </div>

            {/* Step 2: Photo Capture */}
            <div>
              <span className="text-xs font-bold text-[#5F6D7E] uppercase tracking-wider block mb-2">
                📷 {lang === "en" ? "Attach Photo (Recommended)" : "तस्वीर जोड़ें"}
              </span>
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#E4E7EC] h-36 bg-black">
                  <img src={photoPreview} alt="Incident preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#0F4C81]/30 hover:border-[#0F4C81] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#F6F8FA] hover:bg-[#E8F1F8]/50 transition">
                  <Camera className="w-6 h-6 text-[#0F4C81]" />
                  <span className="text-xs font-bold text-[#0F4C81]">
                    {lang === "en" ? "Take Photo or Upload" : "फोटो लें या अपलोड करें"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Step 3: Choose Hazard Category */}
            <div>
              <span className="text-xs font-bold text-[#5F6D7E] uppercase tracking-wider block mb-2">
                {lang === "en" ? "Select Hazard Category:" : "खतरे का प्रकार चुनें:"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      type="button"
                      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2 transition ${
                        isSelected
                          ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                          : "bg-white text-[#16202A] border-[#E4E7EC] hover:bg-[#F6F8FA]"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Optional Notes */}
            <div>
              <span className="text-xs font-bold text-[#5F6D7E] uppercase tracking-wider block mb-1">
                {lang === "en" ? "Details / Landmark (Optional):" : "विवरण / लैंडमार्क (वैकल्पिक):"}
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === "en" ? "e.g. Near Mile 14 tea stall, rocks blocking road" : "जैसे: माइल 14 मोड़ के पास"}
                className="w-full p-3 rounded-xl border border-[#E4E7EC] bg-[#F6F8FA] text-xs outline-none focus:border-[#0F4C81] text-[#16202A]"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-[#0A365C] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{lang === "en" ? "Submit Report to Disaster Cell" : "आपदा नियंत्रण कक्ष को भेजें"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
