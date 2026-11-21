import type {
  AuthSessionResponse,
  AuthUser,
  CleanupEvent,
  CleanupSpot,
  EventVolunteer,
  GeocodeResult,
  ReporterAuthResponse,
  RouteProfile,
  RouteResult,
  SpotPriority,
  SpotStatus,
} from '../types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
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

function authHeader(token?: string | null): Record<string, string> | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const api = {
  auth: {
    register: (payload: { email: string; password: string; displayName: string }) =>
      requestJson<AuthSessionResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      requestJson<AuthSessionResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    me: (token: string) =>
      requestJson<{ user: AuthUser }>('/api/auth/me', {
        headers: authHeader(token),
      }),

    logout: (token: string) =>
      requestJson<{ ok: boolean }>('/api/auth/logout', {
        method: 'POST',
        headers: authHeader(token),
      }),
  },

  getSpots: (authToken?: string | null) =>
    requestJson<CleanupSpot[]>('/api/spots', {
      headers: authHeader(authToken),
    }),

  createSpot: (
    payload: {
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
      reporterPasscode?: string;
    },
    authToken: string
  ) =>
    requestJson<CleanupSpot>('/api/spots', {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify(payload),
    }),

  upvoteSpot: (id: string, authToken: string) =>
    requestJson<CleanupSpot>(`/api/spots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeader(authToken),
      body: JSON.stringify({ action: 'upvote' }),
    }),

  updateSpotStatus: (
    id: string,
    payload: { status: SpotStatus; afterPhotoUrl?: string; bagsCollected?: number },
    authToken: string
  ) =>
    requestJson<CleanupSpot>(`/api/spots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeader(authToken),
      body: JSON.stringify(payload),
    }),

  deleteSpot: (id: string, authToken: string) =>
    requestJson<{ ok: boolean; id: string }>(`/api/spots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeader(authToken),
    }),

  getEvents: (authToken?: string | null) =>
    requestJson<CleanupEvent[]>('/api/events', {
      headers: authHeader(authToken),
    }),

  createEvent: (
    payload: {
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
      reporterPasscode?: string;
    },
    authToken: string
  ) =>
    requestJson<CleanupEvent>('/api/events', {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify(payload),
    }),

  deleteEvent: (id: string, authToken: string) =>
    requestJson<{ ok: boolean; id: string }>(`/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeader(authToken),
    }),

  rsvpEvent: (id: string, action: 'join' | 'leave', authToken: string) =>
    requestJson<CleanupEvent>(`/api/events/${encodeURIComponent(id)}/rsvp`, {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({ action }),
    }),

  addEventComment: (id: string, text: string, authToken: string) =>
    requestJson<CleanupEvent>(`/api/events/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      headers: authHeader(authToken),
      body: JSON.stringify({ text }),
    }),

  authenticateReporter: (
    eventId: string,
    payload: { mode: 'claim' | 'unlock'; reporterName?: string; passcode: string }
  ) =>
    requestJson<ReporterAuthResponse>(
      `/api/events/${encodeURIComponent(eventId)}/reporter-auth`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getEventVolunteers: (eventId: string, token: string) =>
    requestJson<{ volunteers: EventVolunteer[] }>(
      `/api/events/${encodeURIComponent(eventId)}/volunteers`,
      {
        headers: authHeader(token),
      }
    ),

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
