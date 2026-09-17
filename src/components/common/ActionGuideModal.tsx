"use client";

import React from "react";
import { X, CheckCircle2, AlertTriangle, PhoneCall, Shield, Navigation } from "lucide-react";
import { Language } from "@/constants/localization";

interface ActionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  threatLevel?: "safe" | "advisory" | "high_risk" | "take_action";
  onNavigateShelter?: () => void;
}

export function ActionGuideModal({
  isOpen,
  onClose,
  lang = "en",
  threatLevel = "advisory",
  onNavigateShelter,
}: ActionGuideModalProps) {
  if (!isOpen) return null;

  const isHighRiskOrAction = threatLevel === "high_risk" || threatLevel === "take_action";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-[#E4E7EC] space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isHighRiskOrAction ? "bg-[#FFEBEE] text-[#C62828]" : "bg-[#E8F1F8] text-[#0F4C81]"}`}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#16202A]">
                {lang === "en" ? "Official Safety Guidelines" : "आधिकारिक सुरक्षा दिशा-निर्देश"}
              </h3>
              <p className="text-xs text-[#5F6D7E]">
                {lang === "en" ? "NDMA Citizen Action Protocol" : "नागरिक सुरक्षा प्रोटोकॉल"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full hover:bg-[#F6F8FA] flex items-center justify-center text-[#5F6D7E]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Checklists */}
        <div className="space-y-4 text-xs">
          {/* Priority Callout */}
          <div className={`p-4 rounded-2xl border ${isHighRiskOrAction ? "bg-[#FFEBEE] border-[#C62828]/30 text-[#C62828]" : "bg-[#FEF3C7] border-[#F59E0B]/30 text-[#B45309]"}`}>
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {isHighRiskOrAction
                  ? (lang === "en" ? "High Risk: Follow Civil Defense Orders" : "उच्च जोखिम: नागरिक सुरक्षा निर्देशों का पालन करें")
                  : (lang === "en" ? "Advisory: Stay Vigilant" : "परामर्श: सतर्क एवं तैयार रहें")}
              </span>
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed">
              {isHighRiskOrAction
                ? (lang === "en"
                    ? "Continuous precipitation has saturated hill slopes. Minor rockfalls can precede major slope slippages."
                    : "लगातार वर्षा से ढलान कमजोर हो गए हैं। किसी भी समय पत्थरों के खिसकने की संभावना है।")
                : (lang === "en"
                    ? "Keep your battery powered radio and phones charged. Monitor official district bulletins."
                    : "मोबाइल और टॉर्च चार्ज रखें। आधिकारिक जिला बुलेटिन पर नजर रखें।")}
            </p>
          </div>

          {/* Action Checklist */}
          <div className="space-y-2">
            <span className="font-bold text-[#5F6D7E] uppercase tracking-wider block">
              {lang === "en" ? "Recommended Actions Checklist:" : "कार्रवाई चेकलिस्ट:"}
            </span>

            {[
              {
                en: "Stay away from steep hill cuttings and saturated drainage channels.",
                hi: "सीधी पहाड़ी ढलानों और नाले के किनारों से दूर रहें।",
              },
              {
                en: "Prepare an Emergency Go-Bag: medicines, Aadhaar, water, dry rations & torch.",
                hi: "आपातकालीन बैग तैयार रखें: दवाएं, पहचान पत्र, पानी, सूखा भोजन और टॉर्च।",
              },
              {
                en: "Do not attempt crossing submerged bridges or waterlogged road dips.",
                hi: "जलमग्न पुलों या पानी भरी सड़कों को पार करने की कोशिश न करें।",
              },
              {
                en: "If you hear rumbling sounds or cracking trees, evacuate immediately uphill/away from slope.",
                hi: "यदि गड़गड़ाहट की आवाज सुनाई दे, तो तुरंत ढलान से दूर सुरक्षित स्थान पर जाएं।",
              },
              {
                en: "Inform neighbors and vulnerable elderly citizens in your locality.",
                hi: "पड़ोसियों और बुजुर्गों को सचेत करें एवं सहायता प्रदान करें।",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F6F8FA] border border-[#E4E7EC] flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                <span className="font-medium text-[#16202A] leading-relaxed">
                  {lang === "en" ? step.en : step.hi}
                </span>
              </div>
            ))}
          </div>

          {/* Direct Shelter Action */}
          {onNavigateShelter && (
            <button
              onClick={() => {
                onClose();
                onNavigateShelter();
              }}
              type="button"
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0A365C] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>{lang === "en" ? "Navigate to Nearest Safe Shelter" : "निकटतम सुरक्षित शिविर की ओर मार्ग देखें"}</span>
            </button>
          )}

          {/* Quick Helpline */}
          <div className="p-3 rounded-xl bg-[#F6F8FA] border border-[#E4E7EC] flex items-center justify-between">
            <span className="font-bold text-[#16202A]">
              {lang === "en" ? "National Disaster Helpline:" : "राष्ट्रीय आपदा हेल्पलाइन:"}
            </span>
            <a
              href="tel:112"
              className="font-extrabold text-[#C62828] hover:underline flex items-center gap-1 text-sm"
            >
              <PhoneCall className="w-4 h-4" />
              <span>112</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
