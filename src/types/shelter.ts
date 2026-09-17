export type ShelterType =
  | "RELIEF_CAMP"
  | "NDRF_BASE"
  | "DISTRICT_HOSPITAL"
  | "CYCLONE_SHELTER"
  | "FOOD_DISTRIBUTION";

export interface ShelterItem {
  id: string;
  name: string;
  type: ShelterType;
  coordinates: [number, number];
  address: string;
  district: string;
  state: string;
  totalCapacity: number;
  currentOccupancy: number;
  contactPerson: string;
  contactNumber: string;
  isOpen: boolean;
  facilities: string[];
  medicalOfficerOnDuty: boolean;
  powerBackup: boolean;
  drinkingWaterLitres: number;
  distanceMeters?: number;
}
