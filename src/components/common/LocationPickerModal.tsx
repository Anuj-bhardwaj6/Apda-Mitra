"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  X,
  Check,
  Search,
  Crosshair,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Layers,
} from "lucide-react";
import {
  TARGET_STATES,
  TARGET_REGION_CENTER,
  TargetState,
  TargetDistrict,
  TargetLocality,
} from "@/constants/targetRegion";

export interface LocationPreset {
  name: string;
  state: string;
  coords: [number, number];
  threatStatus?: "Safe" | "Advisory" | "Alert";
  isAllStates?: boolean;
  stateSlug?: string;
  districtName?: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCityName: string;
  onSelectCity: (city: LocationPreset) => void;
  onUseCurrentGps?: () => void;
  isLocating?: boolean;
}

export function LocationPickerModal({
  isOpen,
  onClose,
  selectedCityName,
  onSelectCity,
  onUseCurrentGps,
  isLocating = false,
}: LocationPickerModalProps) {
  const [search, setSearch] = useState("");
  // Hierarchy drill-down state
  const [selectedState, setSelectedState] = useState<TargetState | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<TargetDistrict | null>(null);

  // Search matches across state names, districts, and localities
  const searchResults = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return null;
    const q = search.toLowerCase();
    const results: LocationPreset[] = [];

    TARGET_STATES.forEach((st) => {
      if (st.name.toLowerCase().includes(q) || (st.nameHi && st.nameHi.includes(q))) {
        results.push({
          name: st.name,
          state: "State Scope",
          coords: st.centroid,
          stateSlug: st.slug,
          isAllStates: false,
        });
      }

      st.districts.forEach((dist) => {
        if (dist.name.toLowerCase().includes(q)) {
          results.push({
            name: `${dist.name} District`,
            state: st.name,
            coords: dist.coords,
            stateSlug: st.slug,
            districtName: dist.name,
            isAllStates: false,
          });
        }

        dist.localities.forEach((loc) => {
          if (loc.name.toLowerCase().includes(q)) {
            results.push({
              name: loc.name,
              state: `${dist.name}, ${st.name}`,
              coords: loc.coords,
              stateSlug: st.slug,
              districtName: dist.name,
              isAllStates: false,
            });
          }
        });
      });
    });

    return results;
  }, [search]);

  if (!isOpen) return null;

  const handleSelectAllStates = () => {
    onSelectCity({
      name: "All 10 States",
      state: "Apda Mitra Target Region",
      coords: TARGET_REGION_CENTER,
      isAllStates: true,
    });
    onClose();
  };

  const handleSelectStateDirectly = (st: TargetState) => {
    onSelectCity({
      name: st.name,
      state: st.name,
      coords: st.centroid,
      stateSlug: st.slug,
      isAllStates: false,
    });
    onClose();
  };

  const handleSelectDistrict = (dist: TargetDistrict) => {
    if (!selectedState) return;
    onSelectCity({
      name: dist.name,
      state: selectedState.name,
      coords: dist.coords,
      stateSlug: selectedState.slug,
      districtName: dist.name,
      isAllStates: false,
    });
    onClose();
  };

  const handleSelectLocality = (loc: TargetLocality) => {
    if (!selectedState || !selectedDistrict) return;
    onSelectCity({
      name: loc.name,
      state: `${selectedDistrict.name}, ${selectedState.name}`,
      coords: loc.coords,
      stateSlug: selectedState.slug,
      districtName: selectedDistrict.name,
      isAllStates: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#E4E7EC] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F1F8] text-[#0F4C81] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#16202A] leading-tight">
                Geographic Region & Location
              </h3>
              <p className="text-[10px] text-[#5F6D7E]">
                Apda Mitra 10-State Disaster Monitoring System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F6F8FA] hover:bg-[#EEF1F6] flex items-center justify-center text-[#5F6D7E] transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Action: All 10 States Selection */}
        <div className="p-3 bg-[#F0F4F8] border-b border-[#E4E7EC] flex items-center gap-2">
          <button
            onClick={handleSelectAllStates}
            type="button"
            className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition ${
              selectedCityName.toLowerCase().includes("all 10 states")
                ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                : "bg-white text-[#0F4C81] border-[#B9D5EC] hover:bg-[#E8F1F8]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <div className="text-left">
                <span className="block font-black text-xs leading-none">All 10 States</span>
                <span className="text-[9px] opacity-80">APDA MITRA TARGET REGION</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 uppercase font-black tracking-wider">
              Default View
            </span>
          </button>

          {onUseCurrentGps && (
            <button
              onClick={() => {
                onUseCurrentGps();
                onClose();
              }}
              disabled={isLocating}
              type="button"
              className="py-2 px-3 rounded-xl bg-white border border-[#E4E7EC] hover:border-[#0F4C81]/40 text-xs font-bold text-[#16202A] flex items-center gap-1.5 transition active:scale-98 shrink-0"
              title="Locate via GPS"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C81]" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-[#0F4C81]" />
              )}
              <span className="hidden sm:inline">My GPS</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#E4E7EC] bg-white">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F6F8FA] border border-[#E4E7EC]">
            <Search className="w-4 h-4 text-[#5F6D7E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search state, district, or mountain locality..."
              className="w-full text-xs bg-transparent outline-none text-[#16202A] placeholder:text-[#5F6D7E]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-[#5F6D7E] hover:text-[#16202A]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Hierarchy Breadcrumbs */}
        {!searchResults && (selectedState || selectedDistrict) && (
          <div className="px-4 py-2 bg-[#F6F8FA] border-b border-[#E4E7EC] flex items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setSelectedDistrict(null);
                setSelectedState(null);
              }}
              className="font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>All 10 States</span>
            </button>
            <ChevronRight className="w-3 h-3 text-[#5F6D7E]" />
            {selectedState && !selectedDistrict && (
              <span className="font-extrabold text-[#16202A]">{selectedState.name}</span>
            )}
            {selectedState && selectedDistrict && (
              <>
                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="font-bold text-[#0F4C81] hover:underline"
                >
                  {selectedState.name}
                </button>
                <ChevronRight className="w-3 h-3 text-[#5F6D7E]" />
                <span className="font-extrabold text-[#16202A]">{selectedDistrict.name}</span>
              </>
            )}
          </div>
        )}

        {/* List Content */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          {/* 1. Search Results Mode */}
          {searchResults !== null ? (
            searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <button
                  key={`${item.name}-${idx}`}
                  onClick={() => {
                    onSelectCity(item);
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl flex items-center justify-between text-left transition bg-white hover:bg-[#F6F8FA] border border-[#E4E7EC]"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#16202A]">{item.name}</h4>
                    <p className="text-[10px] text-[#5F6D7E]">{item.state}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5F6D7E]" />
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#5F6D7E]">
                No matching locations found in the 10 target states.
              </div>
            )
          ) : /* 2. Level 3: Localities of Selected District */
          selectedDistrict ? (
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#5F6D7E]">
                  Select Locality in {selectedDistrict.name}
                </span>
                <button
                  onClick={() => handleSelectDistrict(selectedDistrict)}
                  className="text-[10px] font-bold text-[#0F4C81] underline"
                >
                  Monitor Entire District
                </button>
              </div>
              <div className="space-y-1">
                {selectedDistrict.localities.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => handleSelectLocality(loc)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-left transition bg-white hover:bg-[#F6F8FA] border border-[#E4E7EC]"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#16202A]">{loc.name}</h4>
                      {loc.elevationM && (
                        <p className="text-[10px] text-[#5F6D7E]">Elevation: {loc.elevationM}m</p>
                      )}
                    </div>
                    <Check className="w-3.5 h-3.5 text-[#0F4C81] opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          ) : /* 3. Level 2: Districts of Selected State */
          selectedState ? (
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#5F6D7E]">
                  Districts in {selectedState.name}
                </span>
                <button
                  onClick={() => handleSelectStateDirectly(selectedState)}
                  className="text-[10px] font-bold text-[#0F4C81] underline"
                >
                  Monitor Entire State
                </button>
              </div>
              <div className="space-y-1">
                {selectedState.districts.map((dist) => (
                  <div
                    key={dist.id}
                    className="p-2.5 rounded-xl flex items-center justify-between bg-white hover:bg-[#F6F8FA] border border-[#E4E7EC] transition"
                  >
                    <button
                      onClick={() => handleSelectDistrict(dist)}
                      className="text-left flex-1"
                    >
                      <h4 className="text-xs font-bold text-[#16202A]">{dist.name}</h4>
                      <p className="text-[10px] text-[#5F6D7E]">
                        {dist.localities.length} key monitoring points
                      </p>
                    </button>
                    <button
                      onClick={() => setSelectedDistrict(dist)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#0F4C81] bg-[#E8F1F8] hover:bg-[#D4E4F4] flex items-center gap-1 transition"
                    >
                      <span>Drill Down</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 4. Level 1: All 10 Target States List */
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5F6D7E] px-1 mb-2 block">
                10 Authoritative Target States
              </span>
              <div className="space-y-1.5">
                {TARGET_STATES.map((st, idx) => {
                  const isSelected = selectedCityName.toLowerCase().includes(st.name.toLowerCase());
                  return (
                    <div
                      key={st.id}
                      className={`p-2.5 rounded-2xl flex items-center justify-between transition border ${
                        isSelected
                          ? "bg-[#E8F1F8] border-[#0F4C81]/50 shadow-2xs"
                          : "bg-white hover:bg-[#F6F8FA] border-[#E4E7EC]"
                      }`}
                    >
                      <button
                        onClick={() => handleSelectStateDirectly(st)}
                        className="flex items-center gap-3 text-left flex-1"
                      >
                        <span className="w-6 h-6 rounded-lg bg-[#F6F8FA] border border-[#E4E7EC] text-[10px] font-black flex items-center justify-center text-[#5F6D7E]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-[#16202A]">{st.name}</h4>
                            {st.nameHi && (
                              <span className="text-[10px] text-[#5F6D7E]">({st.nameHi})</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#5F6D7E]">
                            {st.districts.length} administrative districts
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedState(st)}
                        type="button"
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#0F4C81] bg-[#E8F1F8] hover:bg-[#D4E4F4] flex items-center gap-1 transition shrink-0 ml-2"
                        title={`Explore districts of ${st.name}`}
                      >
                        <span>Districts</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
