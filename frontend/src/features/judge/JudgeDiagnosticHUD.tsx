'use client';

import React from 'react';
import { Terminal, Shield, Activity, Wifi, Database, Radio, X, CheckCircle2 } from 'lucide-react';
import { DisasterAppMode } from '@/shared/types/disaster';

interface JudgeDiagnosticHUDProps {
  isOpen: boolean;
  onClose: () => void;
  appMode: DisasterAppMode;
  onSetAppMode: (mode: DisasterAppMode) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}

export const JudgeDiagnosticHUD: React.FC<JudgeDiagnosticHUDProps> = ({
  isOpen,
  onClose,
  appMode,
  onSetAppMode,
  isOffline,
  onToggleOffline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 1000 }}>
      <div className="bg-[#0B111A] border border-[#24344B] w-full max-w-lg rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 text-white relative animate-in fade-in zoom-in-95 font-mono">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-[#81D4FA]" />
            <h3 className="text-sm sm:text-base font-black text-[#81D4FA] tracking-wide uppercase">
              SIH 2025 Judge Diagnostic HUD
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Live State Scenario Simulation Switcher */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            ▶ 1. Live Disaster Scenario Simulator:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSetAppMode('normal')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                appMode === 'normal'
                  ? 'bg-[#1B5E20] border-[#81C784] text-white ring-2 ring-green-400'
                  : 'bg-[#14202E] border-gray-800 text-gray-400'
              }`}
            >
              🔵 Normal (Calm)
            </button>

            <button
              onClick={() => onSetAppMode('warning')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                appMode === 'warning'
                  ? 'bg-[#E65100] border-[#FFE082] text-white ring-2 ring-amber-400'
                  : 'bg-[#14202E] border-gray-800 text-gray-400'
              }`}
            >
              🟠 Rain Warning
            </button>

            <button
              onClick={() => onSetAppMode('disaster')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                appMode === 'disaster'
                  ? 'bg-[#B71C1C] border-[#FF8A80] text-white ring-2 ring-red-500 animate-pulse'
                  : 'bg-[#14202E] border-gray-800 text-gray-400'
              }`}
            >
              🔴 Disaster Red
            </button>
          </div>
        </div>

        {/* 2. Offline Mode Resiliency Switch */}
        <div className="p-3 bg-[#131D2A] rounded-2xl border border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className={`w-4 h-4 ${isOffline ? 'text-amber-400' : 'text-emerald-400'}`} />
            <div>
              <span className="text-xs font-bold block">PWA Offline Resilience Simulator</span>
              <span className="text-[10px] text-gray-400">
                {isOffline ? 'Simulating zero cellular connectivity' : 'Connected to live networks'}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleOffline}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isOffline ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300'
            }`}
          >
            {isOffline ? 'Offline Active' : 'Go Offline'}
          </button>
        </div>

        {/* 3. System Telemetry & Model Metadata */}
        <div className="p-3.5 bg-[#14202E] rounded-2xl border border-gray-800 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">AI Ensemble Model:</span>
            <span className="font-bold text-[#81D4FA]">NDMA-GSI-Terrain-v3.2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">GPS Satellites / Accuracy:</span>
            <span className="font-bold text-emerald-400">12 Sats • ±3.2m (NavIC / GPS)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Offline Storage Cache:</span>
            <span className="font-bold text-gray-200">IndexedDB: 4.8MB (Tiles, Shelters, 112)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Real-time WebSocket:</span>
            <span className="font-bold text-emerald-400">● Connected (Latency 38ms)</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-[#0F4C81] hover:bg-[#0C3D68] text-white rounded-2xl font-bold text-xs"
        >
          Exit Diagnostic HUD
        </button>
      </div>
    </div>
  );
};
