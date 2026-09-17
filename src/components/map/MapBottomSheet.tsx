"use client";

import React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Navigation, Phone, Share2, Info, X, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import { MapPointFeature } from "@/services/map.service";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { GovBadge } from "@/components/common/GovBadge";
import { formatDistance } from "@/utils/formatters";

export interface MapBottomSheetProps {
  feature: MapPointFeature | null;
  onClose: () => void;
  onNavigate: (feature: MapPointFeature) => void;
  userCoords: [number, number] | null;
  snapState?: "peek" | "half" | "full";
  onSnapChange?: (snap: "peek" | "half" | "full") => void;
}

export function MapBottomSheet({
  feature,
  onClose,
  onNavigate,
  userCoords,
  snapState = "half",
  onSnapChange,
}: MapBottomSheetProps) {
  if (!feature) return null;

  // Compute distance from user
  let distanceMeters: number | null = null;
  if (userCoords) {
    const dLat = (feature.coordinates[0] - userCoords[0]) * 111000;
    const dLng = (feature.coordinates[1] - userCoords[1]) * 111000 * Math.cos((userCoords[0] * Math.PI) / 180);
    distanceMeters = Math.sqrt(dLat * dLat + dLng * dLng);
  }

  const heightClasses = {
    peek: "h-[25vh]",
    half: "h-[50vh]",
    full: "h-[88vh]",
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) {
      if (snapState === "full") onSnapChange?.("half");
      else if (snapState === "half") onSnapChange?.("peek");
      else onClose();
    } else if (info.offset.y < -60) {
      if (snapState === "peek") onSnapChange?.("half");
      else if (snapState === "half") onSnapChange?.("full");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: feature.name,
        text: `Emergency Location: ${feature.name} (${feature.address})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${feature.name}, ${feature.address}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 bottom-0 z-40 md:left-auto md:right-6 md:bottom-6 md:w-[420px] pointer-events-none">
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          className={`pointer-events-auto w-full bg-white/95 dark:bg-[#121A24]/95 backdrop-blur-md rounded-t-[28px] md:rounded-[28px] shadow-modal border border-white/40 dark:border-white/10 flex flex-col transition-all duration-300 ${heightClasses[snapState]} md:h-auto md:max-h-[85vh]`}
        >
          {/* Drag Handle (Mobile) */}
          <div
            className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing md:hidden"
            onClick={() => {
              if (snapState === "peek") onSnapChange?.("half");
              else if (snapState === "half") onSnapChange?.("full");
              else onSnapChange?.("peek");
            }}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="p-5 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <StatusPill
                  label={feature.status}
                  type={feature.status === "Blocked" ? "danger" : feature.status === "At Capacity" ? "warning" : "success"}
                />
                {feature.verified && <GovBadge type="verified" size="sm" />}
                {distanceMeters && (
                  <span className="text-xs font-bold text-[#0F4C81] dark:text-[#4C8BF5]">
                    {formatDistance(distanceMeters)} away
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-[#16202A] dark:text-white leading-tight">
                {feature.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Optional Photo */}
            {feature.photoUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden shadow-subtle relative bg-gray-100 dark:bg-gray-800">
                <img
                  src={feature.photoUrl}
                  alt={feature.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Address */}
            <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-[#0F4C81] shrink-0 mt-0.5" />
              <span>{feature.address}, {feature.district}, {feature.state}</span>
            </div>

            {/* Capacity gauge if applicable */}
            {feature.capacity && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60">
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-gray-500">Live Intake Capacity</span>
                  <span className="text-[#0F4C81] dark:text-[#4C8BF5]">
                    {feature.capacity.current} / {feature.capacity.total} Beds
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0F4C81] dark:bg-[#4C8BF5] rounded-full"
                    style={{ width: `${(feature.capacity.current / feature.capacity.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Description & Hazard Advice */}
            <p className="text-xs text-[#16202A]/80 dark:text-gray-200 leading-relaxed">
              {feature.description}
            </p>

            {feature.avoidanceAdvice && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 text-xs text-[#D32F2F] font-medium">
                {feature.avoidanceAdvice}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{feature.updatedAt}</span>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Button
              size="md"
              variant="primary"
              className="flex-1"
              leftIcon={<Navigation className="w-4 h-4" />}
              onClick={() => onNavigate(feature)}
            >
              Navigate Safe Route
            </Button>

            {feature.phone && (
              <a
                href={`tel:${feature.phone}`}
                className="p-3 rounded-btn bg-gray-100 dark:bg-gray-800 text-[#0F4C81] dark:text-[#4C8BF5] hover:bg-[#0F4C81] hover:text-white transition-colors"
                title="Call Emergency In-Charge"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-btn bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
              title="Share Location"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
