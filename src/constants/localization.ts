export type Language = "en" | "hi";

export interface LocaleContent {
  brand: string;
  subBrand: string;
  officialGoI: string;
  nationalHelpline: string;
  ndrfHelpline: string;
  youAreHere: string;
  gpsUpdated: string;
  changeLocation: string;
  useGps: string;
  safeZoneTitle: string;
  safeZoneDesc: string;
  stayAlertTitle: string;
  stayAlertDesc: string;
  highRiskTitle: string;
  highRiskDesc: string;
  takeActionTitle: string;
  takeActionDesc: string;
  seeWhatToDo: string;
  whyThisWarning: string;
  rainfall: string;
  slope: string;
  soilMoisture: string;
  history: string;
  weatherTitle: string;
  feelsLike: string;
  rainExpected: string;
  humidity: string;
  wind: string;
  visibility: string;
  quickActions: {
    weather: string;
    shelters: string;
    report: string;
    sos: string;
    safeRoutes: string;
    aiAdvisor: string;
  };
  mapTitle: string;
  searchMapPlaceholder: string;
  activeAlerts: string;
  noActiveAlerts: string;
  issuedBy: string;
  seeAffectedArea: string;
  safePlacesTitle: string;
  safePlacesSubtitle: string;
  navigate: string;
  open: string;
  bedsAvailable: string;
  aiAdvisorTitle: string;
  aiAdvisorSubtitle: string;
  planSafeRoute: string;
  askAi: string;
  communityReportsTitle: string;
  verifiedBy: string;
  reportHazardBtn: string;
  navHome: string;
  navMap: string;
  navAlerts: string;
  navReport: string;
  navProfile: string;
  sosCall: string;
  disasterModeTitle: string;
  evacuateNow: string;
  nearestShelter: string;
  shareLocation: string;
  simulationBanner: string;
  returnToLive: string;
}

export const LOCALIZATION: Record<Language, LocaleContent> = {
  en: {
    brand: "Apda Mitra",
    subBrand: "Early Warning & Disaster Safety Platform",
    officialGoI: "Government of India • National Disaster Management Authority (NDMA)",
    nationalHelpline: "National Emergency: 112",
    ndrfHelpline: "NDRF Disaster Cell: 1078",
    youAreHere: "You're here",
    gpsUpdated: "GPS updated just now",
    changeLocation: "Change",
    useGps: "Use current GPS",
    safeZoneTitle: "All Clear — Safe Zone",
    safeZoneDesc: "No active natural disaster warnings or evacuation advisories in your immediate sector.",
    stayAlertTitle: "Stay Alert",
    stayAlertDesc: "Heavy localized rainfall may elevate landslide vulnerability across hill slopes this evening.",
    highRiskTitle: "High Risk Detected",
    highRiskDesc: "Soil saturation thresholds breached along steep road corridors. Non-essential travel discouraged.",
    takeActionTitle: "TAKE ACTION",
    takeActionDesc: "Immediate slope failure risk. Follow civil defense instructions and relocate to designated relief shelters.",
    seeWhatToDo: "See what to do",
    whyThisWarning: "Why this warning?",
    rainfall: "Rainfall",
    slope: "Slope Angle",
    soilMoisture: "Soil Moisture",
    history: "Historical Failures",
    weatherTitle: "Weather & Conditions",
    feelsLike: "Feels like",
    rainExpected: "Rain expected after 5 PM",
    humidity: "Humidity",
    wind: "Wind",
    visibility: "Visibility",
    quickActions: {
      weather: "Weather",
      shelters: "Shelters",
      report: "Report Hazard",
      sos: "SOS 112",
      safeRoutes: "Safe Routes",
      aiAdvisor: "Safety Advisor",
    },
    mapTitle: "Live Hazard & Safety Map",
    searchMapPlaceholder: "Search a village, district, road or place...",
    activeAlerts: "Official Bulletins & Warnings",
    noActiveAlerts: "Good news — no active disaster alerts in your area.",
    issuedBy: "Issued by",
    seeAffectedArea: "See affected area",
    safePlacesTitle: "Nearby Safe Places",
    safePlacesSubtitle: "Verified evacuation shelters, trauma hospitals & police staging posts",
    navigate: "Navigate",
    open: "Open",
    bedsAvailable: "beds available",
    aiAdvisorTitle: "AI Safety Advisor",
    aiAdvisorSubtitle: "Synthesizing IMD Doppler telemetry and Geological Survey terrain data",
    planSafeRoute: "Plan Safe Route",
    askAi: "Ask Safety Question",
    communityReportsTitle: "Community Incident Reports",
    verifiedBy: "Verified by district field team",
    reportHazardBtn: "Report Local Hazard",
    navHome: "Home",
    navMap: "Map",
    navAlerts: "Alerts",
    navReport: "Report",
    navProfile: "Profile",
    sosCall: "Emergency 112",
    disasterModeTitle: "EMERGENCY DISASTER MODE ACTIVE",
    evacuateNow: "Proceed Immediately to Safe Shelter",
    nearestShelter: "Nearest Verified Shelter",
    shareLocation: "Share GPS Location with Family",
    simulationBanner: "DEVELOPMENT SIMULATION MODE",
    returnToLive: "Switch to Live Data",
  },
  hi: {
    brand: "आपदा मित्र",
    subBrand: "पूर्व चेतावनी एवं आपदा सुरक्षा प्रणाली",
    officialGoI: "भारत सरकार • राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA)",
    nationalHelpline: "राष्ट्रीय आपातकालीन: 112",
    ndrfHelpline: "एनडीआरएफ हेल्पलाइन: 1078",
    youAreHere: "आप यहाँ हैं",
    gpsUpdated: "जीपीएस अभी अपडेट हुआ",
    changeLocation: "बदलें",
    useGps: "वर्तमान जीपीएस का उपयोग करें",
    safeZoneTitle: "सब सुरक्षित — कोई खतरा नहीं",
    safeZoneDesc: "आपके क्षेत्र में कोई सक्रिय आपदा चेतावनी या निकासी परामर्श नहीं है।",
    stayAlertTitle: "सतर्क रहें",
    stayAlertDesc: "भारी वर्षा के कारण आज शाम आपके क्षेत्र की पहाड़ी ढलानों पर भूस्खलन का जोखिम बढ़ सकता है।",
    highRiskTitle: "उच्च जोखिम की चेतावनी",
    highRiskDesc: "पहाड़ी मार्गों पर मिट्टी की नमी खतरनाक स्तर पर पहुँच गई है। गैर-जरूरी यात्रा से बचें।",
    takeActionTitle: "तुरंत कार्रवाई करें",
    takeActionDesc: "तत्काल ढलान टूटने का खतरा। नागरिक सुरक्षा निर्देशों का पालन करें और सुरक्षित राहत शिविर में जाएँ।",
    seeWhatToDo: "क्या करना चाहिए",
    whyThisWarning: "यह चेतावनी क्यों?",
    rainfall: "वर्षा",
    slope: "ढलान कोण",
    soilMoisture: "मिट्टी की नमी",
    history: "पूर्व घटनाएँ",
    weatherTitle: "मौसम एवं वायुमंडलीय स्थिति",
    feelsLike: "महसूस तापमान",
    rainExpected: "शाम 5 बजे के बाद बारिश की संभावना",
    humidity: "आर्द्रता",
    wind: "हवा",
    visibility: "दृश्यता",
    quickActions: {
      weather: "मौसम",
      shelters: "राहत शिविर",
      report: "आपदा रिपोर्ट",
      sos: "एसओएस 112",
      safeRoutes: "सुरक्षित मार्ग",
      aiAdvisor: "सुरक्षा सलाहकार",
    },
    mapTitle: "सक्रिय आपदा एवं सुरक्षा मानचित्र",
    searchMapPlaceholder: "गाँव, जिला, सड़क या स्थान खोजें...",
    activeAlerts: "आधिकारिक चेतावनी बुलेटिन",
    noActiveAlerts: "अच्छी खबर — आपके क्षेत्र में कोई सक्रिय आपदा चेतावनी नहीं है।",
    issuedBy: "जारीकर्ता",
    seeAffectedArea: "प्रभावित क्षेत्र देखें",
    safePlacesTitle: "निकटतम सुरक्षित स्थान",
    safePlacesSubtitle: "सत्यापित राहत केंद्र, अस्पताल एवं पुलिस चौकियाँ",
    navigate: "मार्ग देखें",
    open: "खुला है",
    bedsAvailable: "बिस्तर उपलब्ध",
    aiAdvisorTitle: "एआई सुरक्षा सलाहकार",
    aiAdvisorSubtitle: "मौसम विभाग रडार और भूवैज्ञानिक सर्वेक्षण आंकड़ों पर आधारित",
    planSafeRoute: "सुरक्षित मार्ग चुनें",
    askAi: "सुरक्षा प्रश्न पूछें",
    communityReportsTitle: "नागरिक आपदा रिपोर्ट",
    verifiedBy: "क्षेत्रीय टीम द्वारा सत्यापित",
    reportHazardBtn: "स्थानीय खतरे की रिपोर्ट करें",
    navHome: "होम",
    navMap: "मानचित्र",
    navAlerts: "अलर्ट",
    navReport: "रिपोर्ट",
    navProfile: "प्रोफ़ाइल",
    sosCall: "आपातकालीन 112",
    disasterModeTitle: "आपातकालीन आपदा मोड सक्रिय",
    evacuateNow: "तुरंत सुरक्षित शिविर की ओर प्रस्थान करें",
    nearestShelter: "निकटतम सत्यापित शिविर",
    shareLocation: "परिवार के साथ जीपीएस साझा करें",
    simulationBanner: "विकास सिमुलेशन मोड",
    returnToLive: "लाइव डेटा पर वापस जाएँ",
  },
};
