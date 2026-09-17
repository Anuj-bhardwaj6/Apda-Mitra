import { ShelterItem, JourneyAssessment } from '@/shared/types';

export class ShelterRepository {
  static getSafePlaces(lat?: number, lon?: number): ShelterItem[] {
    const baseLat = lat || 28.6139; // Default fallback to Delhi if no GPS
    const baseLon = lon || 77.2090;

    return [
      {
        id: 'sh-1',
        name: 'Designated Community Evacuation Center',
        nameHi: 'सामुदायिक आपातकालीन राहत शिविर',
        type: 'relief_camp',
        distanceKm: 1.8,
        etaMins: 4,
        capacity: 450,
        occupancy: 160,
        phone: '1077',
        isOpen24x7: true,
        latitude: baseLat + 0.012,
        longitude: baseLon + 0.015,
        address: 'Sector 4 Community Hall & Relief Base',
      },
      {
        id: 'sh-2',
        name: 'District Multi-Specialty General Hospital',
        nameHi: 'जिला सामान्य अस्पताल (ट्रॉमा सेंटर)',
        type: 'hospital',
        distanceKm: 2.6,
        etaMins: 7,
        capacity: 300,
        occupancy: 110,
        phone: '108',
        isOpen24x7: true,
        latitude: baseLat - 0.016,
        longitude: baseLon - 0.014,
        address: 'Main Arterial Road & Emergency Trauma Wing',
      },
      {
        id: 'sh-3',
        name: 'Police Station & Emergency Safe Point',
        nameHi: 'पुलिस नियंत्रण कक्ष एवं सुरक्षा बिंदु',
        type: 'police',
        distanceKm: 3.2,
        etaMins: 8,
        phone: '112',
        isOpen24x7: true,
        latitude: baseLat + 0.022,
        longitude: baseLon - 0.008,
        address: 'Civil Lines Emergency Desk',
      },
      {
        id: 'sh-4',
        name: 'Fire & Disaster Rescue Station',
        nameHi: 'अग्निशमन एवं आपदा बचाव स्टेशन',
        type: 'fire_station',
        distanceKm: 4.5,
        etaMins: 11,
        phone: '101',
        isOpen24x7: true,
        latitude: baseLat - 0.024,
        longitude: baseLon + 0.018,
        address: 'Central Emergency Response Post',
      },
    ];
  }
}

export class JourneyRepository {
  static assessTrip(origin: string, destination: string, departureTime: string): JourneyAssessment {
    return {
      origin: origin || 'Current Location',
      destination: destination || 'Safe Destination Hub',
      departureTime: departureTime || 'Now',
      riskLevel: 'alert',
      riskTitle: 'Moderate Rain & Slope Hazard on Mountain Corridor',
      riskTitleHi: 'पहाड़ी मार्ग पर मध्यम वर्षा एवं ढलान फिसलन का जोखिम',
      summary: 'Forecast indicates increased precipitation along mountain passes over the next 3 hours.',
      summaryHi: 'अगले 3 घंटों में पहाड़ी मार्ग पर तीव्र वर्षा का अनुमान है। सुरक्षित बाईपास का उपयोग करें।',
      recommendedRoute: 'Via Primary Valley Corridor (Safe Bypass)',
      estimatedDelayMins: 15,
      safetyImprovementPct: 68,
      waypoints: [
        { name: 'Departure Origin', hazardStatus: 'clear' },
        { name: 'Mountain Pass Corridor', hazardStatus: 'warning' },
        { name: 'Valley Safe Bypass', hazardStatus: 'clear' },
        { name: 'Destination Base', hazardStatus: 'clear' },
      ],
    };
  }
}
