"use client";

import React from "react";
import { PhoneCall, ShieldAlert, AlertTriangle, X } from "lucide-react";
import { NATIONAL_HELPLINES } from "@/constants/government";
import { Dialog } from "@/components/ui/Dialog";

export interface SosActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SosActionSheet({ isOpen, onClose }: SosActionSheetProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="National Emergency SOS Dispatch"
      subtitle="Direct line to Government of India Disaster Response & Police Dispatch"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Urgent Direct Call 112 */}
        <div className="p-5 rounded-card bg-gov-danger text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-modal">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white text-gov-danger flex items-center justify-center shrink-0 shadow-sm">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">DIAL 112</div>
              <div className="text-xs text-white/90 font-medium">
                National Unified Emergency Line (Police, Fire, Ambulance, SDRF)
              </div>
            </div>
          </div>
          <a
            href="tel:112"
            className="w-full sm:w-auto px-6 py-3 rounded-btn bg-white text-gov-danger hover:bg-gray-100 font-bold text-center text-sm shadow-sm active:scale-95 transition-all"
          >
            Direct Call Now
          </a>
        </div>

        {/* Other Essential Disaster Lines */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gov-primary px-1">
            Official Agency Helplines (Toll-Free 24x7)
          </div>

          {NATIONAL_HELPLINES.slice(1).map((helpline) => (
            <div
              key={helpline.number}
              className="flex items-center justify-between p-3.5 rounded-card bg-gov-bg dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm text-gov-text dark:text-white">
                    {helpline.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${helpline.badgeColor}`}
                  >
                    {helpline.badge}
                  </span>
                </div>
                <p className="text-xs text-gov-muted">{helpline.description}</p>
              </div>

              <a
                href={`tel:${helpline.number}`}
                className="shrink-0 px-4 py-2 rounded-btn bg-gov-primaryLight text-gov-primary hover:bg-gov-primary hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{helpline.number}</span>
              </a>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-gov-muted">
            All calls are prioritized on all Indian telecommunication networks without charge or mobile balance.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
