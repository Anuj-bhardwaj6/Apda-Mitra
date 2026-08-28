'use client';

import React, { useState } from 'react';
import { Users, Check, Share2, Send, X, MapPin } from 'lucide-react';

interface ShareStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  lang: 'en' | 'hi';
}

export const ShareStatusSheet: React.FC<ShareStatusSheetProps> = ({
  isOpen,
  onClose,
  locationName,
  lang,
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>(['c1', 'c2']);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const contacts = [
    { id: 'c1', name: 'Papa / Father', phone: '+91 98765 43210' },
    { id: 'c2', name: 'Maa / Mother', phone: '+91 98765 12345' },
    { id: 'c3', name: 'Brother (Rohan)', phone: '+91 94455 66778' },
    { id: 'c4', name: 'Wayanad District Rescue Volunteer', phone: '+91 94470 12345' },
  ];

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#131D2A] border border-[#CBD5E1] dark:border-[#24344B] w-full max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 text-[#1F2937] dark:text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#0F4C81] dark:text-[#81D4FA]" />
            <h3 className="text-base sm:text-lg font-black">
              {lang === 'hi' ? 'परिवार को स्थिति भेजें' : 'Share Safety Status'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#4B5563] dark:text-[#CBD5E1]">
          {lang === 'hi'
            ? 'अपनी लाइव जीपीएस स्थिति और सुरक्षा संदेश सीधे चयनित संपर्कों को भेजें।'
            : 'Transmit verified GPS coordinates and safety status to trusted contacts.'}
        </p>

        {/* Live GPS Preview Card */}
        <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1B2738] border border-[#E2E8F0] dark:border-[#24344B] text-xs">
          <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-bold block">
            {lang === 'hi' ? 'संदेश पूर्वावलोकन' : 'Beacon Message Preview'}
          </span>
          <p className="mt-1 font-semibold text-[#1F2937] dark:text-white">
            "I am currently safe at {locationName}. Live telemetry tracked via Apda Mitra."
          </p>
        </div>

        {/* Contact Selector List */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-[#9CA3AF]">
            {lang === 'hi' ? 'संपर्क चुनें:' : 'Select Recipients:'}
          </span>
          {contacts.map((c) => {
            const isSelected = selectedContacts.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleContact(c.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#EBF3FA] dark:bg-[#1A2634] border-[#0F4C81] dark:border-[#81D4FA]'
                    : 'bg-white dark:bg-[#131D2A] border-gray-200 dark:border-gray-800'
                }`}
              >
                <div>
                  <h5 className="text-xs font-bold">{c.name}</h5>
                  <span className="text-[10px] text-gray-500">{c.phone}</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                  isSelected ? 'bg-[#0F4C81] border-[#0F4C81] text-white' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSend}
          disabled={selectedContacts.length === 0}
          className="w-full min-h-[48px] bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>
            {isSent
              ? (lang === 'hi' ? '✓ स्थिति सफलतापूर्वक भेजी गई!' : '✓ Status Transmitted!')
              : (lang === 'hi' ? `भेजें (${selectedContacts.length} संपर्क)` : `Send Beacon (${selectedContacts.length} contacts)`)}
          </span>
        </button>
      </div>
    </div>
  );
};
