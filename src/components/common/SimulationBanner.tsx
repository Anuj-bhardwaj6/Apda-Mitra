"use client";

import React from "react";
import { AlertCircle, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { SimulationScenarioId, SIMULATION_SCENARIOS } from "@/services/simulation.service";

interface SimulationBannerProps {
  currentScenario: SimulationScenarioId;
  onSelectScenario: (scenario: SimulationScenarioId) => void;
  lang?: "en" | "hi";
}

export function SimulationBanner({
  currentScenario,
  onSelectScenario,
  lang = "en",
}: SimulationBannerProps) {
  const isSimulating = currentScenario !== "live";

  if (!isSimulating) {
    return (
      <div className="w-full bg-[#E8F1F8] border-b border-[#0F4C81]/15 px-3 py-1.5 flex items-center justify-between text-xs text-[#0F4C81]">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            <span>
              {lang === "en" ? "Live Telemetry Active" : "लाइव टेलीमेट्री सक्रिय"}
            </span>
            <span className="hidden sm:inline text-black/30">•</span>
            <span className="hidden sm:inline text-[#5F6D7E]">
              {lang === "en"
                ? "Connecting to Open-Meteo, GSI & PostGIS"
                : "मौसम विज्ञान एवं उपग्रह आंकड़ों से सीधा जुड़ाव"}
            </span>
          </div>

          {/* Judge / Evaluator quick launcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#5F6D7E] hidden md:inline">
              Judge / Evaluation Mode:
            </span>
            <select
              value={currentScenario}
              onChange={(e) => onSelectScenario(e.target.value as SimulationScenarioId)}
              className="bg-white text-[#0F4C81] border border-[#0F4C81]/30 rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F4C81] cursor-pointer"
            >
              <option value="live">Live Production (Actual GPS)</option>
              <option value="normal">Scenario 1: Normal (Safe Zone)</option>
              <option value="heavy_rain">Scenario 2: Heavy Monsoon Rain</option>
              <option value="landslide_warning">Scenario 3: Landslide Alert (NER)</option>
              <option value="flood_warning">Scenario 4: Flood Inundation (Assam)</option>
              <option value="critical_emergency">Scenario 5: Critical Emergency</option>
              <option value="offline">Scenario 6: Offline Shell</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  const activeScenarioData = SIMULATION_SCENARIOS[currentScenario];

  return (
    <div className="w-full bg-[#FFF8E1] border-b-2 border-[#F59E0B] px-4 py-2 text-xs text-[#78350F] shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#F59E0B] text-white font-extrabold text-[10px] tracking-wider uppercase">
            SIMULATION MODE
          </span>
          <span className="font-bold text-sm text-[#92400E]">
            {activeScenarioData.name}
          </span>
          <span className="text-[#92400E]/70 hidden md:inline">
            (For product evaluation — this is simulated disaster telemetry)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={currentScenario}
            onChange={(e) => onSelectScenario(e.target.value as SimulationScenarioId)}
            className="bg-white text-[#78350F] border border-[#F59E0B] rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="normal">Scenario 1: Normal (Safe Zone)</option>
            <option value="heavy_rain">Scenario 2: Heavy Monsoon Rain</option>
            <option value="landslide_warning">Scenario 3: Landslide Alert (NER)</option>
            <option value="flood_warning">Scenario 4: Flood Inundation (Assam)</option>
            <option value="critical_emergency">Scenario 5: Critical Emergency</option>
            <option value="offline">Scenario 6: Offline Shell</option>
          </select>

          <button
            onClick={() => onSelectScenario("live")}
            type="button"
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0A365C] transition shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Return to Live Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
