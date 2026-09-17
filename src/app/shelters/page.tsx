"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Home, MapPin, Navigation, Shield, PhoneCall } from "lucide-react";
import { GovHeader } from "@/components/common/GovHeader";
import { ShelterList } from "@/features/shelters/ShelterList";
import { ShelterItem } from "@/types/shelter";
import { MOCK_SHELTERS } from "@/constants/mockData";
import { fetchOsrmEvacuationRoute } from "@/services/apiPlaceholders";

export default function SheltersDedicatedPage() {
  const [shelters, setShelters] = useState<ShelterItem[]>(MOCK_SHELTERS);
  const [selectedShelter, setSelectedShelter] = useState<ShelterItem | null>(null);
  const [routeNote, setRouteNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch verified shelters from FastAPI backend or fallback
  useEffect(() => {
    async function loadShelters() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/shelters/nearby?lat=25.532&lon=91.865", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: ShelterItem[] = json.data.map((item: any) => ({
              id: item.shelter.id || item.shelter.shelter_code,
              name: item.shelter.name,
              type: item.shelter.type as any,
              coordinates: [item.shelter.latitude, item.shelter.longitude],
              address: item.shelter.address,
              district: item.shelter.district,
              state: item.shelter.state,
              totalCapacity: item.shelter.total_capacity,
              currentOccupancy: item.shelter.current_occupancy,
              contactPerson: item.shelter.contact_person,
              contactNumber: item.shelter.contact_number,
              isOpen: item.shelter.is_open,
              facilities: item.shelter.facilities || [],
              medicalOfficerOnDuty: item.shelter.medical_officer_on_duty,
              powerBackup: item.shelter.power_backup,
              drinkingWaterLitres: item.shelter.drinking_water_litres,
              distanceMeters: Math.round(item.distance_km * 1000),
            }));
            setShelters(mapped);
          }
        }
      } catch (err) {
        console.warn("[SheltersPage] FastAPI backend offline, using baseline shelters", err);
      } finally {
        setLoading(false);
      }
    }

    loadShelters();
  }, []);

  const handleRouteToShelter = async (shelter: ShelterItem) => {
    setSelectedShelter(shelter);
    try {
      const res = await fetchOsrmEvacuationRoute([25.532, 91.865], shelter.coordinates);
      setRouteNote(`Safe corridor plotted to ${shelter.name} (~${res.durationMinutes} min via elevated bypass)`);
    } catch {
      setRouteNote(`Navigating to ${shelter.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#16202A] flex flex-col">
      <GovHeader currentLocationName="All 10 States" />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0F4C81] hover:underline px-3 py-1.5 rounded-full bg-white border border-[#E4E7EC] shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Safety Dashboard</span>
          </Link>

          <span className="text-xs text-[#5F6D7E]">
            National Disaster Management Directory (NDMA Section 12)
          </span>
        </div>

        {/* Route Notification Pill */}
        {routeNote && (
          <div className="bg-[#0F4C81] text-white px-5 py-3 rounded-2xl shadow-card flex items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 fill-current animate-pulse shrink-0" />
              <span className="font-bold">{routeNote}</span>
            </div>
            <button
              onClick={() => setRouteNote(null)}
              className="text-white/80 hover:text-white font-bold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Shelter List Component */}
        <ShelterList
          shelters={shelters}
          selectedId={selectedShelter?.id}
          onSelectShelter={(s) => setSelectedShelter(s)}
          onRouteToShelter={handleRouteToShelter}
        />
      </main>
    </div>
  );
}
