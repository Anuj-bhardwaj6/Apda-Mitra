export interface TargetLocality {
  name: string;
  coords: [number, number]; // [lat, lng]
  elevationM?: number;
}

export interface TargetDistrict {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
  localities: TargetLocality[];
}

export interface TargetState {
  id: string;
  slug: string;
  name: string;
  nameHi: string;
  centroid: [number, number]; // [lat, lng]
  bbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  defaultZoom: number;
  districts: TargetDistrict[];
}

/**
 * Bounding Box for the entire APDA MITRA TARGET REGION (All 10 States):
 * Spanning the Western Himalayas (Himachal, Uttarakhand) to the Eastern Himalayas / North East
 * (Sikkim, Arunachal Pradesh, Assam, Meghalaya, Nagaland, Manipur, Mizoram, Tripura).
 */
export const TARGET_REGION_BBOX: [[number, number], [number, number]] = [
  [21.8, 75.5], // Southwest [minLat, minLon]
  [33.3, 97.4], // Northeast [maxLat, maxLon]
];

export const TARGET_REGION_CENTER: [number, number] = [27.5, 88.5];
export const TARGET_REGION_DEFAULT_ZOOM = 6;

export const TARGET_STATES: TargetState[] = [
  {
    id: "hp",
    slug: "himachal-pradesh",
    name: "Himachal Pradesh",
    nameHi: "हिमाचल प्रदेश",
    centroid: [31.1048, 77.1734],
    bbox: { minLat: 30.38, maxLat: 33.22, minLon: 75.6, maxLon: 79.0 },
    defaultZoom: 8,
    districts: [
      {
        id: "hp-shimla",
        name: "Shimla",
        coords: [31.1048, 77.1734],
        localities: [
          { name: "Shimla Ridge", coords: [31.105, 77.175], elevationM: 2205 },
          { name: "Kufri", coords: [31.097, 77.267], elevationM: 2720 },
          { name: "Rampur Bushahr", coords: [31.396, 77.632], elevationM: 1005 },
        ],
      },
      {
        id: "hp-mandi",
        name: "Mandi",
        coords: [31.7087, 76.932],
        localities: [
          { name: "Mandi Town", coords: [31.708, 76.932], elevationM: 760 },
          { name: "Pandoh Dam Corridor", coords: [31.67, 77.05], elevationM: 890 },
          { name: "Joginder Nagar", coords: [31.98, 76.77], elevationM: 1220 },
        ],
      },
      {
        id: "hp-kullu",
        name: "Kullu",
        coords: [31.9578, 77.1095],
        localities: [
          { name: "Manali", coords: [32.2396, 77.1887], elevationM: 2050 },
          { name: "Solang Valley", coords: [32.316, 77.157], elevationM: 2560 },
          { name: "Banjar / Tirthan", coords: [31.637, 77.345], elevationM: 1400 },
        ],
      },
      {
        id: "hp-kangra",
        name: "Kangra",
        coords: [32.0998, 76.2691],
        localities: [
          { name: "Dharamshala", coords: [32.219, 76.323], elevationM: 1457 },
          { name: "McLeod Ganj", coords: [32.242, 76.321], elevationM: 2082 },
          { name: "Palampur", coords: [32.11, 76.54], elevationM: 1220 },
        ],
      },
      {
        id: "hp-kinnaur",
        name: "Kinnaur",
        coords: [31.65, 78.47],
        localities: [
          { name: "Reckong Peo", coords: [31.54, 78.27], elevationM: 2290 },
          { name: "Sangla Valley", coords: [31.42, 78.26], elevationM: 2696 },
          { name: "Pooh Highway Node", coords: [31.76, 78.59], elevationM: 2662 },
        ],
      },
      {
        id: "hp-chamba",
        name: "Chamba",
        coords: [32.5534, 76.1258],
        localities: [
          { name: "Dalhousie", coords: [32.5387, 75.971], elevationM: 1970 },
          { name: "Bharmour", coords: [32.44, 76.53], elevationM: 2100 },
        ],
      },
      {
        id: "hp-lahaul-spiti",
        name: "Lahaul and Spiti",
        coords: [32.57, 77.03],
        localities: [
          { name: "Keylong", coords: [32.57, 77.03], elevationM: 3080 },
          { name: "Kaza", coords: [32.22, 78.07], elevationM: 3650 },
        ],
      },
    ],
  },
  {
    id: "uk",
    slug: "uttarakhand",
    name: "Uttarakhand",
    nameHi: "उत्तराखंड",
    centroid: [30.0668, 79.0193],
    bbox: { minLat: 28.7, maxLat: 31.46, minLon: 77.57, maxLon: 81.04 },
    defaultZoom: 8,
    districts: [
      {
        id: "uk-dehradun",
        name: "Dehradun",
        coords: [30.3165, 78.0322],
        localities: [
          { name: "Mussoorie", coords: [30.4598, 78.0644], elevationM: 2005 },
          { name: "Rishikesh", coords: [30.0869, 78.2676], elevationM: 372 },
          { name: "Sahastradhara Corridor", coords: [30.385, 78.131], elevationM: 800 },
        ],
      },
      {
        id: "uk-chamoli",
        name: "Chamoli",
        coords: [30.42, 79.33],
        localities: [
          { name: "Joshimath", coords: [30.556, 79.566], elevationM: 1890 },
          { name: "Badrinath Highway", coords: [30.74, 79.49], elevationM: 3100 },
          { name: "Gopeshwar", coords: [30.41, 79.33], elevationM: 1550 },
        ],
      },
      {
        id: "uk-rudraprayag",
        name: "Rudraprayag",
        coords: [30.28, 78.98],
        localities: [
          { name: "Kedarnath Route (Gaurikund)", coords: [30.65, 79.02], elevationM: 1980 },
          { name: "Guptkashi", coords: [30.52, 79.08], elevationM: 1319 },
          { name: "Agastyamuni", coords: [30.39, 78.98], elevationM: 800 },
        ],
      },
      {
        id: "uk-uttarkashi",
        name: "Uttarkashi",
        coords: [30.73, 78.44],
        localities: [
          { name: "Gangotri Highway Corridor", coords: [30.99, 78.93], elevationM: 3100 },
          { name: "Barkot", coords: [30.81, 78.21], elevationM: 1220 },
          { name: "Dharasu Bend", coords: [30.63, 78.31], elevationM: 950 },
        ],
      },
      {
        id: "uk-tehri",
        name: "Tehri Garhwal",
        coords: [30.38, 78.48],
        localities: [
          { name: "New Tehri", coords: [30.38, 78.48], elevationM: 1750 },
          { name: "Devprayag Confluence", coords: [30.14, 78.60], elevationM: 472 },
        ],
      },
      {
        id: "uk-pithoragarh",
        name: "Pithoragarh",
        coords: [29.58, 80.22],
        localities: [
          { name: "Dharchula", coords: [29.85, 80.54], elevationM: 915 },
          { name: "Munsyari", coords: [30.07, 80.24], elevationM: 2200 },
        ],
      },
      {
        id: "uk-nainital",
        name: "Nainital",
        coords: [29.39, 79.45],
        localities: [
          { name: "Mallital / Tallital", coords: [29.39, 79.45], elevationM: 2084 },
          { name: "Bhowali", coords: [29.38, 79.52], elevationM: 1706 },
        ],
      },
    ],
  },
  {
    id: "sk",
    slug: "sikkim",
    name: "Sikkim",
    nameHi: "सिक्किम",
    centroid: [27.533, 88.5122],
    bbox: { minLat: 27.05, maxLat: 28.13, minLon: 88.0, maxLon: 88.92 },
    defaultZoom: 9,
    districts: [
      {
        id: "sk-gangtok",
        name: "Gangtok",
        coords: [27.3389, 88.6065],
        localities: [
          { name: "Gangtok MG Marg", coords: [27.331, 88.613], elevationM: 1650 },
          { name: "Ranipool", coords: [27.284, 88.591], elevationM: 910 },
        ],
      },
      {
        id: "sk-mangan",
        name: "Mangan",
        coords: [27.51, 88.53],
        localities: [
          { name: "Chungthang", coords: [27.60, 88.64], elevationM: 1790 },
          { name: "Lachung", coords: [27.69, 88.74], elevationM: 2700 },
          { name: "Lachen", coords: [27.72, 88.55], elevationM: 2750 },
        ],
      },
      {
        id: "sk-namchi",
        name: "Namchi",
        coords: [27.17, 88.35],
        localities: [
          { name: "Namchi Bazaar", coords: [27.17, 88.35], elevationM: 1315 },
          { name: "Jorethang", coords: [27.11, 88.31], elevationM: 300 },
        ],
      },
      {
        id: "sk-gyalshing",
        name: "Gyalshing",
        coords: [27.28, 88.24],
        localities: [
          { name: "Pelling", coords: [27.30, 88.23], elevationM: 2150 },
          { name: "Geyzing", coords: [27.28, 88.24], elevationM: 1900 },
        ],
      },
    ],
  },
  {
    id: "ar",
    slug: "arunachal-pradesh",
    name: "Arunachal Pradesh",
    nameHi: "अरुणाचल प्रदेश",
    centroid: [28.218, 94.7278],
    bbox: { minLat: 26.65, maxLat: 29.5, minLon: 91.5, maxLon: 97.4 },
    defaultZoom: 7,
    districts: [
      {
        id: "ar-itanagar",
        name: "Papum Pare",
        coords: [27.0844, 93.6053],
        localities: [
          { name: "Itanagar", coords: [27.0844, 93.6053], elevationM: 320 },
          { name: "Naharlagun", coords: [27.106, 93.693], elevationM: 200 },
        ],
      },
      {
        id: "ar-tawang",
        name: "Tawang",
        coords: [27.58, 91.87],
        localities: [
          { name: "Tawang Town", coords: [27.58, 91.87], elevationM: 3048 },
          { name: "Sela Pass Corridor", coords: [27.50, 92.10], elevationM: 4170 },
          { name: "Jang", coords: [27.58, 91.98], elevationM: 2100 },
        ],
      },
      {
        id: "ar-west-kameng",
        name: "West Kameng",
        coords: [27.26, 92.42],
        localities: [
          { name: "Bomdila", coords: [27.26, 92.42], elevationM: 2217 },
          { name: "Dirang", coords: [27.35, 92.24], elevationM: 1560 },
          { name: "Bhalukpong", coords: [27.01, 92.64], elevationM: 213 },
        ],
      },
      {
        id: "ar-east-siang",
        name: "East Siang",
        coords: [28.07, 95.33],
        localities: [
          { name: "Pasighat", coords: [28.07, 95.33], elevationM: 153 },
          { name: "Ruksin", coords: [27.84, 95.22], elevationM: 130 },
        ],
      },
      {
        id: "ar-dibang",
        name: "Dibang Valley",
        coords: [28.82, 95.88],
        localities: [
          { name: "Anini", coords: [28.82, 95.88], elevationM: 1968 },
          { name: "Roing Highway", coords: [28.14, 95.84], elevationM: 390 },
        ],
      },
    ],
  },
  {
    id: "as",
    slug: "assam",
    name: "Assam",
    nameHi: "असम",
    centroid: [26.2006, 92.9376],
    bbox: { minLat: 24.1, maxLat: 28.0, minLon: 89.7, maxLon: 96.0 },
    defaultZoom: 7,
    districts: [
      {
        id: "as-kamrup-m",
        name: "Kamrup Metropolitan",
        coords: [26.1445, 91.7362],
        localities: [
          { name: "Guwahati City", coords: [26.1445, 91.7362], elevationM: 55 },
          { name: "Dispur Capital Complex", coords: [26.141, 91.789], elevationM: 55 },
          { name: "Kamakhya Foothills", coords: [26.166, 91.705], elevationM: 150 },
        ],
      },
      {
        id: "as-dima-hasao",
        name: "Dima Hasao (North Cachar Hills)",
        coords: [25.18, 93.02],
        localities: [
          { name: "Haflong Hill Station", coords: [25.18, 93.02], elevationM: 680 },
          { name: "Jatinga Corridor", coords: [25.12, 93.04], elevationM: 650 },
          { name: "Mahur Railway Cut", coords: [25.17, 93.11], elevationM: 590 },
        ],
      },
      {
        id: "as-karbi-anglong",
        name: "Karbi Anglong",
        coords: [26.00, 93.43],
        localities: [
          { name: "Diphu", coords: [25.84, 93.43], elevationM: 186 },
          { name: "Bokajan", coords: [26.01, 93.78], elevationM: 138 },
        ],
      },
      {
        id: "as-cachar",
        name: "Cachar",
        coords: [24.83, 92.78],
        localities: [
          { name: "Silchar", coords: [24.83, 92.78], elevationM: 25 },
          { name: "Lakhipur", coords: [24.79, 93.01], elevationM: 30 },
        ],
      },
      {
        id: "as-dibrugarh",
        name: "Dibrugarh",
        coords: [27.47, 94.91],
        localities: [
          { name: "Dibrugarh Town", coords: [27.47, 94.91], elevationM: 108 },
          { name: "Naharkatia", coords: [27.28, 95.25], elevationM: 121 },
        ],
      },
    ],
  },
  {
    id: "ml",
    slug: "meghalaya",
    name: "Meghalaya",
    nameHi: "मेघालय",
    centroid: [25.467, 91.3662],
    bbox: { minLat: 25.0, maxLat: 26.1, minLon: 89.8, maxLon: 92.8 },
    defaultZoom: 9,
    districts: [
      {
        id: "ml-east-khasi",
        name: "East Khasi Hills",
        coords: [25.5788, 91.8933],
        localities: [
          { name: "Shillong", coords: [25.5788, 91.8933], elevationM: 1525 },
          { name: "Cherrapunji (Sohra)", coords: [25.2986, 91.7324], elevationM: 1430 },
          { name: "Mawphlang Slope Node", coords: [25.45, 91.76], elevationM: 1820 },
          { name: "Pynursla Ridge", coords: [25.31, 91.90], elevationM: 1500 },
        ],
      },
      {
        id: "ml-ri-bhoi",
        name: "Ri-Bhoi",
        coords: [25.90, 91.88],
        localities: [
          { name: "Nongpoh (NH-6 Highway)", coords: [25.90, 91.88], elevationM: 485 },
          { name: "Umiam Lake Corridor", coords: [25.66, 91.89], elevationM: 1000 },
        ],
      },
      {
        id: "ml-west-khasi",
        name: "West Khasi Hills",
        coords: [25.52, 91.26],
        localities: [
          { name: "Nongstoin", coords: [25.52, 91.26], elevationM: 1409 },
          { name: "Mairang", coords: [25.56, 91.64], elevationM: 1564 },
        ],
      },
      {
        id: "ml-west-garo",
        name: "West Garo Hills",
        coords: [25.52, 90.22],
        localities: [
          { name: "Tura Peak", coords: [25.52, 90.22], elevationM: 872 },
          { name: "Tikrikilla", coords: [25.93, 90.15], elevationM: 80 },
        ],
      },
      {
        id: "ml-east-jaintia",
        name: "East Jaintia Hills",
        coords: [25.32, 92.42],
        localities: [
          { name: "Khliehriat", coords: [25.35, 92.36], elevationM: 1190 },
          { name: "Sonapur Tunnel Corridor", coords: [25.10, 92.36], elevationM: 350 },
        ],
      },
    ],
  },
  {
    id: "nl",
    slug: "nagaland",
    name: "Nagaland",
    nameHi: "नागालैंड",
    centroid: [26.1584, 94.5624],
    bbox: { minLat: 25.2, maxLat: 27.05, minLon: 93.3, maxLon: 95.25 },
    defaultZoom: 8,
    districts: [
      {
        id: "nl-kohima",
        name: "Kohima",
        coords: [25.6751, 94.1086],
        localities: [
          { name: "Kohima Town", coords: [25.6751, 94.1086], elevationM: 1444 },
          { name: "Jakhama", coords: [25.58, 94.14], elevationM: 1600 },
          { name: "Dzükou Valley Gateway", coords: [25.55, 94.07], elevationM: 2438 },
        ],
      },
      {
        id: "nl-dimapur",
        name: "Dimapur",
        coords: [25.91, 93.73],
        localities: [
          { name: "Dimapur City", coords: [25.91, 93.73], elevationM: 145 },
          { name: "Chumoukedima", coords: [25.79, 93.77], elevationM: 210 },
        ],
      },
      {
        id: "nl-mokokchung",
        name: "Mokokchung",
        coords: [26.33, 94.53],
        localities: [
          { name: "Mokokchung Town", coords: [26.33, 94.53], elevationM: 1325 },
          { name: "Changtongya", coords: [26.54, 94.69], elevationM: 800 },
        ],
      },
      {
        id: "nl-phek",
        name: "Phek",
        coords: [25.68, 94.50],
        localities: [
          { name: "Phek Town", coords: [25.68, 94.50], elevationM: 1040 },
          { name: "Pfütsero", coords: [25.67, 94.32], elevationM: 2133 },
        ],
      },
    ],
  },
  {
    id: "mn",
    slug: "manipur",
    name: "Manipur",
    nameHi: "मणिपुर",
    centroid: [24.6637, 93.9063],
    bbox: { minLat: 23.8, maxLat: 25.7, minLon: 93.0, maxLon: 94.8 },
    defaultZoom: 8,
    districts: [
      {
        id: "mn-imphal-w",
        name: "Imphal West",
        coords: [24.817, 93.9368],
        localities: [
          { name: "Imphal City", coords: [24.817, 93.9368], elevationM: 786 },
          { name: "Lamphelpat", coords: [24.82, 93.91], elevationM: 785 },
        ],
      },
      {
        id: "mn-churachandpur",
        name: "Churachandpur",
        coords: [24.33, 93.68],
        localities: [
          { name: "Churachandpur Town", coords: [24.33, 93.68], elevationM: 922 },
          { name: "Singngat", coords: [24.16, 93.59], elevationM: 1050 },
        ],
      },
      {
        id: "mn-noney",
        name: "Noney (Tupul Corridor)",
        coords: [24.78, 93.60],
        localities: [
          { name: "Tupul Railway Yard Node", coords: [24.73, 93.68], elevationM: 520 },
          { name: "Noney Town", coords: [24.78, 93.60], elevationM: 610 },
        ],
      },
      {
        id: "mn-senapati",
        name: "Senapati",
        coords: [25.26, 94.01],
        localities: [
          { name: "Senapati Town (NH-2)", coords: [25.26, 94.01], elevationM: 1040 },
          { name: "Mao Gate", coords: [25.50, 94.13], elevationM: 1800 },
        ],
      },
      {
        id: "mn-tamenglong",
        name: "Tamenglong",
        coords: [24.98, 93.49],
        localities: [
          { name: "Tamenglong Town", coords: [24.98, 93.49], elevationM: 1260 },
          { name: "Khongsang", coords: [24.85, 93.54], elevationM: 680 },
        ],
      },
    ],
  },
  {
    id: "mz",
    slug: "mizoram",
    name: "Mizoram",
    nameHi: "मिजोरम",
    centroid: [23.1645, 92.9376],
    bbox: { minLat: 21.9, maxLat: 24.55, minLon: 92.2, maxLon: 93.45 },
    defaultZoom: 8,
    districts: [
      {
        id: "mz-aizawl",
        name: "Aizawl",
        coords: [23.7271, 92.7176],
        localities: [
          { name: "Aizawl City Ridge", coords: [23.7271, 92.7176], elevationM: 1132 },
          { name: "Durtlang Hills", coords: [23.77, 92.73], elevationM: 1280 },
          { name: "Sairang Valley", coords: [23.80, 92.66], elevationM: 250 },
        ],
      },
      {
        id: "mz-lunglei",
        name: "Lunglei",
        coords: [22.88, 92.73],
        localities: [
          { name: "Lunglei Town", coords: [22.88, 92.73], elevationM: 722 },
          { name: "Hnahthial Road", coords: [22.96, 92.93], elevationM: 650 },
        ],
      },
      {
        id: "mz-champhai",
        name: "Champhai",
        coords: [23.47, 93.33],
        localities: [
          { name: "Champhai Valley", coords: [23.47, 93.33], elevationM: 1678 },
          { name: "Zokhawthar Border", coords: [23.36, 93.40], elevationM: 1050 },
        ],
      },
      {
        id: "mz-kolasib",
        name: "Kolasib",
        coords: [24.22, 92.68],
        localities: [
          { name: "Kolasib Town (NH-54)", coords: [24.22, 92.68], elevationM: 610 },
          { name: "Vairengte Gateway", coords: [24.50, 92.76], elevationM: 180 },
        ],
      },
    ],
  },
  {
    id: "tr",
    slug: "tripura",
    name: "Tripura",
    nameHi: "त्रिपुरा",
    centroid: [23.9408, 91.9882],
    bbox: { minLat: 22.9, maxLat: 24.55, minLon: 91.1, maxLon: 92.35 },
    defaultZoom: 9,
    districts: [
      {
        id: "tr-west",
        name: "West Tripura",
        coords: [23.8315, 91.2868],
        localities: [
          { name: "Agartala", coords: [23.8315, 91.2868], elevationM: 15 },
          { name: "Mohanpur", coords: [23.97, 91.36], elevationM: 25 },
        ],
      },
      {
        id: "tr-dhalai",
        name: "Dhalai",
        coords: [23.84, 91.86],
        localities: [
          { name: "Ambassa", coords: [23.92, 91.85], elevationM: 52 },
          { name: "Longtharai Ridge Corridor", coords: [23.84, 91.90], elevationM: 320 },
        ],
      },
      {
        id: "tr-north",
        name: "North Tripura",
        coords: [24.18, 92.17],
        localities: [
          { name: "Dharmanagar", coords: [24.38, 92.16], elevationM: 21 },
          { name: "Jampui Hills", coords: [23.81, 92.28], elevationM: 930 },
        ],
      },
      {
        id: "tr-south",
        name: "South Tripura",
        coords: [23.23, 91.46],
        localities: [
          { name: "Belonia", coords: [23.25, 91.45], elevationM: 23 },
          { name: "Sabroom", coords: [23.00, 91.70], elevationM: 30 },
        ],
      },
    ],
  },
];

export function getTargetStateBySlug(slug: string): TargetState | undefined {
  const norm = slug.toLowerCase().replace(/\s+/g, "-");
  return TARGET_STATES.find(
    (s) => s.slug === norm || s.id === norm || s.name.toLowerCase() === slug.toLowerCase()
  );
}

export function getAllDistricts(): Array<TargetDistrict & { stateName: string; stateId: string }> {
  const list: Array<TargetDistrict & { stateName: string; stateId: string }> = [];
  TARGET_STATES.forEach((st) => {
    st.districts.forEach((dist) => {
      list.push({ ...dist, stateName: st.name, stateId: st.id });
    });
  });
  return list;
}
