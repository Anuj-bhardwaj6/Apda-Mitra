"use client";

import React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/utils/cn";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  snapState?: "peek" | "half" | "full";
  onSnapChange?: (snap: "peek" | "half" | "full") => void;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapState = "half",
  onSnapChange,
  className,
}: BottomSheetProps) {
  if (!isOpen) return null;

  const heights = {
    peek: "h-[160px]",
    half: "h-[55vh]",
    full: "h-[88vh]",
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      if (snapState === "full") onSnapChange?.("half");
      else if (snapState === "half") onSnapChange?.("peek");
      else onClose?.();
    } else if (info.offset.y < -80) {
      if (snapState === "peek") onSnapChange?.("half");
      else if (snapState === "half") onSnapChange?.("full");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none">
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className={cn(
            "pointer-events-auto w-full bg-gov-surface dark:bg-gov-darkSurface rounded-t-sheet shadow-modal flex flex-col transition-all duration-300",
            heights[snapState],
            className
          )}
        >
          {/* Grab Handle */}
          <div
            className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
            onClick={() => {
              if (snapState === "peek") onSnapChange?.("half");
              else if (snapState === "half") onSnapChange?.("full");
              else onSnapChange?.("peek");
            }}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Sheet Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-24">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
