import { useEffect, useMemo, useState } from 'react';
import { MapPin, MessageSquare, Search, UserCheck, Users } from 'lucide-react';
import type { CleanupEvent, CleanupSpot } from '../types';
import { ResilientImage } from './ResilientImage';
import {
  ProvinceLocationFilter,
  type CityOption,
  type SuburbOption,
} from './ProvinceLocationFilter';
import { inferSouthAfricanLocation, type SouthAfricanProvince } from '../utils/southAfrica';
import { formatEventDate, formatRelativeTime } from '../utils/formatters';

interface CommunityBoardProps {
  events: CleanupEvent[];
  spots: CleanupSpot[];
  highlightedEventId: string | null;
  provinceFilter: 'all' | SouthAfricanProvince;
  cityFilter: string;
  suburbFilter: string;
  onChangeProvince: (province: 'all' | SouthAfricanProvince) => void;
  onChangeCity: (city: string) => void;
  onChangeSuburb: (suburb: string) => void;
  onClearRegionFilter: () => void;
  onOpenCreateEvent: () => void;
  onViewOnMap: (event: CleanupEvent) => void;
  onRsvp: (eventId: string, name: string, action: 'join' | 'leave') => Promise<void>;
  onAddComment: (eventId: string, author: string, text: string) => Promise<void>;
}

export function CommunityBoard({
  events,
  spots,
  highlightedEventId,
  provinceFilter,
  cityFilter,
  suburbFilter,
  onChangeProvince,
  onChangeCity,
  onChangeSuburb,
  onClearRegionFilter,
  onOpenCreateEvent,
  onViewOnMap,
  onRsvp,
  onAddComment,
}: CommunityBoardProps) {
  const [volunteerName, setVolunteerName] = useState<string>(() => {
    try {
      return localStorage.getItem('cleancommons_name') || '';
    } catch {
      return '';
    }
  });
  const [namePromptEventId, setNamePromptEventId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(highlightedEventId);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'open_spots' | 'joined'>('all');
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedEventId) {
      setExpandedThreadId(highlightedEventId);
    }
  }, [highlightedEventId]);

  const totalVolunteers = events.reduce((acc, ev) => acc + ev.volunteers.length, 0);
  const openSpotsCount = spots.filter((s) => s.status !== 'cleaned').length;
  const cleanedCount = spots.filter((s) => s.status === 'cleaned').length;

  const normalizedMe = volunteerName.trim().toLowerCase();

  const { provinceCounts, cityOptions, suburbOptions } = useMemo(() => {
    const counts: Partial<Record<SouthAfricanProvince, number>> = {};
    const cityMap = new Map<string, CityOption>();
    const suburbMap = new Map<string, SuburbOption>();

    events.forEach((ev) => {
      const loc = inferSouthAfricanLocation(ev);
      counts[loc.province] = (counts[loc.province] || 0) + 1;

      const cityKey = `${loc.province}::${loc.city}`;
      const existingCity = cityMap.get(cityKey);
      if (existingCity) {
        existingCity.count += 1;
      } else {
        cityMap.set(cityKey, { name: loc.city, province: loc.province, count: 1 });
      }

      const subKey = `${loc.province}::${loc.city}::${loc.suburb}`;
      const existingSub = suburbMap.get(subKey);
      if (existingSub) {
        existingSub.count += 1;
      } else {
        suburbMap.set(subKey, {
          name: loc.suburb,
          city: loc.city,
          province: loc.province,
          count: 1,
        });
      }
    });

    return {
      provinceCounts: counts,
      cityOptions: Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      suburbOptions: Array.from(suburbMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [events]);

  const filteredEvents = events.filter((ev) => {
    const loc = inferSouthAfricanLocation(ev);
    if (provinceFilter !== 'all' && loc.province !== provinceFilter) {
      return false;
    }
    if (cityFilter !== 'all' && loc.city !== cityFilter) {
      return false;
    }
    if (suburbFilter !== 'all' && loc.suburb !== suburbFilter) {
      return false;
    }
    if (filterMode === 'open_spots' && ev.volunteers.length >= ev.maxVolunteers) {
      return false;
    }
    if (filterMode === 'joined') {
      if (!normalizedMe) return false;
      const joined = ev.volunteers.some((v) => v.name.trim().toLowerCase() === normalizedMe);
      if (!joined) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hay = `${ev.title} ${ev.locationName} ${ev.meetingPoint} ${ev.organizer} ${loc.province} ${loc.city} ${loc.suburb}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const persistName = (name: string) => {
    const trimmed = name.trim();
    setVolunteerName(trimmed);
    try {
      localStorage.setItem('cleancommons_name', trimmed);
    } catch {
      // Ignore storage error
    }
    return trimmed;
  };

  const handleToggleJoin = async (ev: CleanupEvent) => {
    const isJoined =
      Boolean(normalizedMe) &&
      ev.volunteers.some((v) => v.name.trim().toLowerCase() === normalizedMe);

    if (isJoined) {
      setBusyEventId(ev.id);
      try {
        await onRsvp(ev.id, volunteerName, 'leave');
      } finally {
        setBusyEventId(null);
      }
      return;
    }

    if (!volunteerName.trim()) {
      setDraftName('');
      setNamePromptEventId(ev.id);
      return;
    }

    setBusyEventId(ev.id);
    try {
      await onRsvp(ev.id, volunteerName, 'join');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleConfirmJoinName = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    const cleaned = persistName(draftName);
    if (!cleaned) return;
    setBusyEventId(eventId);
    try {
      await onRsvp(eventId, cleaned, 'join');
      setNamePromptEventId(null);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    const text = (commentText[eventId] || '').trim();
    if (!text) return;
    const author = volunteerName.trim() || 'Neighbor';
    setBusyEventId(eventId);
    try {
      await onAddComment(eventId, author, text);
      setCommentText((prev) => ({ ...prev, [eventId]: '' }));
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Balanced 2-column Hero Split */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-emerald-700">
                Neighborhood Action Board
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 max-w-xl [text-wrap:balance]">
                Coordinate local cleanups where neighbors need help most
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Every event links directly to photo-verified map reports, supply checklists, and
                step-by-step walking or cycling directions so anyone can show up ready to help.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Post Cleanup Event
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <label htmlFor="volunteer-identity" className="font-medium text-slate-700 shrink-0">
                  Participating as:
                </label>
                <input
                  id="volunteer-identity"
                  type="text"
                  value={volunteerName}
                  onChange={(e) => persistName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-40 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 min-h-[220px] lg:min-h-[290px] bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200">
            <ResilientImage
              src="/src/assets/images/event_community_cleanup_1795254462822.jpg"
              alt="Neighborhood volunteers collecting litter together in a city park"
              className="w-full h-full lg:h-full object-cover"
              fallbackLabel="Community Cleanup Crew"
            />
          </div>
        </section>

        {/* Full-Width 4-Column Metric Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Upcoming Drives</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
              {events.length}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Volunteers Mobilized</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
              {totalVolunteers}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Active Spots Needing Care</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700">
              {openSpotsCount}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Areas Cleared</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700">
              {cleanedCount}
            </p>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Events' },
                  { id: 'open_spots', label: 'Open Spots' },
                  { id: 'joined', label: 'My RSVPs' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <ProvinceLocationFilter
              selectedProvince={provinceFilter}
              selectedCity={cityFilter}
              selectedSuburb={suburbFilter}
              provinceCounts={provinceCounts}
              cityOptions={cityOptions}
              suburbOptions={suburbOptions}
              onChangeProvince={onChangeProvince}
              onChangeCity={onChangeCity}
              onChangeSuburb={onChangeSuburb}
              onClearAll={onClearRegionFilter}
              align="left"
            />
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suburb, city, province..."
              aria-label="Search community events"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-base font-semibold text-slate-900">
              No cleanup events match your current filter
            </p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Clear your province, city, or suburb filter or start a new sweep in this area.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(provinceFilter !== 'all' || cityFilter !== 'all' || suburbFilter !== 'all') && (
                <button
                  type="button"
                  onClick={onClearRegionFilter}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Show All Provinces
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Post Cleanup Event
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => {
              const isJoined =
                Boolean(normalizedMe) &&
                ev.volunteers.some((v) => v.name.trim().toLowerCase() === normalizedMe);
              const isFull = ev.volunteers.length >= ev.maxVolunteers;
              const isHighlighted = ev.id === highlightedEventId;
              const threadOpen = expandedThreadId === ev.id;

              return (
                <article
                  key={ev.id}
                  className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                    isHighlighted ? 'border-emerald-700' : 'border-slate-200'
                  }`}
                >
                  <div className="aspect-16/9 w-full bg-slate-100 border-b border-slate-200 overflow-hidden">
                    <ResilientImage
                      src={ev.bannerUrl}
                      alt={ev.title}
                      fallbackLabel={ev.locationName}
                    />
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <h2 className="font-display text-lg font-semibold text-slate-900">
                        {ev.title}
                      </h2>

                      {/* Zero-pill metadata */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 tabular-nums">
                        <span className="font-semibold text-emerald-700">
                          {formatEventDate(ev.date, ev.startTime)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ev.durationHours} hrs</span>
                        <span aria-hidden="true">·</span>
                        <span>{ev.locationName}</span>
                        <span aria-hidden="true">·</span>
                        <span>Hosted by {ev.organizer}</span>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">{ev.description}</p>

                      <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Meeting point:</span>{' '}
                          {ev.meetingPoint}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Supplies provided:</span>{' '}
                          {ev.suppliesProvided.join(' · ')}
                        </p>
                        <p className="flex items-center gap-1.5 tabular-nums pt-0.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          <span>
                            <strong className="text-slate-900">{ev.volunteers.length}</strong> /{' '}
                            {ev.maxVolunteers} volunteers signed up
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Inline name prompt if user hasn't entered a name yet */}
                    {namePromptEventId === ev.id && (
                      <form
                        onSubmit={(e) => handleConfirmJoinName(e, ev.id)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="text"
                          required
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          placeholder="Your name for the roster"
                          className="flex-1 min-w-[160px] px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-emerald-700"
                        />
                        <button
                          type="submit"
                          disabled={busyEventId === ev.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                        >
                          Confirm RSVP
                        </button>
                        <button
                          type="button"
                          onClick={() => setNamePromptEventId(null)}
                          className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    )}

                    {/* Card actions */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyEventId === ev.id || (!isJoined && isFull)}
                          onClick={() => handleToggleJoin(ev)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                            isJoined
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            {isJoined
                              ? 'Joined · Leave'
                              : isFull
                              ? 'Crew Full'
                              : 'Join Cleanup'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewOnMap(ev)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View on Map</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedThreadId((prev) => (prev === ev.id ? null : ev.id))
                        }
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Notes ({ev.comments.length})</span>
                      </button>
                    </div>

                    {/* Expandable Volunteer Roster + Discussion Thread */}
                    {threadOpen && (
                      <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-800 mb-1">
                            Volunteer Roster
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {ev.volunteers.map((v) => v.name).join(' · ')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-800">
                            Coordination Notes
                          </p>
                          {ev.comments.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No notes yet. Share gear updates, carpools, or trail conditions.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {ev.comments.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
                                    <span className="font-semibold text-slate-800">{c.author}</span>
                                    <span>{formatRelativeTime(c.createdAt)}</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed">{c.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <form
                            onSubmit={(e) => handleSubmitComment(e, ev.id)}
                            className="flex gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={commentText[ev.id] || ''}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [ev.id]: e.target.value,
                                }))
                              }
                              placeholder="Post a coordination note..."
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                            />
                            <button
                              type="submit"
                              disabled={busyEventId === ev.id}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
                            >
                              Post
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
