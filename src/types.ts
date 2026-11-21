export type SpotStatus = 'needs_cleanup' | 'scheduled' | 'cleaned';
export type SpotPriority = 'high' | 'medium' | 'low';
export type RouteProfile = 'foot' | 'bike' | 'driving';

export interface CleanupSpot {
  id: string;
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  priority: SpotPriority;
  status: SpotStatus;
  wasteTypes: string[];
  photoUrl: string;
  afterPhotoUrl?: string;
  reportedBy: string;
  createdAt: string;
  cleanedAt?: string;
  bagsCollected?: number;
  upvotes: number;
}

export interface EventVolunteer {
  id: string;
  name: string;
  joinedAt: string;
}

export interface EventComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CleanupEvent {
  id: string;
  spotId?: string;
  title: string;
  description: string;
  locationName: string;
  meetingPoint: string;
  lat: number;
  lng: number;
  date: string;
  startTime: string;
  durationHours: number;
  organizer: string;
  suppliesProvided: string[];
  maxVolunteers: number;
  volunteers: EventVolunteer[];
  comments: EventComment[];
  bannerUrl: string;
  createdAt: string;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  steps: RouteStep[];
  profile: RouteProfile;
  isFallback?: boolean;
}

export interface GeocodeResult {
  displayName: string;
  neighborhood: string;
  lat: number;
  lng: number;
}
