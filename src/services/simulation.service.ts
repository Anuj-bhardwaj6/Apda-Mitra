export type SimulationScenarioId =
  | "live"
  | "normal"
  | "heavy_rain"
  | "landslide_warning"
  | "flood_warning"
  | "critical_emergency"
  | "offline";

export interface SimulationScenarioData {
  id: SimulationScenarioId;
  name: string;
  badge: string;
  locationName: string;
  stateName: string;
  coords: [number, number]; // [lat, lng]
  threatLevel: "safe" | "advisory" | "high_risk" | "take_action";
  threatTitle: string;
  threatMessage: string;
  metrics: {
    rainfallMm: number;
    slopeDeg: number;
    soilMoisturePercent: number;
    historicalIncidentsCount: number;
  };
  weather: {
    tempC: number;
    feelsLikeC: number;
    condition: string;
    narrative: string;
    rainMm: number;
    humidity: number;
    windKmh: number;
    visibilityKm: number;
  };
  alerts: Array<{
    id: string;
    severity: "Red" | "Orange" | "Yellow" | "Green";
    category: "Landslide" | "Flood" | "Cyclone" | "Rain";
    title: string;
    message: string;
    authority: string;
    updatedAgo: string;
    actionAdvice: string;
    coordinates?: [number, number];
  }>;
  shelters: Array<{
    id: string;
    name: string;
    category: "shelter" | "hospital" | "police" | "fire";
    distanceKm: number;
    etaMinutes: number;
    address: string;
    phone: string;
    capacity: string;
    status: "Open" | "Ready 24/7" | "Full";
    lat: number;
    lng: number;
  }>;
  aiGuidance: {
    text: string;
    recommendation: string;
    validUntil: string;
  };
  communityReports: Array<{
    id: string;
    type: "Landslide" | "Waterlogging" | "Tree Fallen" | "Road Crack";
    title: string;
    landmark: string;
    updatedAgo: string;
    verified: boolean;
    verificationNotes: string;
    upvotes: number;
    lat: number;
    lng: number;
  }>;
  hazardsOnMap: Array<{
    id: string;
    type: "landslide" | "flood" | "road_closure" | "citizen_report";
    title: string;
    description: string;
    lat: number;
    lng: number;
    severity: "Red" | "Orange" | "Yellow" | "Green";
    polygon?: [number, number][];
  }>;
  timeline: Array<{
    time: string;
    event: string;
    type: "rain" | "sensor" | "ai" | "citizen" | "officer" | "closure";
  }>;
}

export const SIMULATION_SCENARIOS: Record<SimulationScenarioId, SimulationScenarioData> = {
  live: {
    id: "live",
    name: "Live Production Data",
    badge: "LIVE DATA",
    locationName: "Current GPS Location",
    stateName: "India",
    coords: [25.5788, 91.8933], // Default center in NER if GPS initializing
    threatLevel: "safe",
    threatTitle: "Safe Zone",
    threatMessage: "No active natural disaster warnings detected in your immediate sector.",
    metrics: {
      rainfallMm: 0,
      slopeDeg: 12,
      soilMoisturePercent: 32,
      historicalIncidentsCount: 0,
    },
    weather: {
      tempC: 22,
      feelsLikeC: 22,
      condition: "Partly Cloudy",
      narrative: "Clear traveling conditions across major highway corridors.",
      rainMm: 0,
      humidity: 62,
      windKmh: 12,
      visibilityKm: 10,
    },
    alerts: [],
    shelters: [],
    aiGuidance: {
      text: "Atmospheric stability is normal. No emergency slope movement forecasted.",
      recommendation: "Standard travel routes remain clear and open.",
      validUntil: "Next 24 hours",
    },
    communityReports: [],
    hazardsOnMap: [],
    timeline: [
      { time: "09:00", event: "Sensor network telemetry sync nominal", type: "sensor" },
    ],
  },
  normal: {
    id: "normal",
    name: "Scenario 1: Normal (All Clear)",
    badge: "SIMULATION: NORMAL",
    locationName: "Shillong Foothills",
    stateName: "Meghalaya",
    coords: [25.5788, 91.8933],
    threatLevel: "safe",
    threatTitle: "All Clear — Safe Zone",
    threatMessage: "No active natural disaster warnings or slope creep detected.",
    metrics: {
      rainfallMm: 4.2,
      slopeDeg: 14,
      soilMoisturePercent: 38,
      historicalIncidentsCount: 1,
    },
    weather: {
      tempC: 21,
      feelsLikeC: 21,
      condition: "Partly Cloudy",
      narrative: "Mild mountain breeze. Safe driving conditions on all hill roads.",
      rainMm: 4.2,
      humidity: 64,
      windKmh: 11,
      visibilityKm: 10,
    },
    alerts: [],
    shelters: [
      {
        id: "sim-sh-1",
        name: "Shillong Municipal Community Relief Center",
        category: "shelter",
        distanceKm: 1.4,
        etaMinutes: 5,
        address: "Police Bazar Ward, Shillong",
        phone: "0364-2224010",
        capacity: "180 / 250 beds free",
        status: "Open",
        lat: 25.5755,
        lng: 91.884,
      },
      {
        id: "sim-hosp-1",
        name: "Civil Hospital Shillong",
        category: "hospital",
        distanceKm: 2.1,
        etaMinutes: 7,
        address: "Labann, Shillong",
        phone: "108",
        capacity: "24/7 Trauma Wing Active",
        status: "Ready 24/7",
        lat: 25.568,
        lng: 91.879,
      },
    ],
    aiGuidance: {
      text: "Slope equilibrium indicators are stable across all district nodes.",
      recommendation: "All national and state mountain highways are fully operational.",
      validUntil: "Next 12 hours",
    },
    communityReports: [],
    hazardsOnMap: [],
    timeline: [
      { time: "08:15", event: "GSI Inclinometer baseline calibrated", type: "sensor" },
      { time: "09:30", event: "All district passes confirmed clear", type: "officer" },
    ],
  },
  heavy_rain: {
    id: "heavy_rain",
    name: "Scenario 2: Heavy Monsoon Rain",
    badge: "SIMULATION: HEAVY RAIN",
    locationName: "Cherrapunji (Sohra)",
    stateName: "Meghalaya",
    coords: [25.2986, 91.7324],
    threatLevel: "advisory",
    threatTitle: "Stay Alert — Monsoon Advisory",
    threatMessage: "Sustained monsoon showers may saturate upper soil layers. Avoid road edges.",
    metrics: {
      rainfallMm: 68.4,
      slopeDeg: 28,
      soilMoisturePercent: 72,
      historicalIncidentsCount: 4,
    },
    weather: {
      tempC: 18,
      feelsLikeC: 16,
      condition: "Heavy Rain",
      narrative: "Intense downpours ongoing. Rain expected to continue past 7 PM.",
      rainMm: 68.4,
      humidity: 92,
      windKmh: 28,
      visibilityKm: 4,
    },
    alerts: [
      {
        id: "sim-alt-rain",
        severity: "Orange",
        category: "Rain",
        title: "Heavy Rainfall Advisory",
        message: "Rainfall exceeding 65mm in 12h. Mountain cascades operating near brim.",
        authority: "India Meteorological Department (IMD)",
        updatedAgo: "14 mins ago",
        actionAdvice: "Drive with fog lamps on. Avoid parking under steep cut slopes.",
        coordinates: [25.3, 91.73],
      },
    ],
    shelters: [
      {
        id: "sim-sh-sohra",
        name: "Sohra Community Hall & Emergency Base",
        category: "shelter",
        distanceKm: 0.9,
        etaMinutes: 3,
        address: "Sohra Market Road",
        phone: "03637-235222",
        capacity: "95 / 150 beds free",
        status: "Open",
        lat: 25.295,
        lng: 91.728,
      },
    ],
    aiGuidance: {
      text: "Precipitation accumulation rate is approaching slope drainage capacity.",
      recommendation: "Do not traverse unpaved village approach tracks after dusk.",
      validUntil: "Today 11:00 PM",
    },
    communityReports: [
      {
        id: "sim-rep-water",
        type: "Waterlogging",
        title: "Water overflowing drainage culvert",
        landmark: "Near Sohra Market bend",
        updatedAgo: "22 mins ago",
        verified: true,
        verificationNotes: "Verified by Village Headman",
        upvotes: 6,
        lat: 25.297,
        lng: 91.731,
      },
    ],
    hazardsOnMap: [
      {
        id: "sim-hz-rain",
        type: "flood",
        title: "Culvert Water Accumulation",
        description: "Water level 0.4m over road shoulder.",
        lat: 25.297,
        lng: 91.731,
        severity: "Orange",
      },
    ],
    timeline: [
      { time: "10:24", event: "Rainfall intensity increased to 12 mm/hr", type: "rain" },
      { time: "10:48", event: "Soil moisture index reached 72%", type: "sensor" },
      { time: "11:05", event: "AI raised monitoring level to Advisory", type: "ai" },
      { time: "11:21", event: "Citizen report logged for culvert drainage", type: "citizen" },
    ],
  },
  landslide_warning: {
    id: "landslide_warning",
    name: "Scenario 3: Landslide Warning (NER Focus)",
    badge: "SIMULATION: LANDSLIDE ALERT",
    locationName: "East Khasi Hills Corridor",
    stateName: "Meghalaya",
    coords: [25.532, 91.865],
    threatLevel: "high_risk",
    threatTitle: "High Risk — Landslide Warning",
    threatMessage: "Severe rainfall has compromised hillside slope stability along NH-40.",
    metrics: {
      rainfallMm: 112.6,
      slopeDeg: 34,
      soilMoisturePercent: 88,
      historicalIncidentsCount: 8,
    },
    weather: {
      tempC: 17,
      feelsLikeC: 15,
      condition: "Torrential Showers",
      narrative: "Heavy squall line active. Slope drainage overloaded.",
      rainMm: 112.6,
      humidity: 96,
      windKmh: 36,
      visibilityKm: 2.5,
    },
    alerts: [
      {
        id: "sim-alt-ls",
        severity: "Red",
        category: "Landslide",
        title: "High Debris Flow & Landslide Warning",
        message: "Continuous 24h precipitation threshold crossed. Rockfall detected at Mile 14.",
        authority: "Geological Survey of India (GSI) & NDMA",
        updatedAgo: "8 mins ago",
        actionAdvice: "Divert all transit to Upper Shillong Bypass. Do not stop near cuttings.",
        coordinates: [25.535, 91.87],
      },
    ],
    shelters: [
      {
        id: "sim-sh-uppershillong",
        name: "Upper Shillong Civil Relief Camp",
        category: "shelter",
        distanceKm: 1.8,
        etaMinutes: 6,
        address: "5th Mile, Upper Shillong High Ground",
        phone: "1078",
        capacity: "124 / 200 beds free",
        status: "Open",
        lat: 25.539,
        lng: 91.858,
      },
      {
        id: "sim-pol-ls",
        name: "Highway Patrol Staging Post",
        category: "police",
        distanceKm: 0.7,
        etaMinutes: 2,
        address: "NH-40 Junction",
        phone: "112",
        capacity: "Disaster Escort Vehicles Onsite",
        status: "Ready 24/7",
        lat: 25.531,
        lng: 91.863,
      },
    ],
    aiGuidance: {
      text: "XGBoost model identifies 84.6% debris hazard based on 34° slope and rainfall saturation.",
      recommendation: "Take the designated Upper Shillong Bypass. NH-40 Old Section restricted.",
      validUntil: "Active until tomorrow 06:00 AM",
    },
    communityReports: [
      {
        id: "sim-rep-ls",
        type: "Landslide",
        title: "Loose boulders & mud sliding onto outer lane",
        landmark: "Mile 14 Curve, NH-40",
        updatedAgo: "11 mins ago",
        verified: true,
        verificationNotes: "Verified by SDRF Patrol Unit",
        upvotes: 14,
        lat: 25.534,
        lng: 91.868,
      },
    ],
    hazardsOnMap: [
      {
        id: "sim-hz-ls-zone",
        type: "landslide",
        title: "Active Landslide Hazard Zone",
        description: "Debris flow hazard along 1.2km steep incline.",
        lat: 25.534,
        lng: 91.868,
        severity: "Red",
        polygon: [
          [25.538, 91.864],
          [25.536, 91.873],
          [25.53, 91.871],
          [25.532, 91.863],
        ],
      },
      {
        id: "sim-hz-closure",
        type: "road_closure",
        title: "NH-40 Lane Closure",
        description: "Outer lane blocked by rockfall debris.",
        lat: 25.533,
        lng: 91.866,
        severity: "Red",
      },
    ],
    timeline: [
      { time: "10:24", event: "Rainfall crossed 100mm threshold in East Khasi Hills", type: "rain" },
      { time: "10:48", event: "Slope displacement detected by automated inclinometer", type: "sensor" },
      { time: "11:05", event: "AI evaluated High Risk (0.84 composite score)", type: "ai" },
      { time: "11:21", event: "Citizen report received with photo of rockfall", type: "citizen" },
      { time: "11:34", event: "SDRF Officer verified on ground", type: "officer" },
      { time: "11:42", event: "Official road closure confirmed by Traffic Police", type: "closure" },
    ],
  },
  flood_warning: {
    id: "flood_warning",
    name: "Scenario 4: River Flood Inundation",
    badge: "SIMULATION: FLOOD INUNDATION",
    locationName: "Guwahati Embankment Zone",
    stateName: "Assam",
    coords: [26.185, 91.75],
    threatLevel: "high_risk",
    threatTitle: "River Stage High Alert",
    threatMessage: "Brahmaputra water level 1.1m above danger mark. Lowlands inundating.",
    metrics: {
      rainfallMm: 85.0,
      slopeDeg: 4,
      soilMoisturePercent: 95,
      historicalIncidentsCount: 12,
    },
    weather: {
      tempC: 26,
      feelsLikeC: 30,
      condition: "Overcast Showers",
      narrative: "Heavy river catchment inflow. Water accumulation accelerating.",
      rainMm: 85.0,
      humidity: 90,
      windKmh: 18,
      visibilityKm: 6,
    },
    alerts: [
      {
        id: "sim-alt-fld",
        severity: "Red",
        category: "Flood",
        title: "Brahmaputra Flood Surge Warning",
        message: "CWC gauge confirms water level breached danger mark by 1.10 meters.",
        authority: "Central Water Commission & Assam SDMA",
        updatedAgo: "18 mins ago",
        actionAdvice: "Move domestic livestock to elevated embankments immediately.",
        coordinates: [26.188, 91.752],
      },
    ],
    shelters: [
      {
        id: "sim-sh-gauhati",
        name: "Guwahati Multi-Purpose Relief Staging Complex",
        category: "shelter",
        distanceKm: 2.4,
        etaMinutes: 8,
        address: "Paltan Bazar High Ground, Guwahati",
        phone: "1077",
        capacity: "340 / 600 beds free",
        status: "Open",
        lat: 26.175,
        lng: 91.762,
      },
    ],
    aiGuidance: {
      text: "SAR satellite imagery shows 14 sq km inundation spreading southwest.",
      recommendation: "Avoid riverside pedestrian walkways and causeways.",
      validUntil: "Tonight 12:00 AM",
    },
    communityReports: [],
    hazardsOnMap: [
      {
        id: "sim-hz-flood-inundation",
        type: "flood",
        title: "Inundation Zone (Brahmaputra Surge)",
        description: "Submerged causeway and agricultural land.",
        lat: 26.188,
        lng: 91.752,
        severity: "Red",
        polygon: [
          [26.195, 91.74],
          [26.192, 91.765],
          [26.18, 91.76],
          [26.182, 91.738],
        ],
      },
    ],
    timeline: [
      { time: "07:30", event: "Upstream dam discharge commenced", type: "sensor" },
      { time: "09:45", event: "Water crossed 49.68m gauge mark", type: "sensor" },
      { time: "10:30", event: "SDMA published District Flood Bulletin #12", type: "officer" },
    ],
  },
  critical_emergency: {
    id: "critical_emergency",
    name: "Scenario 5: Critical Emergency (Disaster Mode)",
    badge: "SIMULATION: CRITICAL EMERGENCY",
    locationName: "Umiam Slopes / Ri-Bhoi",
    stateName: "Meghalaya",
    coords: [25.665, 91.895],
    threatLevel: "take_action",
    threatTitle: "TAKE ACTION — IMMEDIATE EVACUATION",
    threatMessage: "Massive mudslide active. Immediate evacuation to designated safe center ordered.",
    metrics: {
      rainfallMm: 164.0,
      slopeDeg: 38,
      soilMoisturePercent: 98,
      historicalIncidentsCount: 15,
    },
    weather: {
      tempC: 16,
      feelsLikeC: 13,
      condition: "Severe Torrential Storm",
      narrative: "Dangerous storm conditions. Seek structural shelter immediately.",
      rainMm: 164.0,
      humidity: 98,
      windKmh: 48,
      visibilityKm: 1.2,
    },
    alerts: [
      {
        id: "sim-alt-crit",
        severity: "Red",
        category: "Landslide",
        title: "MANDATORY EVACUATION ORDER #01",
        message: "Slope failure initiated above settlement. Immediate evacuation enforced.",
        authority: "National Disaster Response Force (NDRF) & District Magistrate",
        updatedAgo: "Just now",
        actionAdvice: "Carry emergency survival kit. Do not delay. Follow marked safe path.",
        coordinates: [25.668, 91.897],
      },
    ],
    shelters: [
      {
        id: "sim-sh-umiam",
        name: "Umiam Elevated Structural Shelter Base",
        category: "shelter",
        distanceKm: 0.8,
        etaMinutes: 3,
        address: "High Ridge Safety Enclave",
        phone: "112",
        capacity: "90 / 300 beds occupied • Clean water & medics ready",
        status: "Open",
        lat: 25.669,
        lng: 91.891,
      },
    ],
    aiGuidance: {
      text: "Multi-hazard threat index is at MAXIMUM (0.96). High risk along old descent road.",
      recommendation: "Immediate transit through West Ridge Corridor only. Dial 112 if trapped.",
      validUntil: "IMMEDIATE EMERGENCY",
    },
    communityReports: [],
    hazardsOnMap: [
      {
        id: "sim-hz-crit-ls",
        type: "landslide",
        title: "Active Hillside Breached",
        description: "Catastrophic debris flow crossing valley.",
        lat: 25.667,
        lng: 91.896,
        severity: "Red",
        polygon: [
          [25.672, 91.892],
          [25.67, 91.902],
          [25.662, 91.899],
          [25.664, 91.89],
        ],
      },
    ],
    timeline: [
      { time: "11:15", event: "Extreme slope shear stress detected", type: "sensor" },
      { time: "11:22", event: "AI raised alert to TAKE ACTION", type: "ai" },
      { time: "11:28", event: "District Magistrate issued Mandatory Evacuation", type: "officer" },
      { time: "11:35", event: "NDRF 1st Battalion deployed to transit nodes", type: "officer" },
    ],
  },
  offline: {
    id: "offline",
    name: "Scenario 6: Offline Shell (Network Down)",
    badge: "SIMULATION: OFFLINE",
    locationName: "Last Cached: Shillong",
    stateName: "Meghalaya",
    coords: [25.5788, 91.8933],
    threatLevel: "advisory",
    threatTitle: "Offline Mode Active",
    threatMessage: "Cellular connection unavailable. Displaying cached emergency resources.",
    metrics: {
      rainfallMm: 45.0,
      slopeDeg: 24,
      soilMoisturePercent: 65,
      historicalIncidentsCount: 3,
    },
    weather: {
      tempC: 20,
      feelsLikeC: 20,
      condition: "Cloudy (Cached)",
      narrative: "Displaying last known weather telemetry cached on device.",
      rainMm: 45.0,
      humidity: 78,
      windKmh: 14,
      visibilityKm: 8,
    },
    alerts: [
      {
        id: "sim-alt-offline",
        severity: "Yellow",
        category: "Landslide",
        title: "Cached Early Warning Advisory",
        message: "Keep emergency radio tuned to All India Radio disaster frequencies.",
        authority: "Cached NDMA Broadcast",
        updatedAgo: "Cached 1h ago",
        actionAdvice: "Local emergency SMS broadcasts remain active without mobile internet.",
      },
    ],
    shelters: [
      {
        id: "sim-sh-off",
        name: "Shillong Municipal Community Relief Center",
        category: "shelter",
        distanceKm: 1.4,
        etaMinutes: 5,
        address: "Police Bazar Ward, Shillong",
        phone: "112",
        capacity: "Verified Offline Location",
        status: "Ready 24/7",
        lat: 25.5755,
        lng: 91.884,
      },
    ],
    aiGuidance: {
      text: "Offline safety guidance active. Use pre-downloaded topographic corridors.",
      recommendation: "Follow pre-designated evacuation signs posted on highway posts.",
      validUntil: "Offline Cache",
    },
    communityReports: [],
    hazardsOnMap: [],
    timeline: [
      { time: "11:50", event: "Network disconnected. Offline storage cache engaged", type: "sensor" },
    ],
  },
};
