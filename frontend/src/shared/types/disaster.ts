export type SafetyLevel = 'safe' | 'alert' | 'action';

export interface SafetyScore {
  level: SafetyLevel;
  badge: 'Safe' | 'Stay Alert' | 'Take Action';
  badgeHi: 'सुरक्षित' | 'सतर्क रहें' | 'कार्रवाई करें';
  headline: string;
  headlineHi: string;
  subhead: string;
  subheadHi: string;
  updatedAgo: string;
  factors: {
    title: string;
    titleHi: string;
    value: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

export type DisasterAppMode = 'normal' | 'warning' | 'disaster';

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  severity: 'red' | 'orange' | 'blue' | 'green';
  source: string;
  timestamp: number;
}

export interface CommunityReport {
  id: string;
  title: string;
  titleHi: string;
  category: 'landslide' | 'flood' | 'roadblock' | 'shelter' | 'electricity';
  latitude: number;
  longitude: number;
  locationName: string;
  verifiedCount: number;
  policeConfirmed: boolean;
  timeAgo: string;
  status: 'verified' | 'pending';
  imageUrl?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  nameHi: string;
  phone: string;
  role: string;
  icon: string;
  priority: 'p1' | 'p2' | 'p3';
}
