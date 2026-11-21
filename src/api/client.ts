import type {
  CleanupEvent,
  CleanupSpot,
  GeocodeResult,
  RouteProfile,
  RouteResult,
  SpotPriority,
  SpotStatus,
} from '../types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // Keep default message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  getSpots: () => requestJson<CleanupSpot[]>('/api/spots'),

  createSpot: (payload: {
    title: string;
    description: string;
    address: string;
    neighborhood: string;
    lat: number;
    lng: number;
    priority: SpotPriority;
    wasteTypes: string[];
    photoUrl: string;
    reportedBy: string;
  }) =>
    requestJson<CleanupSpot>('/api/spots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  upvoteSpot: (id: string) =>
    requestJson<CleanupSpot>(`/api/spots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'upvote' }),
    }),

  updateSpotStatus: (
    id: string,
    payload: { status: SpotStatus; afterPhotoUrl?: string; bagsCollected?: number }
  ) =>
    requestJson<CleanupSpot>(`/api/spots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getEvents: () => requestJson<CleanupEvent[]>('/api/events'),

  createEvent: (payload: {
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
    bannerUrl?: string;
  }) =>
    requestJson<CleanupEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  rsvpEvent: (id: string, name: string, action: 'join' | 'leave') =>
    requestJson<CleanupEvent>(`/api/events/${encodeURIComponent(id)}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ name, action }),
    }),

  addEventComment: (id: string, author: string, text: string) =>
    requestJson<CleanupEvent>(`/api/events/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ author, text }),
    }),

  searchAddress: (q: string) =>
    requestJson<GeocodeResult[]>(`/api/geocode/search?q=${encodeURIComponent(q)}`),

  reverseGeocode: (lat: number, lng: number) =>
    requestJson<GeocodeResult>(`/api/geocode/reverse?lat=${lat}&lng=${lng}`),

  computeRoute: (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    profile: RouteProfile
  ) =>
    requestJson<RouteResult>(
      `/api/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}&profile=${profile}`
    ),
};
