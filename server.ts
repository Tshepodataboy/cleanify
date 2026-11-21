import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CleanupEvent,
  CleanupSpot,
  EventComment,
  EventVolunteer,
  GeocodeResult,
  RouteProfile,
  RouteResult,
  SpotPriority,
  SpotStatus,
} from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'community.json');
const STORAGE_BUCKET = 'cleanup-photos';

interface StoreState {
  spots: CleanupSpot[];
  events: CleanupEvent[];
}

interface SpotRow {
  id: string;
  title: string;
  description: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  priority: SpotPriority;
  status: SpotStatus;
  waste_types: string[] | null;
  photo_url: string;
  after_photo_url: string | null;
  reported_by: string;
  created_at: string;
  cleaned_at: string | null;
  bags_collected: number | null;
  upvotes: number;
}

interface EventRow {
  id: string;
  spot_id: string | null;
  title: string;
  description: string;
  location_name: string;
  meeting_point: string;
  lat: number;
  lng: number;
  date: string;
  start_time: string;
  duration_hours: number;
  organizer: string;
  supplies_provided: string[] | null;
  max_volunteers: number;
  volunteers: EventVolunteer[] | null;
  comments: EventComment[] | null;
  banner_url: string;
  created_at: string;
}

function spotToRow(spot: CleanupSpot): SpotRow {
  return {
    id: spot.id,
    title: spot.title,
    description: spot.description,
    address: spot.address,
    neighborhood: spot.neighborhood,
    lat: spot.lat,
    lng: spot.lng,
    priority: spot.priority,
    status: spot.status,
    waste_types: spot.wasteTypes,
    photo_url: spot.photoUrl,
    after_photo_url: spot.afterPhotoUrl ?? null,
    reported_by: spot.reportedBy,
    created_at: spot.createdAt,
    cleaned_at: spot.cleanedAt ?? null,
    bags_collected: typeof spot.bagsCollected === 'number' ? spot.bagsCollected : null,
    upvotes: spot.upvotes,
  };
}

function rowToSpot(row: SpotRow): CleanupSpot {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    address: row.address,
    neighborhood: row.neighborhood ?? 'Neighborhood',
    lat: Number(row.lat),
    lng: Number(row.lng),
    priority: row.priority,
    status: row.status,
    wasteTypes: Array.isArray(row.waste_types) ? row.waste_types : ['Plastics'],
    photoUrl: row.photo_url,
    afterPhotoUrl: row.after_photo_url ?? undefined,
    reportedBy: row.reported_by ?? 'Community Member',
    createdAt: row.created_at,
    cleanedAt: row.cleaned_at ?? undefined,
    bagsCollected: typeof row.bags_collected === 'number' ? row.bags_collected : undefined,
    upvotes: Number(row.upvotes) || 1,
  };
}

function eventToRow(event: CleanupEvent): EventRow {
  return {
    id: event.id,
    spot_id: event.spotId ?? null,
    title: event.title,
    description: event.description,
    location_name: event.locationName,
    meeting_point: event.meetingPoint,
    lat: event.lat,
    lng: event.lng,
    date: event.date,
    start_time: event.startTime,
    duration_hours: event.durationHours,
    organizer: event.organizer,
    supplies_provided: event.suppliesProvided,
    max_volunteers: event.maxVolunteers,
    volunteers: event.volunteers,
    comments: event.comments,
    banner_url: event.bannerUrl,
    created_at: event.createdAt,
  };
}

function rowToEvent(row: EventRow): CleanupEvent {
  return {
    id: row.id,
    spotId: row.spot_id ?? undefined,
    title: row.title,
    description: row.description ?? '',
    locationName: row.location_name,
    meetingPoint: row.meeting_point ?? '',
    lat: Number(row.lat),
    lng: Number(row.lng),
    date: row.date,
    startTime: row.start_time,
    durationHours: Number(row.duration_hours) || 2,
    organizer: row.organizer ?? 'Neighborhood Host',
    suppliesProvided: Array.isArray(row.supplies_provided) ? row.supplies_provided : [],
    maxVolunteers: Number(row.max_volunteers) || 15,
    volunteers: Array.isArray(row.volunteers) ? row.volunteers : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    bannerUrl: row.banner_url,
    createdAt: row.created_at,
  };
}

function sanitizeImageInput(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/src/assets/images/')) return trimmed;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return trimmed;
  } catch {
    // Reject invalid URLs
  }
  return fallback;
}

function createInitialSeed(): StoreState {
  const now = Date.now();
  const iso = (offsetHours: number) => new Date(now + offsetHours * 3600_000).toISOString();
  const futureDate = (daysAhead: number) => {
    const d = new Date(now + daysAhead * 86400_000);
    return d.toISOString().slice(0, 10);
  };

  const spots: CleanupSpot[] = [
    {
      id: 'spot-jhb-spruit-01',
      title: 'Braamfontein Spruit Stormwater Bank',
      description:
        'Heavy summer rain washed a dense band of plastic cold-drink bottles, snack packets, and polystyrene trays onto the grassy bank below the footpath.',
      address: '12 Rustenburg Rd, Emmarentia, Johannesburg',
      neighborhood: 'Emmarentia, Johannesburg',
      lat: -26.1538,
      lng: 28.0074,
      priority: 'high',
      status: 'scheduled',
      wasteTypes: ['Plastics', 'Packaging'],
      photoUrl: '/src/assets/images/spot_riverbank_plastics_1795254462665.jpg',
      reportedBy: 'Thabo Mokoena',
      createdAt: iso(-38),
      upvotes: 18,
    },
    {
      id: 'spot-cpt-promenade-02',
      title: 'Mouille Point Stone Wall Dumping',
      description:
        'Discarded cardboard boxes, beverage tins, and takeaway wrappers piled beside the coastal park footpath and stone retaining wall.',
      address: 'Beach Rd & Granger Bay Blvd, Mouille Point, Cape Town',
      neighborhood: 'Mouille Point, Cape Town',
      lat: -33.9006,
      lng: 18.4044,
      priority: 'high',
      status: 'needs_cleanup',
      wasteTypes: ['Packaging', 'Glass & Metal'],
      photoUrl: '/src/assets/images/spot_underpass_dumping_1795254462665.jpg',
      reportedBy: 'Nomsa Dlamini',
      createdAt: iso(-16),
      upvotes: 12,
    },
    {
      id: 'spot-dbn-umngeni-03',
      title: 'uMngeni Estuary Drift & Nylon Rope',
      description:
        'Tidal surge pushed tangled nylon fishing rope, crates, and weathered plastic bottles between the rocks along the lower harbor walkway.',
      address: 'Riverside Rd Seawall, Blue Lagoon, Durban',
      neighborhood: 'Blue Lagoon, Durban',
      lat: -29.8112,
      lng: 31.0368,
      priority: 'medium',
      status: 'needs_cleanup',
      wasteTypes: ['Marine Drift', 'Plastics'],
      photoUrl: '/src/assets/images/spot_coastal_drift_1795254462455.jpg',
      reportedBy: 'Kagiso Sithole',
      createdAt: iso(-9),
      upvotes: 9,
    },
    {
      id: 'spot-pta-apies-04',
      title: 'Apies River Greenway Path',
      description:
        'Cleared 700 meters of verge litter and overflowing bin spillover during Saturday morning community sweep. Walkway and lawns are spotless.',
      address: 'Nelson Mandela Dr Path, Sunnyside, Pretoria',
      neighborhood: 'Sunnyside, Pretoria',
      lat: -25.7521,
      lng: 28.2035,
      priority: 'low',
      status: 'cleaned',
      wasteTypes: ['Plastics', 'Packaging'],
      photoUrl: '/src/assets/images/spot_underpass_dumping_1795254462665.jpg',
      afterPhotoUrl: '/src/assets/images/spot_alley_cleaned_1795254462196.jpg',
      reportedBy: 'Annelize van der Merwe',
      createdAt: iso(-110),
      cleanedAt: iso(-28),
      bagsCollected: 14,
      upvotes: 26,
    },
  ];

  const events: CleanupEvent[] = [
    {
      id: 'event-jhb-spruit-01',
      spotId: 'spot-jhb-spruit-01',
      title: 'Saturday Braamfontein Spruit Sweep',
      description:
        'Join Johannesburg neighbors for a 2-hour riverfront cleanup along the Emmarentia stretch of the Spruit. We will separate PET plastics and cans for local recycling buy-back.',
      locationName: 'Emmarentia, Johannesburg',
      meetingPoint: 'Meet at the wooden benches beside Emmarentia Dam lower parking',
      lat: -26.1538,
      lng: 28.0074,
      date: futureDate(3),
      startTime: '08:30',
      durationHours: 2,
      organizer: 'Thabo Mokoena',
      suppliesProvided: ['Heavy-Duty Bags', 'Work Gloves', 'Litter Grabbers'],
      maxVolunteers: 20,
      volunteers: [
        { id: 'v-1', name: 'Thabo Mokoena', joinedAt: iso(-30) },
        { id: 'v-2', name: 'Lerato Molefe', joinedAt: iso(-24) },
        { id: 'v-3', name: 'Pieter Botha', joinedAt: iso(-18) },
        { id: 'v-4', name: 'Zanele Khumalo', joinedAt: iso(-11) },
        { id: 'v-5', name: 'Sipho Ndlovu', joinedAt: iso(-5) },
      ],
      comments: [
        {
          id: 'c-1',
          author: 'Thabo Mokoena',
          text: 'Bringing 30 pairs of heavy-duty gloves and clear bags for recyclables. Closed shoes recommended near the riverbank.',
          createdAt: iso(-22),
        },
        {
          id: 'c-2',
          author: 'Lerato Molefe',
          text: 'City Parks confirmed they will collect the stacked bags from the Rustenburg Rd gate at 11:30.',
          createdAt: iso(-10),
        },
      ],
      bannerUrl: '/src/assets/images/event_community_cleanup_1795254462822.jpg',
      createdAt: iso(-32),
    },
    {
      id: 'event-cpt-mouille-02',
      spotId: 'spot-cpt-promenade-02',
      title: 'Mouille Point Coastal Wall Blitz',
      description:
        'Early evening sweep targeting dumped cardboard and beverage containers along the Mouille Point park path before weekend winds blow debris into Table Bay.',
      locationName: 'Mouille Point, Cape Town',
      meetingPoint: 'Stone wall steps opposite Mouille Point Lighthouse',
      lat: -33.9006,
      lng: 18.4044,
      date: futureDate(5),
      startTime: '17:00',
      durationHours: 1.5,
      organizer: 'Nomsa Dlamini',
      suppliesProvided: ['Heavy-Duty Bags', 'Work Gloves', 'First Aid Kit'],
      maxVolunteers: 14,
      volunteers: [
        { id: 'v-6', name: 'Nomsa Dlamini', joinedAt: iso(-15) },
        { id: 'v-7', name: 'Tariq Abrahams', joinedAt: iso(-8) },
      ],
      comments: [
        {
          id: 'c-3',
          author: 'Nomsa Dlamini',
          text: 'Extra water refills and recycling sacks will be waiting at the lighthouse bench.',
          createdAt: iso(-7),
        },
      ],
      bannerUrl: '/src/assets/images/spot_underpass_dumping_1795254462665.jpg',
      createdAt: iso(-15),
    },
    {
      id: 'event-dbn-umngeni-03',
      spotId: 'spot-dbn-umngeni-03',
      title: 'Blue Lagoon uMngeni Estuary Recovery',
      description:
        'Low-tide coastal crew clearing trapped fishing rope, crates, and plastics along the rocky uMngeni mouth. Please wear sturdy closed shoes with grip.',
      locationName: 'Blue Lagoon, Durban',
      meetingPoint: 'Public walkway overlook at Riverside Rd & Blue Lagoon',
      lat: -29.8112,
      lng: 31.0368,
      date: futureDate(9),
      startTime: '08:00',
      durationHours: 2.5,
      organizer: 'Kagiso Sithole',
      suppliesProvided: ['Heavy-Duty Bags', 'Work Gloves', 'Litter Grabbers', 'Refreshments'],
      maxVolunteers: 18,
      volunteers: [
        { id: 'v-8', name: 'Kagiso Sithole', joinedAt: iso(-8) },
        { id: 'v-9', name: 'Priya Naidoo', joinedAt: iso(-4) },
        { id: 'v-10', name: 'Bongani Zulu', joinedAt: iso(-2) },
      ],
      comments: [],
      bannerUrl: '/src/assets/images/spot_coastal_drift_1795254462455.jpg',
      createdAt: iso(-8),
    },
  ];

  return { spots, events };
}

class CommunityStore {
  private state: StoreState;
  private supabase: SupabaseClient | null = null;
  private supabaseSeeded = false;

  constructor() {
    this.state = this.loadFromDisk();
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    )?.trim();

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      console.log('Supabase client configured for CleanCommons backend persistence.');
    }
  }

  isSupabaseEnabled(): boolean {
    return Boolean(this.supabase);
  }

  private loadFromDisk(): StoreState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw) as StoreState;
        if (Array.isArray(parsed.spots) && Array.isArray(parsed.events)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read local store, re-seeding:', err);
    }
    const seed = createInitialSeed();
    this.saveToDisk(seed);
    return seed;
  }

  private saveToDisk(nextState: StoreState): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(nextState, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist store to disk:', err);
    }
  }

  private async maybeSeedSupabase(): Promise<void> {
    if (!this.supabase || this.supabaseSeeded) return;
    try {
      const legacySpotIds = [
        'spot-riverbank-01',
        'spot-underpass-02',
        'spot-seawall-03',
        'spot-alley-04',
      ];
      const legacyEventIds = [
        'event-eastbank-01',
        'event-underpass-02',
        'event-seawall-03',
      ];

      const { data: legacyRows } = await this.supabase
        .from('cleanup_spots')
        .select('id')
        .in('id', legacySpotIds);

      if (Array.isArray(legacyRows) && legacyRows.length > 0) {
        await this.supabase.from('cleanup_events').delete().in('id', legacyEventIds);
        await this.supabase.from('cleanup_spots').delete().in('id', legacySpotIds);
        const seed = createInitialSeed();
        await this.supabase.from('cleanup_spots').upsert(seed.spots.map(spotToRow));
        await this.supabase.from('cleanup_events').upsert(seed.events.map(eventToRow));
        this.supabaseSeeded = true;
        return;
      }

      const { count, error } = await this.supabase
        .from('cleanup_spots')
        .select('id', { count: 'exact', head: true });
      if (error) return;
      if (count === 0) {
        const seed = createInitialSeed();
        await this.supabase.from('cleanup_spots').upsert(seed.spots.map(spotToRow));
        await this.supabase.from('cleanup_events').upsert(seed.events.map(eventToRow));
      }
      this.supabaseSeeded = true;
    } catch {
      // Tables may not be created yet; local store handles requests cleanly
    }
  }

  private async maybeUploadPhotoToStorage(photoUrl: string, prefix: string): Promise<string> {
    if (!this.supabase) return photoUrl;
    const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(photoUrl);
    if (!match) return photoUrl;

    try {
      const mimeType = match[1];
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const buffer = Buffer.from(match[2], 'base64');
      const filePath = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${ext}`;

      const { error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, { contentType: mimeType, upsert: false });
      if (error) {
        return photoUrl;
      }
      const { data } = this.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      return data?.publicUrl || photoUrl;
    } catch {
      return photoUrl;
    }
  }

  async getSpots(): Promise<CleanupSpot[]> {
    if (this.supabase) {
      await this.maybeSeedSupabase();
      const { data, error } = await this.supabase
        .from('cleanup_spots')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return (data as SpotRow[]).map(rowToSpot);
      }
      if (error) {
        console.warn('Supabase getSpots fallback to local store:', error.message);
      }
    }
    return [...this.state.spots].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createSpot(spot: CleanupSpot): Promise<CleanupSpot> {
    const resolvedPhotoUrl = await this.maybeUploadPhotoToStorage(spot.photoUrl, spot.id);
    const nextSpot: CleanupSpot = { ...spot, photoUrl: resolvedPhotoUrl };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('cleanup_spots')
        .insert(spotToRow(nextSpot))
        .select('*')
        .single();
      if (!error && data) {
        return rowToSpot(data as SpotRow);
      }
      if (error) {
        console.warn('Supabase createSpot fallback to local store:', error.message);
      }
    }

    this.state.spots.unshift(nextSpot);
    this.saveToDisk(this.state);
    return nextSpot;
  }

  async updateSpot(
    id: string,
    patch: {
      action?: 'upvote';
      status?: SpotStatus;
      afterPhotoUrl?: string;
      bagsCollected?: number;
    }
  ): Promise<CleanupSpot | null> {
    const resolvedAfterPhoto =
      typeof patch.afterPhotoUrl === 'string' && patch.afterPhotoUrl.trim()
        ? await this.maybeUploadPhotoToStorage(patch.afterPhotoUrl.trim(), `${id}-after`)
        : undefined;

    if (this.supabase) {
      const { data: existingRow, error: fetchError } = await this.supabase
        .from('cleanup_spots')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!fetchError && existingRow) {
        const current = rowToSpot(existingRow as SpotRow);
        const updated: CleanupSpot = { ...current };

        if (patch.action === 'upvote') {
          updated.upvotes = (updated.upvotes || 0) + 1;
        }
        if (patch.status) {
          updated.status = patch.status;
          if (patch.status === 'cleaned') {
            updated.cleanedAt = new Date().toISOString();
          } else {
            delete updated.cleanedAt;
          }
        }
        if (resolvedAfterPhoto) {
          updated.afterPhotoUrl = resolvedAfterPhoto;
        }
        if (typeof patch.bagsCollected === 'number' && Number.isFinite(patch.bagsCollected)) {
          updated.bagsCollected = Math.max(0, Math.round(patch.bagsCollected));
        }

        const { data: savedRow, error: updateError } = await this.supabase
          .from('cleanup_spots')
          .update(spotToRow(updated))
          .eq('id', id)
          .select('*')
          .single();

        if (!updateError && savedRow) {
          return rowToSpot(savedRow as SpotRow);
        }
      }
    }

    const idx = this.state.spots.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const current = this.state.spots[idx];
    const updated: CleanupSpot = { ...current };

    if (patch.action === 'upvote') {
      updated.upvotes = (updated.upvotes || 0) + 1;
    }
    if (patch.status) {
      updated.status = patch.status;
      if (patch.status === 'cleaned') {
        updated.cleanedAt = new Date().toISOString();
      } else {
        delete updated.cleanedAt;
      }
    }
    if (resolvedAfterPhoto) {
      updated.afterPhotoUrl = resolvedAfterPhoto;
    }
    if (typeof patch.bagsCollected === 'number' && Number.isFinite(patch.bagsCollected)) {
      updated.bagsCollected = Math.max(0, Math.round(patch.bagsCollected));
    }

    this.state.spots[idx] = updated;
    this.saveToDisk(this.state);
    return updated;
  }

  async getEvents(): Promise<CleanupEvent[]> {
    if (this.supabase) {
      await this.maybeSeedSupabase();
      const { data, error } = await this.supabase
        .from('cleanup_events')
        .select('*')
        .order('date', { ascending: true });
      if (!error && Array.isArray(data)) {
        return (data as EventRow[]).map(rowToEvent);
      }
      if (error) {
        console.warn('Supabase getEvents fallback to local store:', error.message);
      }
    }
    return [...this.state.events].sort((a, b) => a.date.localeCompare(b.date));
  }

  async createEvent(event: CleanupEvent): Promise<CleanupEvent> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('cleanup_events')
        .insert(eventToRow(event))
        .select('*')
        .single();
      if (!error && data) {
        if (event.spotId) {
          await this.supabase
            .from('cleanup_spots')
            .update({ status: 'scheduled' })
            .eq('id', event.spotId)
            .eq('status', 'needs_cleanup');
        }
        return rowToEvent(data as EventRow);
      }
      if (error) {
        console.warn('Supabase createEvent fallback to local store:', error.message);
      }
    }

    this.state.events.push(event);
    if (event.spotId) {
      const spot = this.state.spots.find((s) => s.id === event.spotId);
      if (spot && spot.status === 'needs_cleanup') {
        spot.status = 'scheduled';
      }
    }
    this.saveToDisk(this.state);
    return event;
  }

  async rsvpEvent(
    id: string,
    name: string,
    action: 'join' | 'leave'
  ): Promise<CleanupEvent | null> {
    const normalized = name.trim().toLowerCase();

    if (this.supabase) {
      const { data: existingRow, error: fetchError } = await this.supabase
        .from('cleanup_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!fetchError && existingRow) {
        const event = rowToEvent(existingRow as EventRow);
        if (action === 'join') {
          const already = event.volunteers.some((v) => v.name.trim().toLowerCase() === normalized);
          if (!already && event.volunteers.length < event.maxVolunteers) {
            event.volunteers = [
              ...event.volunteers,
              {
                id: `v-${crypto.randomUUID().slice(0, 8)}`,
                name: name.trim(),
                joinedAt: new Date().toISOString(),
              },
            ];
          }
        } else {
          event.volunteers = event.volunteers.filter(
            (v) => v.name.trim().toLowerCase() !== normalized
          );
        }

        const { data: savedRow, error: updateError } = await this.supabase
          .from('cleanup_events')
          .update({ volunteers: event.volunteers })
          .eq('id', id)
          .select('*')
          .single();

        if (!updateError && savedRow) {
          return rowToEvent(savedRow as EventRow);
        }
      }
    }

    const idx = this.state.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const event = { ...this.state.events[idx] };
    if (action === 'join') {
      const already = event.volunteers.some((v) => v.name.trim().toLowerCase() === normalized);
      if (!already && event.volunteers.length < event.maxVolunteers) {
        event.volunteers = [
          ...event.volunteers,
          {
            id: `v-${crypto.randomUUID().slice(0, 8)}`,
            name: name.trim(),
            joinedAt: new Date().toISOString(),
          },
        ];
      }
    } else {
      event.volunteers = event.volunteers.filter(
        (v) => v.name.trim().toLowerCase() !== normalized
      );
    }

    this.state.events[idx] = event;
    this.saveToDisk(this.state);
    return event;
  }

  async addEventComment(id: string, author: string, text: string): Promise<CleanupEvent | null> {
    const newComment: EventComment = {
      id: `c-${crypto.randomUUID().slice(0, 8)}`,
      author: author.trim(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    if (this.supabase) {
      const { data: existingRow, error: fetchError } = await this.supabase
        .from('cleanup_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!fetchError && existingRow) {
        const event = rowToEvent(existingRow as EventRow);
        const nextComments = [...event.comments, newComment];
        const { data: savedRow, error: updateError } = await this.supabase
          .from('cleanup_events')
          .update({ comments: nextComments })
          .eq('id', id)
          .select('*')
          .single();
        if (!updateError && savedRow) {
          return rowToEvent(savedRow as EventRow);
        }
      }
    }

    const idx = this.state.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const event = { ...this.state.events[idx] };
    event.comments = [...event.comments, newComment];

    this.state.events[idx] = event;
    this.saveToDisk(this.state);
    return event;
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatOsmManeuver(step: {
  maneuver?: { type?: string; modifier?: string };
  name?: string;
}): string {
  const type = step.maneuver?.type || 'continue';
  const mod = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
  const road = step.name ? ` onto ${step.name}` : '';
  if (type === 'depart') return `Start${road || ' toward route'}`;
  if (type === 'arrive') return 'Arrive at cleanup location';
  if (type === 'turn') return `Turn${mod}${road}`;
  return `${type.charAt(0).toUpperCase() + type.slice(1)}${mod}${road}`;
}

function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const factor = Math.pow(10, precision);
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

function getFreeRouteConfig(): { apiKey: string; baseUrl: string } | null {
  const apiKey = (process.env.FREEROUTE_API_KEY || process.env.FR_KEY)?.trim();
  if (!apiKey) return null;
  const rawBase = process.env.FREEROUTE_BASE_URL?.trim() || 'https://api.maps.freeroute.org';
  try {
    const parsed = new URL(rawBase);
    if (parsed.protocol !== 'https:') return null;
    return { apiKey, baseUrl: parsed.origin };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const store = new CommunityStore();

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      backend: store.isSupabaseEnabled() ? 'supabase' : 'local',
      routing: getFreeRouteConfig() ? 'freeroute' : 'osrm',
    });
  });

  // Spots API
  app.get('/api/spots', async (_req, res) => {
    try {
      const spots = await store.getSpots();
      res.json(spots);
    } catch (error) {
      console.error('GET /api/spots failed:', error);
      res.status(500).json({ error: 'Unable to load cleanup spots.' });
    }
  });

  app.post('/api/spots', async (req, res) => {
    try {
      const body = req.body ?? {};
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
      const description =
        typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '';
      const address = typeof body.address === 'string' ? body.address.trim().slice(0, 240) : '';
      const neighborhood =
        typeof body.neighborhood === 'string' && body.neighborhood.trim()
          ? body.neighborhood.trim().slice(0, 100)
          : 'Neighborhood';
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const priority: SpotPriority =
        body.priority === 'high' || body.priority === 'low' ? body.priority : 'medium';
      const wasteTypes = Array.isArray(body.wasteTypes)
        ? body.wasteTypes.filter((w: unknown) => typeof w === 'string').slice(0, 6)
        : ['Plastics'];
      const photoUrl = sanitizeImageInput(
        body.photoUrl,
        '/src/assets/images/spot_riverbank_plastics_1795254462665.jpg'
      );
      const reportedBy =
        typeof body.reportedBy === 'string' && body.reportedBy.trim()
          ? body.reportedBy.trim().slice(0, 60)
          : 'Community Member';

      if (
        !title ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        res.status(400).json({ error: 'Title and valid map coordinates are required.' });
        return;
      }

      const newSpot: CleanupSpot = {
        id: `spot-${crypto.randomUUID().slice(0, 8)}`,
        title,
        description: description || 'Reported by a local neighbor for community cleanup.',
        address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        neighborhood,
        lat,
        lng,
        priority,
        status: 'needs_cleanup',
        wasteTypes: wasteTypes.length > 0 ? wasteTypes : ['Plastics'],
        photoUrl,
        reportedBy,
        createdAt: new Date().toISOString(),
        upvotes: 1,
      };

      const created = await store.createSpot(newSpot);
      res.status(201).json(created);
    } catch (error) {
      console.error('POST /api/spots failed:', error);
      res.status(500).json({ error: 'Unable to save cleanup report.' });
    }
  });

  app.patch('/api/spots/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
        res.status(400).json({ error: 'Invalid spot identifier.' });
        return;
      }
      const body = req.body ?? {};
      const afterPhotoUrl =
        typeof body.afterPhotoUrl === 'string' && body.afterPhotoUrl.trim()
          ? sanitizeImageInput(body.afterPhotoUrl, '')
          : undefined;

      const updated = await store.updateSpot(id, {
        action: body.action === 'upvote' ? 'upvote' : undefined,
        status:
          body.status === 'needs_cleanup' ||
          body.status === 'scheduled' ||
          body.status === 'cleaned'
            ? body.status
            : undefined,
        afterPhotoUrl: afterPhotoUrl || undefined,
        bagsCollected: typeof body.bagsCollected === 'number' ? body.bagsCollected : undefined,
      });

      if (!updated) {
        res.status(404).json({ error: 'Cleanup spot not found.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      console.error('PATCH /api/spots/:id failed:', error);
      res.status(500).json({ error: 'Unable to update cleanup spot.' });
    }
  });

  // Events API
  app.get('/api/events', async (_req, res) => {
    try {
      const events = await store.getEvents();
      res.json(events);
    } catch (error) {
      console.error('GET /api/events failed:', error);
      res.status(500).json({ error: 'Unable to load community events.' });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const body = req.body ?? {};
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
      const description =
        typeof body.description === 'string' ? body.description.trim().slice(0, 1200) : '';
      const locationName =
        typeof body.locationName === 'string' ? body.locationName.trim().slice(0, 120) : '';
      const meetingPoint =
        typeof body.meetingPoint === 'string' ? body.meetingPoint.trim().slice(0, 200) : '';
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const date = typeof body.date === 'string' ? body.date.trim() : '';
      const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : '09:00';
      const durationHours = Math.max(0.5, Math.min(12, Number(body.durationHours) || 2));
      const organizer =
        typeof body.organizer === 'string' && body.organizer.trim()
          ? body.organizer.trim().slice(0, 60)
          : 'Neighborhood Host';
      const suppliesProvided = Array.isArray(body.suppliesProvided)
        ? body.suppliesProvided.filter((s: unknown) => typeof s === 'string').slice(0, 8)
        : ['Heavy-Duty Bags', 'Work Gloves'];
      const maxVolunteers = Math.max(2, Math.min(200, Number(body.maxVolunteers) || 15));
      const bannerUrl = sanitizeImageInput(
        body.bannerUrl,
        '/src/assets/images/event_community_cleanup_1795254462822.jpg'
      );

      if (
        !title ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        res
          .status(400)
          .json({ error: 'Title, date (YYYY-MM-DD), and valid coordinates are required.' });
        return;
      }

      const newEvent: CleanupEvent = {
        id: `event-${crypto.randomUUID().slice(0, 8)}`,
        spotId: typeof body.spotId === 'string' && body.spotId.trim() ? body.spotId.trim() : undefined,
        title,
        description: description || 'Community volunteer cleanup drive. All neighbors welcome.',
        locationName: locationName || 'Neighborhood Cleanup Zone',
        meetingPoint: meetingPoint || 'Meet at main trailhead marker',
        lat,
        lng,
        date,
        startTime,
        durationHours,
        organizer,
        suppliesProvided,
        maxVolunteers,
        volunteers: [
          {
            id: `v-${crypto.randomUUID().slice(0, 8)}`,
            name: organizer,
            joinedAt: new Date().toISOString(),
          },
        ],
        comments: [],
        bannerUrl,
        createdAt: new Date().toISOString(),
      };

      const created = await store.createEvent(newEvent);
      res.status(201).json(created);
    } catch (error) {
      console.error('POST /api/events failed:', error);
      res.status(500).json({ error: 'Unable to publish cleanup event.' });
    }
  });

  app.post('/api/events/:id/rsvp', async (req, res) => {
    try {
      const { id } = req.params;
      if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
        res.status(400).json({ error: 'Invalid event identifier.' });
        return;
      }
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
      const action = req.body?.action === 'leave' ? 'leave' : 'join';
      if (!name) {
        res.status(400).json({ error: 'Volunteer name is required.' });
        return;
      }
      const updated = await store.rsvpEvent(id, name, action);
      if (!updated) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      console.error('POST /api/events/:id/rsvp failed:', error);
      res.status(500).json({ error: 'Unable to update RSVP.' });
    }
  });

  app.post('/api/events/:id/comments', async (req, res) => {
    try {
      const { id } = req.params;
      if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
        res.status(400).json({ error: 'Invalid event identifier.' });
        return;
      }
      const author =
        typeof req.body?.author === 'string' && req.body.author.trim()
          ? req.body.author.trim().slice(0, 60)
          : 'Neighbor';
      const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 500) : '';
      if (!text) {
        res.status(400).json({ error: 'Comment text cannot be empty.' });
        return;
      }
      const updated = await store.addEventComment(id, author, text);
      if (!updated) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      console.error('POST /api/events/:id/comments failed:', error);
      res.status(500).json({ error: 'Unable to post comment.' });
    }
  });

  // FreeRoute API + OpenStreetMap Nominatim Geocoding Proxy
  app.get('/api/geocode/search', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }

    const fr = getFreeRouteConfig();
    if (fr) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const url = `${fr.baseUrl}/v1/geocode/search?q=${encodeURIComponent(query)}&limit=5`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'X-API-Key': fr.apiKey,
            Authorization: `Bearer ${fr.apiKey}`,
            Accept: 'application/json',
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const payload = (await response.json()) as {
            features?: Array<{
              geometry?: { coordinates?: [number, number] };
              properties?: {
                label?: string;
                name?: string;
                neighbourhood?: string;
                locality?: string;
                region?: string;
                country?: string;
                countrycode?: string;
              };
            }>;
          };
          const features = (payload.features || []).filter((f) => {
            const cc = f.properties?.countrycode?.toUpperCase();
            const country = f.properties?.country?.toLowerCase();
            return cc === 'ZA' || cc === 'ZAF' || country === 'south africa';
          });
          if (features.length > 0) {
            const mapped: GeocodeResult[] = features
              .map((f) => ({
                displayName: f.properties?.label || f.properties?.name || query,
                neighborhood:
                  f.properties?.neighbourhood ||
                  f.properties?.locality ||
                  f.properties?.region ||
                  'Local Area',
                lat: Number(f.geometry?.coordinates?.[1]),
                lng: Number(f.geometry?.coordinates?.[0]),
              }))
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
            res.json(mapped);
            return;
          }
        }
      } catch (err) {
        console.warn('FreeRoute geocode search fallback to Nominatim:', err);
      }
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=za&limit=5&addressdetails=1&q=${encodeURIComponent(
        query
      )}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CleanCommons/1.0 (community-cleanup-app)',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        res.json([]);
        return;
      }
      const data = (await response.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
        address?: Record<string, string>;
      }>;

      const normalized: GeocodeResult[] = data
        .map((item) => ({
          displayName: item.display_name || query,
          neighborhood:
            item.address?.neighbourhood ||
            item.address?.suburb ||
            item.address?.city_district ||
            item.address?.city ||
            'Local Area',
          lat: Number(item.lat),
          lng: Number(item.lon),
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

      res.json(normalized);
    } catch (error) {
      console.error('Nominatim search error:', error);
      res.json([]);
    }
  });

  app.get('/api/geocode/reverse', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
      return;
    }

    const fr = getFreeRouteConfig();
    if (fr) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const url = `${fr.baseUrl}/v1/geocode/reverse?lon=${lng}&lat=${lat}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'X-API-Key': fr.apiKey,
            Authorization: `Bearer ${fr.apiKey}`,
            Accept: 'application/json',
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const payload = (await response.json()) as {
            features?: Array<{
              properties?: {
                label?: string;
                street?: string;
                locality?: string;
                neighbourhood?: string;
              };
            }>;
          };
          const props = payload.features?.[0]?.properties;
          if (props) {
            res.json({
              displayName:
                props.label ||
                [props.street, props.locality].filter(Boolean).join(', ') ||
                `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              neighborhood: props.neighbourhood || props.locality || 'Pinned Zone',
              lat,
              lng,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('FreeRoute reverse geocode fallback to Nominatim:', err);
      }
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CleanCommons/1.0 (community-cleanup-app)',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        res.json({
          displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          neighborhood: 'Pinned Zone',
          lat,
          lng,
        });
        return;
      }
      const data = (await response.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const road = data.address?.road || data.address?.pedestrian || data.address?.park;
      const city = data.address?.city || data.address?.town || data.address?.village;
      const shortName = [road, city].filter(Boolean).join(', ');
      const neighborhood =
        data.address?.neighbourhood ||
        data.address?.suburb ||
        data.address?.city_district ||
        city ||
        'Pinned Zone';

      res.json({
        displayName: shortName || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        neighborhood,
        lat,
        lng,
      });
    } catch (error) {
      console.error('Nominatim reverse error:', error);
      res.json({
        displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        neighborhood: 'Pinned Zone',
        lat,
        lng,
      });
    }
  });

  // FreeRoute Directions API (api.maps.freeroute.org) with OSRM + Haversine fallback
  app.get('/api/route', async (req, res) => {
    const fromLat = Number(req.query.fromLat);
    const fromLng = Number(req.query.fromLng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);
    const profileRaw = typeof req.query.profile === 'string' ? req.query.profile : 'foot';
    const profile: RouteProfile =
      profileRaw === 'bike' || profileRaw === 'driving' ? profileRaw : 'foot';

    if (
      !Number.isFinite(fromLat) ||
      !Number.isFinite(fromLng) ||
      !Number.isFinite(toLat) ||
      !Number.isFinite(toLng) ||
      fromLat < -90 ||
      fromLat > 90 ||
      toLat < -90 ||
      toLat > 90 ||
      fromLng < -180 ||
      fromLng > 180 ||
      toLng < -180 ||
      toLng > 180
    ) {
      res.status(400).json({ error: 'Valid origin and destination coordinates are required.' });
      return;
    }

    const fr = getFreeRouteConfig();
    if (fr) {
      const frProfile =
        profile === 'bike'
          ? 'cycling-regular'
          : profile === 'driving'
          ? 'driving-car'
          : 'foot-walking';
      const frUrl = `${fr.baseUrl}/v1/directions/${frProfile}`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const response = await fetch(frUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'X-API-Key': fr.apiKey,
            Authorization: `Bearer ${fr.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [fromLng, fromLat],
              [toLng, toLat],
            ],
            instructions: true,
          }),
        });
        clearTimeout(timeout);

        if (response.ok) {
          const payload = (await response.json()) as {
            features?: Array<{
              geometry?: { coordinates?: [number, number][] };
              properties?: {
                summary?: { distance?: number; duration?: number };
                segments?: Array<{
                  steps?: Array<{
                    instruction?: string;
                    distance?: number;
                    duration?: number;
                  }>;
                }>;
              };
            }>;
            routes?: Array<{
              geometry?: string | { coordinates?: [number, number][] };
              summary?: { distance?: number; duration?: number };
              segments?: Array<{
                steps?: Array<{
                  instruction?: string;
                  distance?: number;
                  duration?: number;
                }>;
              }>;
            }>;
          };

          const feature = payload.features?.[0];
          const routeObj = payload.routes?.[0];

          if (feature?.geometry?.coordinates?.length) {
            const coordinates: [number, number][] = feature.geometry.coordinates.map(
              ([lng, lat]) => [lat, lng]
            );
            const rawSteps = feature.properties?.segments?.[0]?.steps || [];
            const result: RouteResult = {
              distanceMeters: Math.round(feature.properties?.summary?.distance || 0),
              durationSeconds: Math.round(feature.properties?.summary?.duration || 0),
              coordinates,
              steps: rawSteps.map((s) => ({
                instruction: s.instruction || 'Continue along route',
                distanceMeters: Math.round(s.distance || 0),
                durationSeconds: Math.round(s.duration || 0),
              })),
              profile,
            };
            res.json(result);
            return;
          }

          if (routeObj) {
            const coordinates: [number, number][] =
              typeof routeObj.geometry === 'string'
                ? decodePolyline(routeObj.geometry)
                : Array.isArray(routeObj.geometry?.coordinates)
                ? routeObj.geometry.coordinates.map(([lng, lat]) => [lat, lng])
                : [];

            if (coordinates.length >= 2) {
              const rawSteps = routeObj.segments?.[0]?.steps || [];
              const result: RouteResult = {
                distanceMeters: Math.round(routeObj.summary?.distance || 0),
                durationSeconds: Math.round(routeObj.summary?.duration || 0),
                coordinates,
                steps: rawSteps.map((s) => ({
                  instruction: s.instruction || 'Continue along route',
                  distanceMeters: Math.round(s.distance || 0),
                  durationSeconds: Math.round(s.duration || 0),
                })),
                profile,
              };
              res.json(result);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('FreeRoute directions fallback to OSRM:', err);
      }
    }

    const osrmProfile =
      profile === 'bike' ? 'cycling' : profile === 'driving' ? 'driving' : 'walking';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(osrmUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CleanCommons/1.0' },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const payload = (await response.json()) as {
          code?: string;
          routes?: Array<{
            distance: number;
            duration: number;
            geometry?: { coordinates?: [number, number][] };
            legs?: Array<{
              steps?: Array<{
                distance: number;
                duration: number;
                name?: string;
                maneuver?: { type?: string; modifier?: string };
              }>;
            }>;
          }>;
        };

        const route = payload.routes?.[0];
        if (route && route.geometry?.coordinates?.length) {
          const coordinates: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]);
          const steps =
            route.legs?.[0]?.steps?.map((s) => ({
              instruction: formatOsmManeuver(s),
              distanceMeters: Math.round(s.distance || 0),
              durationSeconds: Math.round(s.duration || 0),
            })) || [];

          const result: RouteResult = {
            distanceMeters: Math.round(route.distance),
            durationSeconds: Math.round(route.duration),
            coordinates,
            steps,
            profile,
          };
          res.json(result);
          return;
        }
      }
    } catch (error) {
      console.warn('OSRM FreeRoute fallback activated:', error);
    }

    const dist = haversineMeters(fromLat, fromLng, toLat, toLng);
    const speedMps = profile === 'driving' ? 11.1 : profile === 'bike' ? 4.4 : 1.35;
    const fallback: RouteResult = {
      distanceMeters: Math.round(dist),
      durationSeconds: Math.round(dist / speedMps),
      coordinates: [
        [fromLat, fromLng],
        [toLat, toLng],
      ],
      steps: [
        {
          instruction: 'Head directly toward cleanup coordinates',
          distanceMeters: Math.round(dist),
          durationSeconds: Math.round(dist / speedMps),
        },
      ],
      profile,
      isFallback: true,
    };
    res.json(fallback);
  });

  // Frontend Vite / Static Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CleanCommons server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
