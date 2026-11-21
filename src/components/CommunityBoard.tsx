import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Lock,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import type { CleanupEvent, CleanupSpot, EventVolunteer } from '../types';
import { api } from '../api/client';
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
  onExploreMap?: () => void;
  onViewOnMap: (event: CleanupEvent) => void;
  onRsvp: (eventId: string, name: string, action: 'join' | 'leave') => Promise<void>;
  onAddComment: (eventId: string, author: string, text: string) => Promise<void>;
  reporterTokens?: Record<string, string>;
  unlockedVolunteers?: Record<string, EventVolunteer[]>;
  onUnlockVolunteers?: (
    event: CleanupEvent,
    volunteers: EventVolunteer[],
    token: string
  ) => void;
  onLockVolunteers?: (event: CleanupEvent) => void;
  onRefreshVolunteers?: (event: CleanupEvent) => Promise<void>;
}

function getVolunteerCount(ev: CleanupEvent): number {
  return typeof ev.volunteerCount === 'number' ? ev.volunteerCount : ev.volunteers.length;
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
  onExploreMap,
  onViewOnMap,
  onRsvp,
  onAddComment,
  reporterTokens = {},
  unlockedVolunteers = {},
  onUnlockVolunteers,
  onLockVolunteers,
  onRefreshVolunteers,
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    highlightedEventId || events[0]?.id || null
  );
  const [mobileShowingDetail, setMobileShowingDetail] = useState<boolean>(
    Boolean(highlightedEventId)
  );
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'open_spots' | 'joined'>('all');
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('cleancommons_joined_events');
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const [unlockFormOpenFor, setUnlockFormOpenFor] = useState<string | null>(null);
  const [authReporterName, setAuthReporterName] = useState('');
  const [authPasscode, setAuthPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (highlightedEventId) {
      setSelectedEventId(highlightedEventId);
      setMobileShowingDetail(true);
    }
  }, [highlightedEventId]);

  const totalVolunteers = events.reduce((acc, ev) => acc + getVolunteerCount(ev), 0);
  const openSpotsCount = spots.filter((s) => s.status !== 'cleaned').length;
  const cleanedCount = spots.filter((s) => s.status === 'cleaned').length;

  const isEventJoinedByMe = (evId: string) => joinedEventIds.includes(evId);

  const persistJoinedIds = (nextIds: string[]) => {
    setJoinedEventIds(nextIds);
    try {
      localStorage.setItem('cleancommons_joined_events', JSON.stringify(nextIds));
    } catch {
      // Ignore storage error
    }
  };

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

  const regionAndSearchMatched = useMemo(() => {
    return events.filter((ev) => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay =
          `${ev.title} ${ev.locationName} ${ev.meetingPoint} ${ev.organizer} ${loc.province} ${loc.city} ${loc.suburb}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, provinceFilter, cityFilter, suburbFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const all = regionAndSearchMatched.length;
    const open_spots = regionAndSearchMatched.filter(
      (ev) => getVolunteerCount(ev) < ev.maxVolunteers
    ).length;
    const joined = regionAndSearchMatched.filter((ev) => joinedEventIds.includes(ev.id)).length;
    return { all, open_spots, joined };
  }, [regionAndSearchMatched, joinedEventIds]);

  const filteredEvents = useMemo(() => {
    return regionAndSearchMatched.filter((ev) => {
      if (filterMode === 'open_spots' && getVolunteerCount(ev) >= ev.maxVolunteers) {
        return false;
      }
      if (filterMode === 'joined') {
        if (!joinedEventIds.includes(ev.id)) return false;
      }
      return true;
    });
  }, [regionAndSearchMatched, filterMode, joinedEventIds]);

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setSelectedEventId(null);
      return;
    }
    const stillVisible = filteredEvents.some((ev) => ev.id === selectedEventId);
    if (!stillVisible) {
      setSelectedEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEventId]);

  const activeEventIndex = filteredEvents.findIndex((ev) => ev.id === selectedEventId);
  const activeEvent = activeEventIndex >= 0 ? filteredEvents[activeEventIndex] : null;
  const activeEventLocation = activeEvent ? inferSouthAfricanLocation(activeEvent) : null;

  // Auto-load private volunteers when switching to an event whose spot/event already has an unlocked Bearer token in memory
  useEffect(() => {
    if (!activeEvent) return;
    const hasToken = Boolean(
      reporterTokens[`event:${activeEvent.id}`] ||
        (activeEvent.spotId ? reporterTokens[`spot:${activeEvent.spotId}`] : undefined)
    );
    if (hasToken && !unlockedVolunteers[activeEvent.id]) {
      onRefreshVolunteers?.(activeEvent);
    }
  }, [activeEvent, reporterTokens, unlockedVolunteers, onRefreshVolunteers]);

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
    const isJoined = isEventJoinedByMe(ev.id);

    if (isJoined) {
      setBusyEventId(ev.id);
      try {
        await onRsvp(ev.id, volunteerName.trim() || 'Neighbor', 'leave');
        persistJoinedIds(joinedEventIds.filter((id) => id !== ev.id));
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
      if (!joinedEventIds.includes(ev.id)) {
        persistJoinedIds([...joinedEventIds, ev.id]);
      }
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
      if (!joinedEventIds.includes(eventId)) {
        persistJoinedIds([...joinedEventIds, eventId]);
      }
      setNamePromptEventId(null);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleAuthenticateReporter = async (e: React.FormEvent, ev: CleanupEvent) => {
    e.preventDefault();
    setAuthError(null);
    const trimmedPass = authPasscode.trim();
    if (trimmedPass.length < 4) {
      setAuthError('Passcode must be at least 4 characters.');
      return;
    }

    const mode = ev.reporterClaimed ? 'unlock' : 'claim';
    if (mode === 'claim' && !authReporterName.trim()) {
      setAuthError('Please enter the reporter name to verify ownership.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.authenticateReporter(ev.id, {
        mode,
        reporterName: mode === 'claim' ? authReporterName.trim() : undefined,
        passcode: trimmedPass,
      });
      onUnlockVolunteers?.(ev, res.volunteers, res.reporterToken);
      setUnlockFormOpenFor(null);
      setAuthPasscode('');
      setAuthReporterName('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to verify reporter access.');
    } finally {
      setAuthLoading(false);
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

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMobileShowingDetail(true);
  };

  const handleCycleNextEvent = () => {
    if (filteredEvents.length === 0) return;
    const nextIdx = activeEventIndex >= 0 ? (activeEventIndex + 1) % filteredEvents.length : 0;
    setSelectedEventId(filteredEvents[nextIdx].id);
  };

  // Visible thumbnail slice for the notched left rail (keeps rail tidy and highlights selected)
  const railEvents = useMemo(() => {
    if (filteredEvents.length <= 5) return filteredEvents;
    const idx = Math.max(0, activeEventIndex);
    const start = Math.max(0, Math.min(idx - 2, filteredEvents.length - 5));
    return filteredEvents.slice(start, start + 5);
  }, [filteredEvents, activeEventIndex]);

  const activeIsJoined = Boolean(activeEvent && isEventJoinedByMe(activeEvent.id));
  const activeVolunteerCount = activeEvent ? getVolunteerCount(activeEvent) : 0;
  const activeIsFull = Boolean(
    activeEvent && activeVolunteerCount >= activeEvent.maxVolunteers
  );
  const activeReporterToken = activeEvent
    ? reporterTokens[`event:${activeEvent.id}`] ||
      (activeEvent.spotId ? reporterTokens[`spot:${activeEvent.spotId}`] : undefined)
    : undefined;
  const activeUnlockedRoster = activeEvent ? unlockedVolunteers[activeEvent.id] : undefined;

  const renderDetailSpotlight = (isMobileScreen: boolean) => {
    if (!activeEvent || !activeEventLocation) {
      return (
        <div className="bg-[#436C51] text-white rounded-[28px] p-8 text-center space-y-3 border border-white/15">
          <p className="font-display text-xl font-bold text-[#F2F0C9]">
            No cleanup selected
          </p>
          <p className="text-sm text-white/80">
            Select a neighborhood cleanup drive from the list or adjust your South Africa filters to inspect details.
          </p>
        </div>
      );
    }

    const displayNumber = activeEventIndex >= 0 ? activeEventIndex + 1 : 1;

    return (
      <div
        className={`bg-[#436C51] text-white flex flex-col overflow-hidden ${
          isMobileScreen
            ? 'min-h-full flex-1'
            : 'rounded-[28px] shadow-lg border border-[#355840]/40 lg:sticky lg:top-6'
        }`}
      >
        {/* Top Bar inside Sage Detail View */}
        <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {isMobileScreen ? (
              <button
                type="button"
                onClick={() => setMobileShowingDetail(false)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#F2F0C9] py-1 pr-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E9E8B8]">
                Drive Spotlight
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onViewOnMap(activeEvent)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#F2F0C9]" aria-hidden="true" />
            <span>View on Map</span>
          </button>
        </div>

        {/* Split Notched Body: Left Ivory Thumbnail Rail + Right Sage Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Vertical Thumbnail Rail with Curved Connected Tab */}
          {railEvents.length > 0 && (
            <aside
              aria-label="Quick switch cleanup events"
              className="w-[74px] sm:w-[88px] shrink-0 bg-[#F7F9F6] py-3 pl-2 flex flex-col items-end justify-between rounded-tr-[24px] rounded-br-[24px] my-2"
            >
              <div className="w-full space-y-2.5 flex flex-col items-end">
                {railEvents.map((ev) => {
                  const isSelected = ev.id === activeEvent.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEventId(ev.id)}
                      title={ev.title}
                      aria-label={`Select ${ev.title}`}
                      className={`relative w-full flex items-center justify-center py-1.5 pl-1.5 pr-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#436C51] rounded-l-[20px]'
                          : 'hover:bg-[#E7EEE8] rounded-l-xl'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 transition-transform ${
                          isSelected
                            ? 'border-[#EAE8BA] scale-105 shadow-sm'
                            : 'border-white shadow-xs opacity-85 hover:opacity-100'
                        }`}
                      >
                        <ResilientImage
                          src={ev.bannerUrl}
                          alt={ev.title}
                          fallbackLabel={ev.locationName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredEvents.length > 1 && (
                <button
                  type="button"
                  onClick={handleCycleNextEvent}
                  title="Next cleanup drive"
                  aria-label="Next cleanup drive"
                  className="mt-3 mr-3 w-9 h-9 rounded-full flex items-center justify-center text-[#3D634A] hover:bg-[#E5ECE6] transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
            </aside>
          )}

          {/* Right Sage Detail Canvas */}
          <div className="flex-1 min-w-0 p-4 sm:p-6 space-y-5 overflow-y-auto">
            {/* Hero Visual Banner */}
            <div className="relative aspect-16/10 w-full rounded-2xl overflow-hidden bg-[#355840] border border-white/15 shadow-sm">
              <ResilientImage
                src={activeEvent.bannerUrl}
                alt={activeEvent.title}
                fallbackLabel={activeEvent.locationName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#24412E]/70 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#F2F0C9] truncate">
                  {activeEventLocation.suburb}, {activeEventLocation.city}
                </span>
                <span className="text-[11px] font-medium text-white/90 shrink-0">
                  {activeEventLocation.province}
                </span>
              </div>
            </div>

            {/* Numbered Circle + Cream Display Headline */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-white/20 text-[#F2F0C9] font-display text-sm font-bold flex items-center justify-center shrink-0">
                  {displayNumber}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                    activeIsJoined
                      ? 'bg-[#EAE8BA] text-[#24412E]'
                      : activeIsFull
                      ? 'bg-white/15 text-white/80'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {activeIsJoined ? 'Joined' : activeIsFull ? 'Crew Full' : 'Open Spots'}
                </span>
              </div>

              <h2 className="font-display text-2xl font-bold tracking-tight text-[#F2F0C9] leading-tight [text-wrap:balance]">
                {activeEvent.title}
              </h2>

              <p className="text-sm text-white/90 leading-relaxed">{activeEvent.description}</p>
            </div>

            {/* 3-Icon Quick Metadata Row (Inspired by Screen 2 icon strip) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 border border-white/15 p-2.5 text-center space-y-1">
                <Calendar className="w-4 h-4 mx-auto text-[#EAE8BA]" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-white leading-tight truncate">
                  {formatEventDate(activeEvent.date, activeEvent.startTime)}
                </p>
                <p className="text-[10px] text-white/75">{activeEvent.durationHours} hrs</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-2.5 text-center space-y-1">
                <Users className="w-4 h-4 mx-auto text-[#EAE8BA]" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-white tabular-nums leading-tight">
                  {activeVolunteerCount} / {activeEvent.maxVolunteers}
                </p>
                <p className="text-[10px] text-white/75">Volunteers</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 p-2.5 text-center space-y-1">
                <Package className="w-4 h-4 mx-auto text-[#EAE8BA]" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-white tabular-nums leading-tight">
                  {activeEvent.suppliesProvided.length} items
                </p>
                <p className="text-[10px] text-white/75">Gear ready</p>
              </div>
            </div>

            {/* Logistics & Supplies */}
            <div className="rounded-2xl bg-[#385C45] border border-white/15 p-3.5 space-y-2 text-xs text-white/90">
              <p>
                <span className="font-semibold text-[#F2F0C9]">Meeting point:</span>{' '}
                {activeEvent.meetingPoint}
              </p>
              <p>
                <span className="font-semibold text-[#F2F0C9]">Organizer:</span>{' '}
                {activeEvent.organizer}
              </p>
              <p>
                <span className="font-semibold text-[#F2F0C9]">Supplies:</span>{' '}
                {activeEvent.suppliesProvided.join(' · ')}
              </p>
            </div>

            {/* Inline Volunteer Name Prompt */}
            {namePromptEventId === activeEvent.id && (
              <form
                onSubmit={(e) => handleConfirmJoinName(e, activeEvent.id)}
                className="p-3 bg-white/15 border border-white/25 rounded-xl flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  required
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter your name for the roster"
                  className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-white text-slate-900 placeholder:text-slate-400 rounded-lg focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busyEventId === activeEvent.id}
                  className="px-3 py-2 text-xs font-semibold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] rounded-lg cursor-pointer"
                >
                  Confirm RSVP
                </button>
                <button
                  type="button"
                  onClick={() => setNamePromptEventId(null)}
                  className="px-2 py-2 text-xs text-white/80 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={busyEventId === activeEvent.id || (!activeIsJoined && activeIsFull)}
                onClick={() => handleToggleJoin(activeEvent)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                  activeIsJoined
                    ? 'bg-white/20 text-white hover:bg-white/25 border border-white/25'
                    : 'bg-[#EAE8BA] text-[#24412E] hover:bg-[#F3F2D0]'
                }`}
              >
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>
                  {activeIsJoined
                    ? 'Joined · Leave'
                    : activeIsFull
                    ? 'Crew Full'
                    : 'Join Cleanup'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onViewOnMap(activeEvent)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#EAE8BA]" aria-hidden="true" />
                <span>Map</span>
              </button>
            </div>

            {/* Private Volunteer Roster (Reporter-only) */}
            <div className="pt-3 border-t border-white/15 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#F2F0C9] flex items-center gap-1.5">
                  {activeReporterToken && activeUnlockedRoster ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#EAE8BA]" aria-hidden="true" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#EAE8BA]" aria-hidden="true" />
                  )}
                  <span>Volunteer Roster (Reporter Only)</span>
                </p>

                {activeReporterToken && activeUnlockedRoster ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRefreshVolunteers?.(activeEvent)}
                      title="Refresh private roster"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white/85 hover:text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onLockVolunteers?.(activeEvent)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white/85 hover:text-white bg-white/10 hover:bg-white/20 rounded-md cursor-pointer"
                    >
                      <Lock className="w-3 h-3" aria-hidden="true" />
                      <span>Lock</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setUnlockFormOpenFor((prev) =>
                        prev === activeEvent.id ? null : activeEvent.id
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] rounded-lg cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" aria-hidden="true" />
                    <span>
                      {activeEvent.reporterClaimed ? 'Reporter Unlock' : 'Reporter Access'}
                    </span>
                  </button>
                )}
              </div>

              {activeReporterToken && activeUnlockedRoster ? (
                <div className="rounded-xl bg-[#385C45] border border-white/15 p-3 space-y-2">
                  <p className="text-[11px] text-[#EAE8BA] font-medium">
                    Verified view for reporter {activeEvent.reporterName || activeEvent.organizer}
                  </p>
                  {activeUnlockedRoster.length === 0 ? (
                    <p className="text-xs text-white/80">
                      No volunteers signed up yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeUnlockedRoster.map((v, idx) => (
                        <li
                          key={v.id}
                          className="flex items-center justify-between gap-2 text-xs text-white/95 py-1 border-b border-white/10 last:border-0"
                        >
                          <span className="font-medium truncate">
                            {idx + 1}. {v.name}
                          </span>
                          <span className="text-[11px] text-white/65 shrink-0">
                            {formatRelativeTime(v.joinedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-[#385C45]/90 border border-white/15 p-3 space-y-2.5">
                  <p className="text-xs text-white/85 leading-relaxed">
                    Volunteer names are kept private and are only visible to the reporter (
                    <span className="font-semibold text-[#F2F0C9]">
                      {activeEvent.reporterName || activeEvent.organizer}
                    </span>
                    ). {activeVolunteerCount} / {activeEvent.maxVolunteers} spots filled
                    {activeIsJoined ? ' — you are signed up.' : '.'}
                  </p>

                  {unlockFormOpenFor === activeEvent.id && (
                    <form
                      onSubmit={(e) => handleAuthenticateReporter(e, activeEvent)}
                      className="pt-2 border-t border-white/15 space-y-2"
                    >
                      {!activeEvent.reporterClaimed && (
                        <div>
                          <label
                            htmlFor="claim-reporter-name"
                            className="block text-[11px] font-medium text-[#F2F0C9] mb-1"
                          >
                            Confirm Reporter Name ({activeEvent.reporterName || activeEvent.organizer})
                          </label>
                          <input
                            id="claim-reporter-name"
                            type="text"
                            required
                            value={authReporterName}
                            onChange={(e) => setAuthReporterName(e.target.value)}
                            placeholder={activeEvent.reporterName || activeEvent.organizer}
                            className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 placeholder:text-slate-400 rounded-lg focus:outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="reporter-passcode-input"
                          className="block text-[11px] font-medium text-[#F2F0C9] mb-1"
                        >
                          {activeEvent.reporterClaimed
                            ? 'Enter Reporter Passcode'
                            : 'Create Private Passcode (4+ chars)'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="reporter-passcode-input"
                            type="password"
                            required
                            value={authPasscode}
                            onChange={(e) => setAuthPasscode(e.target.value)}
                            placeholder="Reporter passcode"
                            className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white text-slate-900 placeholder:text-slate-400 rounded-lg focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="px-3 py-1.5 text-xs font-bold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] rounded-lg cursor-pointer shrink-0 disabled:opacity-60"
                          >
                            {authLoading
                              ? '...'
                              : activeEvent.reporterClaimed
                              ? 'Unlock'
                              : 'Claim & View'}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <p className="text-[11px] text-[#FFE2DF] font-medium">{authError}</p>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Coordination Notes Thread */}
            <div className="pt-3 border-t border-white/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#F2F0C9] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Coordination Notes ({activeEvent.comments.length})</span>
                </p>
              </div>

              {activeEvent.comments.length === 0 ? (
                <p className="text-xs text-white/75">
                  No notes yet. Share gear updates, lift clubs, or site access info.
                </p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {activeEvent.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-white/10 border border-white/15 rounded-xl text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 text-white/70 mb-1">
                        <span className="font-semibold text-[#F2F0C9]">{c.author}</span>
                        <span>{formatRelativeTime(c.createdAt)}</span>
                      </div>
                      <p className="text-white/95 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => handleSubmitComment(e, activeEvent.id)}
                className="flex gap-2 pt-1"
              >
                <input
                  type="text"
                  value={commentText[activeEvent.id] || ''}
                  onChange={(e) =>
                    setCommentText((prev) => ({
                      ...prev,
                      [activeEvent.id]: e.target.value,
                    }))
                  }
                  placeholder="Post a coordination note..."
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-white text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busyEventId === activeEvent.id}
                  className="px-3.5 py-2 text-xs font-bold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] rounded-xl cursor-pointer shrink-0"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFBF9] flex flex-col">
      {/* Mobile Screen 2: Full Sage-Forest Detail View when user taps an event */}
      {mobileShowingDetail && activeEvent ? (
        <div className="lg:hidden flex-1 flex flex-col bg-[#436C51]">
          {renderDetailSpotlight(true)}
        </div>
      ) : (
        <>
          {/* Sage-Forest Canopy Hero Section (Blends directly from TopNav) */}
          <section className="bg-[#3D634A] text-white pt-5 pb-12 sm:pt-7 sm:pb-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
                  South Africa Community Board
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#F2F0C9] leading-[1.1] max-w-2xl [text-wrap:balance]">
                  Coordinate local cleanups where South African neighbors need help most
                </h1>
                <p className="text-sm sm:text-base text-white/90 max-w-xl leading-relaxed">
                  Join photo-verified drives across provinces, cities, and suburbs — or jump onto
                  the live map for directions and hotspots.
                </p>

                <div className="pt-1 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onOpenCreateEvent}
                      className="px-5 py-2.5 text-sm font-bold text-[#24412E] bg-[#EAE8BA] hover:bg-[#F3F2D0] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Post Cleanup Event
                    </button>
                    {onExploreMap && (
                      <button
                        type="button"
                        onClick={onExploreMap}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-white/15 hover:bg-white/25 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-[#EAE8BA]" aria-hidden="true" />
                        <span>Explore Map</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <label
                      htmlFor="volunteer-identity"
                      className="font-medium text-white/80 shrink-0"
                    >
                      Participating as:
                    </label>
                    <input
                      id="volunteer-identity"
                      type="text"
                      value={volunteerName}
                      onChange={(e) => persistName(e.target.value)}
                      placeholder="Enter your name"
                      className="flex-1 sm:flex-none sm:w-44 px-3 py-1.5 text-xs bg-white/15 border border-white/25 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-4">
                <div className="aspect-16/10 rounded-2xl overflow-hidden border border-white/20 shadow-md bg-[#355840]">
                  <ResilientImage
                    src="/src/assets/images/event_community_cleanup_1795254462822.jpg"
                    alt="South African volunteers collecting litter together"
                    className="w-full h-full object-cover"
                    fallbackLabel="Community Cleanup Crew"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Overlapping Curved Ivory Sheet + Desktop Split Workspace */}
          <section className="-mt-7 rounded-t-[28px] sm:rounded-t-[32px] bg-[#FAFBF9] flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-10 space-y-6">
              {/* Counted Tabs Right Along the Curved Seam */}
              <div className="grid grid-cols-3 sm:inline-flex items-end gap-2 sm:gap-6 -mt-5 sm:-mt-6 pb-2 border-b border-[#E3EAE4]">
                {(
                  [
                    { id: 'all', label: 'All Events', count: tabCounts.all },
                    { id: 'open_spots', label: 'Open Spots', count: tabCounts.open_spots },
                    { id: 'joined', label: 'My RSVPs', count: tabCounts.joined },
                  ] as const
                ).map((tab) => {
                  const isActive = filterMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterMode(tab.id)}
                      className="flex flex-col items-center gap-1.5 px-2 pb-2 cursor-pointer group"
                    >
                      <span
                        className={`min-w-[28px] h-7 px-2 rounded-full text-xs font-bold tabular-nums flex items-center justify-center transition-colors shadow-xs ${
                          isActive
                            ? 'bg-[#1D2B22] text-[#F2F0C9]'
                            : 'bg-[#C9D6CB] text-[#274030] group-hover:bg-[#B4C6B7]'
                        }`}
                      >
                        {tab.count}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                          isActive
                            ? 'text-slate-900'
                            : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3-Tier Province / City / Suburb Filter + Search Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#DCE4DD] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3D634A]"
                  />
                </div>
              </div>

              {/* Main 2-Column Workspace: Numbered Feed (Left) + Sage Spotlight (Right on lg+) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  {filteredEvents.length === 0 ? (
                    <div className="bg-white border border-[#DCE4DD] rounded-2xl p-8 sm:p-10 text-center space-y-3">
                      <p className="text-base font-semibold text-slate-900">
                        No cleanup events match your current filter
                      </p>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Clear your province, city, or suburb filter or start a new sweep in this
                        area.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {(provinceFilter !== 'all' ||
                          cityFilter !== 'all' ||
                          suburbFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={onClearRegionFilter}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                          >
                            Show All Provinces
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onOpenCreateEvent}
                          className="px-4 py-2 text-sm font-semibold text-white bg-[#3D634A] hover:bg-[#33543E] rounded-xl cursor-pointer"
                        >
                          Post Cleanup Event
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEvents.map((ev, index) => {
                        const loc = inferSouthAfricanLocation(ev);
                        const isJoined = isEventJoinedByMe(ev.id);
                        const volCount = getVolunteerCount(ev);
                        const isFull = volCount >= ev.maxVolunteers;
                        const isSelected = ev.id === selectedEventId;

                        return (
                          <div
                            key={ev.id}
                            className={`bg-white border rounded-2xl p-3 sm:p-4 transition-all ${
                              isSelected
                                ? 'border-[#3D634A] ring-2 ring-[#3D634A]/15 shadow-xs'
                                : 'border-[#E3EAE4] hover:border-[#B6C8B9]'
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              {/* Square Rounded Thumbnail Photo */}
                              <button
                                type="button"
                                onClick={() => handleSelectEvent(ev.id)}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#F1F5F1] border border-[#E3EAE4] shrink-0 cursor-pointer"
                              >
                                <ResilientImage
                                  src={ev.bannerUrl}
                                  alt={ev.title}
                                  fallbackLabel={ev.locationName}
                                  className="w-full h-full object-cover"
                                />
                              </button>

                              {/* Middle: Numbered Circle + Title + Location & Volunteer Summary */}
                              <button
                                type="button"
                                onClick={() => handleSelectEvent(ev.id)}
                                className="flex-1 min-w-0 text-left space-y-1 cursor-pointer"
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                      isSelected
                                        ? 'bg-[#3D634A] text-white'
                                        : 'bg-[#436C51]/90 text-white'
                                    }`}
                                  >
                                    {index + 1}
                                  </span>
                                  <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                                    {ev.title}
                                  </h2>
                                </div>

                                <p className="text-xs text-slate-600 line-clamp-2 pl-8">
                                  {loc.suburb} · {loc.city}, {loc.province} —{' '}
                                  <span className="font-semibold text-[#3D634A]">
                                    {formatEventDate(ev.date, ev.startTime)}
                                  </span>
                                </p>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pl-8 tabular-nums">
                                  <span>
                                    <strong className="text-slate-800">{volCount}</strong> /{' '}
                                    {ev.maxVolunteers} volunteers
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{ev.comments.length} notes</span>
                                </div>
                              </button>

                              {/* Right: Square Action Button (Quick Join / Open Spotlight) */}
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={busyEventId === ev.id || (!isJoined && isFull)}
                                  onClick={() => handleToggleJoin(ev)}
                                  title={
                                    isJoined
                                      ? 'Joined — click to leave'
                                      : isFull
                                      ? 'Crew Full'
                                      : 'Join Cleanup'
                                  }
                                  aria-label={
                                    isJoined
                                      ? `Leave ${ev.title}`
                                      : isFull
                                      ? `${ev.title} crew full`
                                      : `Join ${ev.title}`
                                  }
                                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
                                    isJoined
                                      ? 'bg-[#3D634A] border-[#3D634A] text-[#EAE8BA]'
                                      : 'bg-white border-[#DCE4DD] text-slate-700 hover:border-[#3D634A] hover:text-[#3D634A]'
                                  }`}
                                >
                                  {isJoined ? (
                                    <Check className="w-4 h-4" aria-hidden="true" />
                                  ) : (
                                    <Plus className="w-4 h-4" aria-hidden="true" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSelectEvent(ev.id)}
                                  aria-label={`Open details for ${ev.title}`}
                                  className="lg:hidden inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#3D634A]"
                                >
                                  <span>Details</span>
                                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            {/* Inline name prompt inside feed card if user quick-joins without a name */}
                            {namePromptEventId === ev.id && (
                              <form
                                onSubmit={(e) => handleConfirmJoinName(e, ev.id)}
                                className="mt-3 pt-3 border-t border-[#E3EAE4] flex flex-wrap items-center gap-2"
                              >
                                <input
                                  type="text"
                                  required
                                  autoFocus
                                  value={draftName}
                                  onChange={(e) => setDraftName(e.target.value)}
                                  placeholder="Your name for the roster"
                                  className="flex-1 min-w-[150px] px-3 py-1.5 text-xs bg-[#FAFBF9] border border-[#DCE4DD] rounded-lg focus:outline-none focus:border-[#3D634A]"
                                />
                                <button
                                  type="submit"
                                  disabled={busyEventId === ev.id}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3D634A] hover:bg-[#33543E] rounded-lg cursor-pointer"
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
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Community Snapshot (Inspired by bottom prompt strip of Screen 1) */}
                  <div className="bg-white border border-[#E3EAE4] rounded-2xl p-4 sm:p-5 text-center space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        South Africa Civic Cleanup Pulse
                      </p>
                      <p className="text-xs text-slate-500">
                        Live neighborhood drives and reported hotspots across all 9 provinces
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-[#F4F7F4] flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-[#3D634A] text-white font-display text-sm font-bold tabular-nums flex items-center justify-center">
                          {events.length}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">
                          Upcoming Drives
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F4F7F4] flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-[#436C51] text-[#F2F0C9] font-display text-sm font-bold tabular-nums flex items-center justify-center">
                          {totalVolunteers}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">
                          Volunteers Active
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FBF7EE] flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-[#D7E2D8] text-[#24412E] font-display text-sm font-bold tabular-nums flex items-center justify-center">
                          {openSpotsCount}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">
                          Spots Needing Care
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F4F7F4] flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-[#C8D8CA] text-[#24412E] font-display text-sm font-bold tabular-nums flex items-center justify-center">
                          {cleanedCount}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">
                          Areas Cleared
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Right Column: Sage-Forest Selected Event Spotlight */}
                <div className="hidden lg:block lg:col-span-5">
                  {renderDetailSpotlight(false)}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
