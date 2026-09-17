"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Send, MapPin, Camera, AlertOctagon, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { DisasterCategory } from "@/types/disaster";
import { submitCitizenDisasterReport } from "@/services/disasterService";

export interface ReportDisasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords?: [number, number];
}

interface FormValues {
  category: DisasterCategory;
  urgency: "LIFE_THREATENING" | "URGENT_ASSISTANCE" | "PROPERTY_HAZARD" | "INFORMATION_ONLY";
  landmark: string;
  contactNumber: string;
  description: string;
}

export function ReportDisasterModal({
  isOpen,
  onClose,
  currentCoords = [20.82, 87.21],
}: ReportDisasterModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      category: "URBAN_WATERLOGGING",
      urgency: "URGENT_ASSISTANCE",
      landmark: "",
      contactNumber: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await submitCitizenDisasterReport({
        ...data,
        latitude: currentCoords[0],
        longitude: currentCoords[1],
      });
      setSuccessRef(res.incidentRef);
      reset();
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessRef(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Citizen Incident & Hazard Report"
      subtitle="Dispatched directly to the nearest NDRF & District Emergency Control Cell"
      maxWidth="md"
    >
      {successRef ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-gov-successLight text-gov-success flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gov-text dark:text-white mb-2">
            Incident Transmitted to Control Cell
          </h3>
          <p className="text-sm text-gov-muted max-w-sm mx-auto mb-4">
            Official Acknowledgment ID:{" "}
            <span className="font-mono font-bold text-gov-primary dark:text-blue-400">
              {successRef}
            </span>
          </p>
          <p className="text-xs text-gov-muted mb-6">
            GPS Geofence: {currentCoords[0].toFixed(4)}°N, {currentCoords[1].toFixed(4)}°E. Keep your phone line clear.
          </p>
          <Button variant="primary" onClick={handleClose}>
            Back to Map
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gov-primary mb-1.5">
              Disaster Hazard Category
            </label>
            <select
              {...register("category")}
              className="w-full bg-gov-bg dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-btn px-3.5 py-2.5 text-sm text-gov-text dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-primary"
            >
              <option value="URBAN_WATERLOGGING">Severe Urban Waterlogging / Flooding</option>
              <option value="CYCLONE">Cyclone Wind Damage / Fallen Poles</option>
              <option value="LANDSLIDE">Slope Slip / Blocked Mountain Road</option>
              <option value="FLOOD">River Embankment Breach</option>
              <option value="HEATWAVE">Severe Heat Exhaustion Cluster</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gov-primary mb-1.5">
              Urgency Classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "LIFE_THREATENING", label: "Life Threatening", color: "text-gov-danger" },
                { id: "URGENT_ASSISTANCE", label: "Urgent Relief Needed", color: "text-amber-600" },
              ].map((urg) => (
                <label
                  key={urg.id}
                  className="flex items-center gap-2 p-3 rounded-btn border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold"
                >
                  <input
                    type="radio"
                    value={urg.id}
                    {...register("urgency")}
                    className="accent-gov-primary"
                  />
                  <span className={urg.color}>{urg.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gov-text dark:text-gray-200 mb-1">
                Landmark / Local Colony
              </label>
              <input
                type="text"
                placeholder="e.g. Near Old Railway Bridge Pier 4"
                {...register("landmark", { required: "Landmark is required" })}
                className="w-full bg-gov-bg dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-btn px-3.5 py-2 text-sm text-gov-text dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-primary"
              />
              {errors.landmark && (
                <span className="text-[11px] text-gov-danger mt-1 block">
                  {errors.landmark.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gov-text dark:text-gray-200 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                {...register("contactNumber", { required: "Mobile number is required" })}
                className="w-full bg-gov-bg dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-btn px-3.5 py-2 text-sm text-gov-text dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-primary"
              />
              {errors.contactNumber && (
                <span className="text-[11px] text-gov-danger mt-1 block">
                  {errors.contactNumber.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gov-text dark:text-gray-200 mb-1">
              Field Observations / People Stranded
            </label>
            <textarea
              rows={3}
              placeholder="Describe situation, water depth, number of infants/seniors needing rescue..."
              {...register("description", { required: "Description is required" })}
              className="w-full bg-gov-bg dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-btn p-3 text-sm text-gov-text dark:text-white focus:outline-none focus:ring-2 focus:ring-gov-primary"
            />
            {errors.description && (
              <span className="text-[11px] text-gov-danger mt-1 block">
                {errors.description.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-btn bg-gray-100 dark:bg-gray-800 text-xs text-gov-muted">
            <MapPin className="w-4 h-4 text-gov-primary shrink-0" />
            <span>
              Auto-tagged GPS: {currentCoords[0].toFixed(4)}°N, {currentCoords[1].toFixed(4)}°E
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Transmit to NDRF Control Room
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
