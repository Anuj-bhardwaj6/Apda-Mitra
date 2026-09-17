export type BaseMapId = 'osm' | 'satellite' | 'terrain';

export type GisLayerCategory = 'disaster' | 'infrastructure' | 'geographic';

export type DisasterLayerId = 'flood' | 'landslide' | 'rainfall' | 'hazard_zones';
export type InfrastructureLayerId = 'roads' | 'shelters' | 'hospitals' | 'facilities';
export type GeographicLayerId = 'admin_boundaries' | 'rivers' | 'elevation';

export type GisLayerId = DisasterLayerId | InfrastructureLayerId | GeographicLayerId;

export type RiskSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'safe' | 'info';

export interface GisLegendItem {
  label: string;
  labelHi?: string;
  color: string;
  type: 'fill' | 'line' | 'marker' | 'gradient';
  border?: string;
  subLabel?: string;
}

export interface GisLayerConfig {
  id: GisLayerId;
  name: string;
  nameHi: string;
  category: GisLayerCategory;
  description: string;
  descriptionHi?: string;
  defaultActive: boolean;
  color: string;
  legend: GisLegendItem[];
  sourceUrl?: string;
}

export interface BaseMapConfig {
  id: BaseMapId;
  name: string;
  nameHi: string;
  attribution: string;
  url: string;
  maxZoom: number;
  previewColor: string;
  description: string;
  className?: string;
}

export interface GisGeoJsonProperties {
  id?: string;
  name: string;
  nameHi?: string;
  category?: string;
  risk_level?: RiskSeverity;
  severity?: string;
  depth_m?: number;
  slope_deg?: number;
  rainfall_mm?: number;
  status?: string;
  capacity?: number;
  occupancy?: number;
  contact?: string;
  description?: string;
  area_sqkm?: number;
  elevation_m?: number;
  source?: string;
  updated_at?: string;
  [key: string]: any;
}
