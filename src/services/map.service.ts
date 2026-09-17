/**
 * Spatial Map Feature Service
 * Serves infrastructure, emergency points of interest, road closures, and hazard boundaries.
 */

export interface MapPointFeature {
  id: string;
  name: string;
  category:
    | "shelter"
    | "hospital"
    | "police"
    | "fire"
    | "road_closure"
    | "citizen_report"
    | "flood"
    | "landslide"
    | "weather";
  coordinates: [number, number]; // [lat, lng]
  status: "Operational" | "At Capacity" | "High Alert" | "Blocked" | "Pending Verification";
  verified: boolean;
  address: string;
  district: string;
  state: string;
  capacity?: { current: number; total: number };
  phone?: string;
  updatedAt: string;
  description: string;
  photoUrl?: string;
  reporterType?: "Citizen" | "Civil Defense" | "Aapda Mitra Volunteer" | "NDRF Scout";
  avoidanceAdvice?: string;
}

export interface HazardPolygon {
  id: string;
  name: string;
  type: "flood" | "landslide" | "cyclone_wind" | "historical";
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  coordinates: [number, number][]; // Ring of points
  fillColor: string;
  strokeColor: string;
  description: string;
}

// TODO(API)
// ISRO Bhuvan Disaster Services WMS & WFS
// Endpoint: https://bhuvan-vec2.nrsc.gov.in/bhuvan/wfs?SERVICE=WFS&REQUEST=GetFeature&TYPENAME=disaster_inundation_layer
export async function fetchBhuvanInundationPolygons(): Promise<HazardPolygon[]> {
  return [
    {
      id: "POLY-CYC-DANA",
      name: "Cyclone DANA High Inundation Surge Belt",
      type: "cyclone_wind",
      severity: "CRITICAL",
      coordinates: [
        [21.65, 87.2],
        [21.2, 87.55],
        [20.7, 87.3],
        [20.6, 86.8],
        [21.1, 86.85],
      ],
      fillColor: "#D32F2F",
      strokeColor: "#B71C1C",
      description: "Tidal surge 1.2m - 1.8m above normal tide forecasted along Dhamra-Chandipur coastline",
    },
    {
      id: "POLY-YAMUNA-FLOOD",
      name: "Yamuna River Old Delhi Floodplain (CWC High Stage)",
      type: "flood",
      severity: "HIGH",
      coordinates: [
        [28.72, 77.22],
        [28.68, 77.25],
        [28.64, 77.26],
        [28.61, 77.25],
        [28.62, 77.23],
        [28.67, 77.21],
      ],
      fillColor: "#0288D1",
      strokeColor: "#01579B",
      description: "Low-lying agricultural flats and riverbed colonies inundated by 206.18m flood level",
    },
  ];
}

// TODO(API)
// NASA Landslide LHASA Model & Geological Survey of India (GSI)
// Endpoint: https://gpm.nasa.gov/data/landslides/lhasa-v2
export async function fetchLandslideRiskZones(): Promise<HazardPolygon[]> {
  return [
    {
      id: "POLY-WYN-LS",
      name: "Meppadi-Churalmala High Debris Flow Zone",
      type: "landslide",
      severity: "CRITICAL",
      coordinates: [
        [11.58, 76.12],
        [11.56, 76.15],
        [11.53, 76.14],
        [11.54, 76.11],
      ],
      fillColor: "#6D4C41",
      strokeColor: "#3E2723",
      description: "Precipitation exceeding 220mm; slope movement detected by GSI piezometers",
    },
  ];
}

export const MOCK_INFRASTRUCTURE_POINTS: MapPointFeature[] = [
  // Shelters
  {
    id: "SHL-BAL-01",
    name: "Chandipur Coastal Multi-Purpose Cyclone Shelter",
    category: "shelter",
    coordinates: [21.468, 87.014],
    status: "Operational",
    verified: true,
    address: "Ward 4, Near High School, Chandipur, Balasore",
    district: "Balasore",
    state: "Odisha",
    capacity: { current: 480, total: 1200 },
    phone: "+91 94371 82910",
    updatedAt: "12m ago by Block Development Officer",
    description: "Equipped with 25kVA solar backup, community kitchen, RO plant, and dedicated female barracks.",
    photoUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "SHL-DEL-02",
    name: "Govt Senior Model School Yamuna Relief Camp",
    category: "shelter",
    coordinates: [28.672, 77.234],
    status: "Operational",
    verified: true,
    address: "Bela Road, Kashmere Gate Transit Area",
    district: "Central Delhi",
    state: "Delhi NCT",
    capacity: { current: 610, total: 850 },
    phone: "+91 98102 44321",
    updatedAt: "18m ago by Delhi SDMA",
    description: "Dry rations, mobile sanitation trailers, clean bedding, and infant formula available.",
    photoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
  },
  // Hospitals
  {
    id: "HOSP-BAL-01",
    name: "Balasore District Headquarters Hospital Trauma Centre",
    category: "hospital",
    coordinates: [21.493, 86.932],
    status: "Operational",
    verified: true,
    address: "Station Road, Balasore Town",
    district: "Balasore",
    state: "Odisha",
    capacity: { current: 320, total: 400 },
    phone: "06782-262001",
    updatedAt: "8m ago by Chief Medical Officer",
    description: "Level-2 Trauma unit on high disaster alert. 4 emergency operating theatres ready.",
    photoUrl: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80",
  },
  // Police Stations
  {
    id: "POL-BAL-01",
    name: "Chandipur Coastal Police Station & Coastal Guard Post",
    category: "police",
    coordinates: [21.462, 87.019],
    status: "Operational",
    verified: true,
    address: "Chandipur Main Beach Road",
    district: "Balasore",
    state: "Odisha",
    phone: "06782-272224",
    updatedAt: "15m ago",
    description: "SDRF rapid inflatable boats stationed; monitoring coastal fishing ban compliance.",
  },
  // Fire Stations
  {
    id: "FIR-BAL-01",
    name: "Balasore Central Fire & Disaster Rescue Station",
    category: "fire",
    coordinates: [21.488, 86.925],
    status: "Operational",
    verified: true,
    address: "Remuna Golei, Balasore",
    district: "Balasore",
    state: "Odisha",
    phone: "101 / 06782-262101",
    updatedAt: "5m ago",
    description: "High-capacity tree clearing hydraulic power units & swift water rescue gear active.",
  },
  // Road Closures
  {
    id: "RC-BAL-01",
    name: "National Highway 16 Submerged Low Culvert (KM 142)",
    category: "road_closure",
    coordinates: [21.385, 86.982],
    status: "Blocked",
    verified: true,
    address: "NH-16 Inbound Corridor near Basta",
    district: "Balasore",
    state: "Odisha",
    updatedAt: "10m ago by Traffic Police",
    description: "Water depth 0.9m across carriage lane due to tidal backflow. Divert via Remuna bypass.",
    avoidanceAdvice: "Use elevated State Highway 19 via Soro to reach emergency shelters safely.",
  },
  // Citizen Reports
  {
    id: "CIT-01-WATERLOG",
    name: "Breached Bund & Trapped Livestock at Bada Gopalpur",
    category: "citizen_report",
    coordinates: [21.431, 87.042],
    status: "Pending Verification",
    verified: false,
    address: "Village Bada Gopalpur, coastal dyke zone",
    district: "Balasore",
    state: "Odisha",
    reporterType: "Aapda Mitra Volunteer",
    updatedAt: "6m ago by Certified Volunteer Ramesh",
    description: "River embankment seeped; water entering 15 homes. 4 senior citizens need boat rescue.",
    photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
  },
];
