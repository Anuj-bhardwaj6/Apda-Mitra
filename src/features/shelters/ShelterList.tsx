"use client";

import React, { useState } from "react";
import { Home, Navigation, Phone, CheckCircle2, Droplets, Zap, Shield, Search, Filter } from "lucide-react";
import { ShelterItem } from "@/types/shelter";
import { formatDistance } from "@/utils/formatters";

export interface ShelterListProps {
  shelters: ShelterItem[];
  onSelectShelter?: (shelter: ShelterItem) => void;
  selectedId?: string;
  onRouteToShelter?: (shelter: ShelterItem) => void;
}

export function ShelterList({
  shelters,
  onSelectShelter,
  selectedId,
  onRouteToShelter,
}: ShelterListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const filteredShelters = shelters.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "ALL" || s.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E4E7EC] shadow-2xs">
        <div>
          <h2 className="text-lg font-black text-[#16202A] tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0F4C81]" />
            <span>Designated Relief Shelters</span>
          </h2>
          <p className="text-xs text-[#5F6D7E] mt-0.5">
            Geolocated emergency shelters, NDRF bases & trauma wards
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#E8F1F8] text-[#0F4C81] self-start sm:self-center">
          {shelters.length} Verified Centers
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F6D7E]" />
          <input
            type="text"
            placeholder="Search by facility name, district, or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#E4E7EC] text-xs font-medium text-[#16202A] placeholder:text-[#5F6D7E] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All" },
            { id: "RELIEF_CAMP", label: "Relief Camps" },
            { id: "DISTRICT_HOSPITAL", label: "Hospitals" },
            { id: "NDRF_BASE", label: "NDRF Bases" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedType === tab.id
                  ? "bg-[#0F4C81] text-white shadow-2xs"
                  : "bg-white text-[#5F6D7E] hover:text-[#16202A] border border-[#E4E7EC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredShelters.map((shelter) => {
          const isSelected = selectedId === shelter.id;
          const occupancyPercent = Math.round(
            (shelter.currentOccupancy / shelter.totalCapacity) * 100
          );
          const isFull = occupancyPercent >= 95;

          return (
            <div
              key={shelter.id}
              onClick={() => onSelectShelter?.(shelter)}
              className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-card ${
                isSelected
                  ? "border-[#0F4C81] ring-2 ring-[#0F4C81]/20"
                  : "border-[#E4E7EC] hover:border-[#CBD5E1]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    isFull
                      ? "bg-[#FEF3F2] text-[#B42318]"
                      : "bg-[#ECFDF3] text-[#027A48]"
                  }`}
                >
                  {isFull ? "Near Capacity" : "Operational & Open"}
                </span>

                {shelter.distanceMeters && (
                  <span className="text-xs font-bold text-[#0F4C81]">
                    📍 {formatDistance(shelter.distanceMeters)} away
                  </span>
                )}
              </div>

              <h3 className="text-base font-black text-[#16202A] mb-1">
                {shelter.name}
              </h3>
              <p className="text-xs text-[#5F6D7E] mb-3.5 leading-relaxed">
                {shelter.address} • {shelter.district}, {shelter.state}
              </p>

              {/* Occupancy Progress Bar */}
              <div className="mb-3.5 p-3 rounded-2xl bg-[#F6F8FA] border border-[#E4E7EC]">
                <div className="flex justify-between text-xs text-[#5F6D7E] mb-1.5 font-medium">
                  <span>Intake Capacity</span>
                  <span className="text-[#16202A] font-bold">
                    {shelter.currentOccupancy} / {shelter.totalCapacity} ({occupancyPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E4E7EC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      occupancyPercent > 85 ? "bg-[#C62828]" : "bg-[#2E7D32]"
                    }`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </div>

              {/* Badges: Medical, Water, Power */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-[#5F6D7E]">
                {shelter.medicalOfficerOnDuty && (
                  <span className="inline-flex items-center gap-1 text-[#2E7D32] font-semibold bg-[#E8F5E9] px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Doctor on Duty
                  </span>
                )}
                {shelter.powerBackup && (
                  <span className="inline-flex items-center gap-1 font-semibold bg-[#FFF8E1] text-[#B78103] px-2 py-0.5 rounded-md">
                    <Zap className="w-3.5 h-3.5" />
                    Solar Generator
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-semibold bg-[#E8F1F8] text-[#0F4C81] px-2 py-0.5 rounded-md">
                  <Droplets className="w-3.5 h-3.5" />
                  {shelter.drinkingWaterLitres.toLocaleString()}L Water
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRouteToShelter?.(shelter);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0A365C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  <span>Navigate Safe Corridor</span>
                </button>
                <a
                  href={`tel:${shelter.contactNumber}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 rounded-xl bg-[#F6F8FA] hover:bg-[#E8F1F8] text-[#0F4C81] border border-[#E4E7EC] transition"
                  title="Call Camp In-Charge"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredShelters.length === 0 && (
        <div className="p-8 text-center bg-white rounded-3xl border border-[#E4E7EC] text-[#5F6D7E]">
          <p className="font-semibold text-sm">No designated shelters match your search criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedType("ALL");
            }}
            className="mt-2 text-xs text-[#0F4C81] font-bold underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
