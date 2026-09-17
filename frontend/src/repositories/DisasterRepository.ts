import { SafetyScore, DisasterAppMode, TimelineEvent, CommunityReport } from '@/shared/types/disaster';

export class DisasterRepository {
  static getSafetyScore(mode: DisasterAppMode): SafetyScore {
    if (mode === 'normal') {
      return {
        level: 'safe',
        badge: 'Safe',
        badgeHi: 'सुरक्षित',
        headline: 'Today looks good. Clear conditions across your sector.',
        headlineHi: 'स्थिति सामान्य और सुरक्षित है। आज का मौसम शांत रहेगा।',
        subhead: 'No active slope or flood threats detected in 15 km radius.',
        subheadHi: 'निकटवर्ती 15 किमी क्षेत्र में कोई भूस्खलन का खतरा नहीं है।',
        updatedAgo: '12s ago',
        factors: [
          { title: 'Precipitation', titleHi: 'वर्षा स्तर', value: '0.4 mm (Normal)', severity: 'low' },
          { title: 'Slope Stability', titleHi: 'ढलान स्थिरता', value: '98% Solid', severity: 'low' },
          { title: 'Historical Risk', titleHi: 'ऐतिहासिक जोखिम', value: 'Low Activity', severity: 'low' },
        ],
      };
    }

    if (mode === 'warning') {
      return {
        level: 'alert',
        badge: 'Stay Alert',
        badgeHi: 'सतर्क रहें',
        headline: 'Heavy rainfall may increase landslide probability later today.',
        headlineHi: 'भारी वर्षा के कारण आज शाम ढलानों पर भूस्खलन का मध्यम जोखिम है।',
        subhead: 'Avoid mountain corridors (NH-766) after 5 PM. Keep helpline accessible.',
        subheadHi: 'शाम 5 बजे के बाद पहाड़ी मार्गों से बचें। 112 हेल्पलाइन तैयार रखें।',
        updatedAgo: '18s ago',
        factors: [
          { title: '24h Rainfall', titleHi: '24 घंटे की वर्षा', value: '84.5 mm (Heavy)', severity: 'medium' },
          { title: 'Soil Moisture', titleHi: 'मिट्टी की नमी', value: '78% Saturated', severity: 'medium' },
          { title: 'Steep Terrain', titleHi: 'ढलान ढाल', value: '32° Gradient', severity: 'high' },
        ],
      };
    }

    // Emergency Disaster Mode
    return {
      level: 'action',
      badge: 'Take Action',
      badgeHi: 'कार्रवाई करें',
      headline: 'Severe flash flood & landslide danger detected in your sector.',
      headlineHi: 'अत्यधिक खतरे की चेतावनी: तुरंत सुरक्षित राहत शिविर में जाएं।',
      subhead: 'Immediate evacuation advised. Move to nearest verified shelter now.',
      subheadHi: 'ढलान बस्तियों से तुरंत सुरक्षित शिविर में शरण लें।',
      updatedAgo: 'Just now',
      factors: [
        { title: 'Rainfall Surge', titleHi: 'वर्षा विस्फोट', value: '142 mm / 6h', severity: 'high' },
        { title: 'Slope Rupture', titleHi: 'भूस्खलन चेतावनी', value: 'Critical Alert', severity: 'high' },
        { title: 'Debris Flow', titleHi: 'मलबा बहाव', value: 'NH-766 Blocked', severity: 'high' },
      ],
    };
  }

  static getTimelineEvents(mode: DisasterAppMode): TimelineEvent[] {
    if (mode === 'normal') {
      return [
        {
          id: 'ev-0',
          time: '08:00 AM',
          title: 'Daily Safety Clearance',
          titleHi: 'दैनिक सुरक्षा बुलेटिन',
          description: 'All arterial roads in Wayanad open and operational.',
          descriptionHi: 'वायनाड के सभी मुख्य मार्ग सुचारू रूप से चालू हैं।',
          severity: 'green',
          source: 'District EOC',
          timestamp: Date.now() - 14400000,
        },
      ];
    }

    return [
      {
        id: 'ev-1',
        time: '12:30 PM',
        title: 'Chooralmala Relief Shelter Operational',
        titleHi: 'चूरलमाला राहत शिविर खुला',
        description: 'Designated 24/7 safe relief center with medical supplies.',
        descriptionHi: 'चिकित्सा सुविधाओं और भोजन के साथ सुरक्षित आश्रय स्थल तैयार है।',
        severity: 'blue',
        source: 'NDMA Field Command',
        timestamp: Date.now() - 1800000,
      },
      {
        id: 'ev-2',
        time: '11:15 AM',
        title: 'Road Closed: NH-766 Ghat Sector',
        titleHi: 'मार्ग बंद: NH-766 घाट सेक्शन',
        description: 'Minor debris cleared by police. Travel diverted via Gudalur.',
        descriptionHi: 'पुलिस द्वारा मलबा हटाने का कार्य जारी। गुडलूर मार्ग का उपयोग करें।',
        severity: 'orange',
        source: 'Traffic Police Wayanad',
        timestamp: Date.now() - 5400000,
      },
      {
        id: 'ev-3',
        time: '10:24 AM',
        title: 'Heavy Rainfall Advisory Issued',
        titleHi: 'भारी वर्षा की चेतावनी जारी',
        description: 'Forecast exceeds 80mm precipitation over Western Ghats.',
        descriptionHi: 'पश्चिमी घाट क्षेत्र में 80 मिमी से अधिक वर्षा का पूर्वानुमान।',
        severity: mode === 'disaster' ? 'red' : 'orange',
        source: 'IMD Trivandrum',
        timestamp: Date.now() - 9000000,
      },
    ];
  }

  static getCommunityReports(): CommunityReport[] {
    return [
      {
        id: 'rep-101',
        title: 'Road Block: NH-766 Debris',
        titleHi: 'सड़क अवरोध: NH-766 पर मलबा',
        category: 'roadblock',
        latitude: 11.6912,
        longitude: 76.1415,
        locationName: 'Lakkidi Viewpoint, Wayanad',
        verifiedCount: 14,
        policeConfirmed: true,
        timeAgo: '28 min ago',
        status: 'verified',
      },
      {
        id: 'rep-102',
        title: 'Waterlogging at Meppadi Bridge',
        titleHi: 'मेप्पाडी पुल पर जलभराव',
        category: 'flood',
        latitude: 11.5512,
        longitude: 76.1285,
        locationName: 'Meppadi Town Junction',
        verifiedCount: 8,
        policeConfirmed: true,
        timeAgo: '42 min ago',
        status: 'verified',
      },
      {
        id: 'rep-103',
        title: 'Slope Movement Observed',
        titleHi: 'ढलान पर मिट्टी खिसकने के संकेत',
        category: 'landslide',
        latitude: 11.612,
        longitude: 76.175,
        locationName: 'Mundakkai Slope Sector',
        verifiedCount: 3,
        policeConfirmed: false,
        timeAgo: '12 min ago',
        status: 'pending',
      },
    ];
  }
}
