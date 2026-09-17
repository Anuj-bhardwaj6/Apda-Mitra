"use client";

import { useContext } from "react";
import { LocationContext, LocationContextType } from "@/context/LocationContext";

export function useCurrentLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useCurrentLocation must be used within a LocationProvider");
  }
  return context;
}
