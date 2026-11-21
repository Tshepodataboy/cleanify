import { useCallback, useEffect, useMemo, useState } from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import { api } from './api/client';
import type {
  CleanupEvent,
  CleanupSpot,
  EventVolunteer,
  RouteProfile,
  RouteResult,
  SpotPriority,
  SpotStatus,
} from './types';
import { TopNav, type ActiveTab } from './components/TopNav';
import { SpotListPanel } from './components/SpotListPanel';
import { CleanupMap, type SearchedSuburbPin } from './components/CleanupMap';
import { SpotDetailDrawer } from './components/SpotDetailDrawer';
import { ReportSpotModal } from './components/ReportSpotModal';
import { CreateEventModal } from './components/CreateEventModal';
import { CommunityBoard } from './components/CommunityBoard';
import { ImpactLogView } from './components/ImpactLogView';
import type { CityOption, SuburbOption } from './components/ProvinceLocationFilter';
import { formatDistance, formatDuration } from './utils/formatters';
import {
  SA_NATIONAL_CENTER,
  getCityCenter,
  getProvinceMeta,
  inferSouthAfricanLocation,
  type SouthAfricanProvince,
} from './utils/southAfrica';

const DEFAULT_START_ORIGIN = { lat: -26.2041, lng: 28.0473 };

function getLocalFallbackOrigin(spot?: CleanupSpot): { lat: number; lng: number } {
  if (!spot) return DEFAULT_START_ORIGIN;
  return {
    lat: Number((spot.lat - 0.012).toFixed(5)),
    lng: Number((spot.lng - 0.014).toFixed(5)),
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [spots, setSpots] = useState<CleanupSpot[]>([]);
  const [events, setEvents] = useState<CleanupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [mobileMapView, setMobileMapView] = useState<'map' | 'list'>('map');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | SpotStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<'all' | SouthAfricanProvince>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [suburbFilter, setSuburbFilter] = useState<string>('all');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventPreselectSpot, setEventPreselectSpot] = useState<CleanupSpot | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const [userOrigin, setUserOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [searchedSuburbPin, setSearchedSuburbPin] = useState<SearchedSuburbPin | null>(null);
  // Kept strictly in React JS memory (never localStorage/sessionStorage)
  const [reporterTokens, setReporterTokens] = useState<Record<string, string>>({});
  const [unlockedVolunteers, setUnlockedVolunteers] = useState<Record<string, EventVolunteer[]>>(
    {}
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedSpots, loadedEvents] = await Promise.all([api.getSpots(), api.getEvents()]);
      setSpots(loadedSpots);
      setEvents(loadedEvents);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load community data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { spotProvinceCounts, spotCityOptions, spotSuburbOptions } = useMemo(() => {
    const counts: Partial<Record<SouthAfricanProvince, number>> = {};
    const cityMap = new Map<string, CityOption>();
    const suburbMap = new Map<string, SuburbOption>();

    spots.forEach((spot) => {
      const loc = inferSouthAfricanLocation(spot);
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
      spotProvinceCounts: counts,
      spotCityOptions: Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      spotSuburbOptions: Array.from(suburbMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [spots]);

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const loc = inferSouthAfricanLocation(spot);
      if (provinceFilter !== 'all' && loc.province !== provinceFilter) return false;
      if (cityFilter !== 'all' && loc.city !== cityFilter) return false;
      if (suburbFilter !== 'all' && loc.suburb !== suburbFilter) return false;
      if (statusFilter !== 'all' && spot.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${spot.title} ${spot.neighborhood} ${spot.address} ${loc.province} ${loc.city} ${loc.suburb} ${spot.wasteTypes.join(
          ' '
        )}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [spots, provinceFilter, cityFilter, suburbFilter, statusFilter, searchQuery]);

  const handleChangeProvince = useCallback(
    (province: 'all' | SouthAfricanProvince) => {
      setProvinceFilter(province);
      if (province === 'all') {
        setCityFilter('all');
        setSuburbFilter('all');
        setFocusTarget(SA_NATIONAL_CENTER);
        return;
      }

      if (cityFilter !== 'all') {
        const cityValid = spotCityOptions.some(
          (c) => c.province === province && c.name === cityFilter
        );
        if (!cityValid) {
          setCityFilter('all');
        }
      }
      if (suburbFilter !== 'all') {
        const subValid = spotSuburbOptions.some(
          (s) => s.province === province && s.name === suburbFilter
        );
        if (!subValid) {
          setSuburbFilter('all');
        }
      }

      const matchingSpots = spots.filter((s) => inferSouthAfricanLocation(s).province === province);
      if (matchingSpots.length === 1) {
        setFocusTarget({ lat: matchingSpots[0].lat, lng: matchingSpots[0].lng, zoom: 13 });
      } else {
        setFocusTarget(getProvinceMeta(province).center);
      }
    },
    [cityFilter, suburbFilter, spotCityOptions, spotSuburbOptions, spots]
  );

  const handleChangeCity = useCallback(
    (city: string) => {
      setCityFilter(city);
      if (city === 'all') {
        setSuburbFilter('all');
        if (provinceFilter !== 'all') {
          setFocusTarget(getProvinceMeta(provinceFilter).center);
        } else {
          setFocusTarget(SA_NATIONAL_CENTER);
        }
        return;
      }

      if (suburbFilter !== 'all') {
        const subValid = spotSuburbOptions.some(
          (s) => s.city === city && s.name === suburbFilter
        );
        if (!subValid) setSuburbFilter('all');
      }

      const cityMatch = spots.find((s) => inferSouthAfricanLocation(s).city === city);
      const center = getCityCenter(city);
      if (center) {
        setFocusTarget(center);
      } else if (cityMatch) {
        setFocusTarget({ lat: cityMatch.lat, lng: cityMatch.lng, zoom: 12 });
      }
    },
    [provinceFilter, suburbFilter, spotSuburbOptions, spots]
  );

  const handleChangeSuburb = useCallback(
    (suburb: string) => {
      setSuburbFilter(suburb);
      if (suburb === 'all') {
        if (cityFilter !== 'all') {
          const center = getCityCenter(cityFilter);
          if (center) {
            setFocusTarget(center);
            return;
          }
        }
        if (provinceFilter !== 'all') {
          setFocusTarget(getProvinceMeta(provinceFilter).center);
        } else {
          setFocusTarget(SA_NATIONAL_CENTER);
        }
        return;
      }

      const match = spots.find((s) => inferSouthAfricanLocation(s).suburb === suburb);
      if (match) {
        setFocusTarget({ lat: match.lat, lng: match.lng, zoom: 14 });
      }
    },
    [cityFilter, provinceFilter, spots]
  );

  const handleClearRegionFilter = useCallback(() => {
    setProvinceFilter('all');
    setCityFilter('all');
    setSuburbFilter('all');
    setSearchedSuburbPin(null);
    setFocusTarget(SA_NATIONAL_CENTER);
  }, []);

  // When user types a suburb into the Reported Areas search bar, show it on the map
  useEffect(() => {
    if (activeTab !== 'map') return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchedSuburbPin(null);
      return;
    }

    if (filteredSpots.length > 0) {
      setSearchedSuburbPin(null);
      if (filteredSpots.length === 1) {
        setFocusTarget({ lat: filteredSpots[0].lat, lng: filteredSpots[0].lng, zoom: 14 });
      } else {
        const avgLat =
          filteredSpots.reduce((sum, s) => sum + s.lat, 0) / filteredSpots.length;
        const avgLng =
          filteredSpots.reduce((sum, s) => sum + s.lng, 0) / filteredSpots.length;
        setFocusTarget({ lat: avgLat, lng: avgLng, zoom: 12 });
      }
      return;
    }

    if (q.length < 3) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const results = await api.searchAddress(q);
        if (cancelled || results.length === 0) return;
        const first = results[0];
        const pin: SearchedSuburbPin = {
          lat: first.lat,
          lng: first.lng,
          label: first.neighborhood && first.neighborhood !== 'Local Area' ? first.neighborhood : q,
          displayName: first.displayName,
        };
        setSearchedSuburbPin(pin);
        setFocusTarget({ lat: pin.lat, lng: pin.lng, zoom: 14 });
      } catch {
        // Ignore transient geocode errors while typing
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, searchQuery, filteredSpots]);

  const handleLocateSuburb = useCallback((loc: SearchedSuburbPin | null) => {
    setSearchedSuburbPin(loc);
    if (loc) {
      setFocusTarget({ lat: loc.lat, lng: loc.lng, zoom: 14 });
    }
  }, []);

  const handleReportAtSearchedSuburb = useCallback((loc: SearchedSuburbPin) => {
    setPickedCoords({ lat: loc.lat, lng: loc.lng });
    setPickLocationMode(false);
    setReportModalOpen(true);
  }, []);

  const selectedSpot = useMemo(
    () => spots.find((s) => s.id === selectedSpotId) || null,
    [spots, selectedSpotId]
  );

  const linkedEventsForSelectedSpot = useMemo(() => {
    if (!selectedSpot) return [];
    return events.filter((e) => e.spotId === selectedSpot.id);
  }, [events, selectedSpot]);

  const handleSelectSpot = useCallback((spot: CleanupSpot) => {
    setSelectedSpotId(spot.id);
    setMobileDrawerOpen(true);
    setRoute(null);
    setRouteError(null);
    setFocusTarget({ lat: spot.lat, lng: spot.lng, zoom: 15 });
  }, []);

  const handleUpvoteSpot = async (spotId: string) => {
    try {
      const updated = await api.upvoteSpot(spotId);
      setSpots((prev) => prev.map((s) => (s.id === spotId ? updated : s)));
    } catch {
      // Keep current state silently if transient
    }
  };

  const handleUpdateSpotStatus = async (
    spotId: string,
    status: 'cleaned' | 'needs_cleanup',
    afterPhotoUrl?: string,
    bagsCollected?: number
  ) => {
    const updated = await api.updateSpotStatus(spotId, {
      status,
      afterPhotoUrl,
      bagsCollected,
    });
    setSpots((prev) => prev.map((s) => (s.id === spotId ? updated : s)));
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setUserOrigin(DEFAULT_START_ORIGIN);
      setFocusTarget({ ...DEFAULT_START_ORIGIN, zoom: 13 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserOrigin(coords);
        setFocusTarget({ ...coords, zoom: 14 });
      },
      () => {
        setUserOrigin(DEFAULT_START_ORIGIN);
        setFocusTarget({ ...DEFAULT_START_ORIGIN, zoom: 13 });
      },
      { timeout: 6000 }
    );
  };

  const resolveOriginForRouting = async (spot: CleanupSpot): Promise<{ lat: number; lng: number }> => {
    if (userOrigin) return userOrigin;
    const fallback = getLocalFallbackOrigin(spot);
    if (!navigator.geolocation) {
      setUserOrigin(fallback);
      return fallback;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserOrigin(coords);
          resolve(coords);
        },
        () => {
          setUserOrigin(fallback);
          resolve(fallback);
        },
        { timeout: 4500 }
      );
    });
  };

  const handleRequestRoute = async (spot: CleanupSpot, profile: RouteProfile) => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const origin = await resolveOriginForRouting(spot);
      const computed = await api.computeRoute(
        origin.lat,
        origin.lng,
        spot.lat,
        spot.lng,
        profile
      );
      setRoute(computed);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : 'Unable to compute route right now.');
    } finally {
      setRouteLoading(false);
    }
  };

  const handleStartMapPick = () => {
    setReportModalOpen(false);
    setActiveTab('map');
    setMobileMapView('map');
    setMobileDrawerOpen(false);
    setPickLocationMode(true);
  };

  const handleMapPickLocation = (lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
    setPickLocationMode(false);
    setReportModalOpen(true);
  };

  const handleCreateSpot = async (payload: {
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
  }) => {
    const created = await api.createSpot(payload);
    if (created.reporterToken) {
      const token = created.reporterToken;
      setReporterTokens((prev) => ({ ...prev, [`spot:${created.id}`]: token }));
    }
    const { reporterToken: _omitted, ...cleanSpot } = created;
    setSpots((prev) => [cleanSpot, ...prev]);
    setSelectedSpotId(cleanSpot.id);
    setMobileDrawerOpen(true);
    setPickedCoords(null);
    setActiveTab('map');
    setFocusTarget({ lat: cleanSpot.lat, lng: cleanSpot.lng, zoom: 16 });
  };

  const handleCreateEvent = async (payload: {
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
  }) => {
    const spotToken = payload.spotId ? reporterTokens[`spot:${payload.spotId}`] : undefined;
    const created = await api.createEvent({
      ...payload,
      spotReporterToken: spotToken,
    });
    if (created.reporterToken) {
      const token = created.reporterToken;
      setReporterTokens((prev) => ({
        ...prev,
        [`event:${created.id}`]: token,
        ...(created.spotId ? { [`spot:${created.spotId}`]: token } : {}),
      }));
      if (Array.isArray(created.volunteers)) {
        setUnlockedVolunteers((prev) => ({ ...prev, [created.id]: created.volunteers }));
      }
    }
    const sanitizedEvent: CleanupEvent = {
      ...created,
      volunteers: [],
      reporterToken: undefined,
    };
    setEvents((prev) => [...prev, sanitizedEvent].sort((a, b) => a.date.localeCompare(b.date)));
    if (created.spotId) {
      setSpots((prev) =>
        prev.map((s) =>
          s.id === created.spotId && s.status === 'needs_cleanup'
            ? { ...s, status: 'scheduled' }
            : s
        )
      );
    }
    setHighlightedEventId(created.id);
    setActiveTab('board');
  };

  const getReporterTokenForEvent = useCallback(
    (ev: CleanupEvent): string | undefined => {
      return (
        reporterTokens[`event:${ev.id}`] ||
        (ev.spotId ? reporterTokens[`spot:${ev.spotId}`] : undefined)
      );
    },
    [reporterTokens]
  );

  const handleRefreshEventVolunteers = useCallback(
    async (ev: CleanupEvent) => {
      const token = getReporterTokenForEvent(ev);
      if (!token) return;
      try {
        const res = await api.getEventVolunteers(ev.id, token);
        setUnlockedVolunteers((prev) => ({ ...prev, [ev.id]: res.volunteers }));
      } catch {
        // Ignore transient or expired token errors
      }
    },
    [getReporterTokenForEvent]
  );

  const handleRsvp = async (eventId: string, name: string, action: 'join' | 'leave') => {
    const updated = await api.rsvpEvent(eventId, name, action);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    if (getReporterTokenForEvent(updated)) {
      await handleRefreshEventVolunteers(updated);
    }
  };

  const handleUnlockEventVolunteers = useCallback(
    (ev: CleanupEvent, volunteers: EventVolunteer[], token: string) => {
      setReporterTokens((prev) => ({
        ...prev,
        [`event:${ev.id}`]: token,
        ...(ev.spotId ? { [`spot:${ev.spotId}`]: token } : {}),
      }));
      setUnlockedVolunteers((prev) => ({ ...prev, [ev.id]: volunteers }));
      setEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, reporterClaimed: true } : item))
      );
    },
    []
  );

  const handleLockEventVolunteers = useCallback((ev: CleanupEvent) => {
    setReporterTokens((prev) => {
      const next = { ...prev };
      delete next[`event:${ev.id}`];
      if (ev.spotId) delete next[`spot:${ev.spotId}`];
      return next;
    });
    setUnlockedVolunteers((prev) => {
      const next = { ...prev };
      delete next[ev.id];
      return next;
    });
  }, []);

  const handleAddComment = async (eventId: string, author: string, text: string) => {
    const updated = await api.addEventComment(eventId, author, text);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
  };

  const handleViewEventOnMap = (ev: CleanupEvent) => {
    setActiveTab('map');
    setMobileMapView('map');
    if (ev.spotId) {
      const linked = spots.find((s) => s.id === ev.spotId);
      if (linked) {
        handleSelectSpot(linked);
        return;
      }
    }
    setFocusTarget({ lat: ev.lat, lng: ev.lng, zoom: 16 });
  };

  return (
    <div className="h-dvh w-screen flex flex-col overflow-hidden bg-slate-50">
      <TopNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'board') setHighlightedEventId(null);
        }}
        onOpenReportModal={() => {
          setPickLocationMode(false);
          setReportModalOpen(true);
        }}
      />

      {loadError && (
        <div className="px-4 sm:px-6 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadData}
            className="font-semibold underline cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === 'map' && (
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Mobile Map / List Switcher (< lg) */}
          <div className="lg:hidden px-3 py-2 bg-white border-b border-slate-200 shrink-0">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMobileMapView('map')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mobileMapView === 'map'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMapView('list')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mobileMapView === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Spots List ({filteredSpots.length})</span>
              </button>
            </div>
          </div>

          <div
            className={`${
              mobileMapView === 'list' ? 'flex flex-1' : 'hidden'
            } lg:flex lg:flex-none lg:h-full min-h-0`}
          >
            <SpotListPanel
              spots={filteredSpots}
              selectedSpotId={selectedSpotId}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              provinceFilter={provinceFilter}
              cityFilter={cityFilter}
              suburbFilter={suburbFilter}
              provinceCounts={spotProvinceCounts}
              cityOptions={spotCityOptions}
              suburbOptions={spotSuburbOptions}
              onStatusFilterChange={setStatusFilter}
              onSearchChange={setSearchQuery}
              onChangeProvince={handleChangeProvince}
              onChangeCity={handleChangeCity}
              onChangeSuburb={handleChangeSuburb}
              onClearRegionFilter={handleClearRegionFilter}
              onSelectSpot={handleSelectSpot}
              onUpvoteSpot={handleUpvoteSpot}
              onOpenReportModal={() => setReportModalOpen(true)}
              searchedSuburbPin={searchedSuburbPin}
              onViewSearchedSuburbOnMap={() => setMobileMapView('map')}
              onReportAtSearchedSuburb={handleReportAtSearchedSuburb}
              loading={loading}
            />
          </div>

          <div
            className={`${
              mobileMapView === 'map' ? 'flex-1' : 'hidden'
            } lg:block lg:flex-1 min-h-0 h-full relative`}
          >
            <CleanupMap
              spots={filteredSpots}
              selectedSpotId={selectedSpotId}
              onSelectSpot={handleSelectSpot}
              route={route}
              userOrigin={userOrigin}
              pickLocationMode={pickLocationMode}
              pickedCoords={pickedCoords}
              onMapPickLocation={handleMapPickLocation}
              onCancelPickMode={() => {
                setPickLocationMode(false);
                setReportModalOpen(true);
              }}
              onLocateUser={handleLocateUser}
              focusTarget={focusTarget}
              searchedSuburbPin={searchedSuburbPin}
              onLocateSuburb={handleLocateSuburb}
              onReportAtSearchedSuburb={handleReportAtSearchedSuburb}
            />

            {/* Floating route card on mobile when viewing full map with active route */}
            {selectedSpot && route && !mobileDrawerOpen && (
              <div className="lg:hidden absolute bottom-3 inset-x-3 z-[460] bg-white border border-slate-200 rounded-xl shadow-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedSpot.title}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-emerald-700 font-medium mt-0.5">
                    {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoute(null)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedSpot && (
            <div
              className={`${
                mobileDrawerOpen ? 'fixed inset-0 z-50 flex' : 'hidden'
              } lg:static lg:inset-auto lg:z-auto lg:flex lg:h-full min-h-0`}
            >
              <SpotDetailDrawer
                spot={selectedSpot}
                linkedEvents={linkedEventsForSelectedSpot}
                route={route}
                routeLoading={routeLoading}
                routeError={routeError}
                onClose={() => {
                  setMobileDrawerOpen(false);
                  if (window.innerWidth >= 1024) {
                    setSelectedSpotId(null);
                    setRoute(null);
                    setRouteError(null);
                  }
                }}
                onViewRouteOnMap={() => {
                  setMobileDrawerOpen(false);
                  setMobileMapView('map');
                }}
                onUpvote={handleUpvoteSpot}
                onRequestRoute={handleRequestRoute}
                onClearRoute={() => setRoute(null)}
                onHostEventForSpot={(spot) => {
                  setEventPreselectSpot(spot);
                  setCreateEventOpen(true);
                }}
                onViewEventOnBoard={(eventId) => {
                  setMobileDrawerOpen(false);
                  setHighlightedEventId(eventId);
                  setActiveTab('board');
                }}
                onUpdateStatus={handleUpdateSpotStatus}
              />
            </div>
          )}
        </main>
      )}

      {activeTab === 'board' && (
        <CommunityBoard
          events={events}
          spots={spots}
          highlightedEventId={highlightedEventId}
          provinceFilter={provinceFilter}
          cityFilter={cityFilter}
          suburbFilter={suburbFilter}
          onChangeProvince={handleChangeProvince}
          onChangeCity={handleChangeCity}
          onChangeSuburb={handleChangeSuburb}
          onClearRegionFilter={handleClearRegionFilter}
          onOpenCreateEvent={() => {
            setEventPreselectSpot(null);
            setCreateEventOpen(true);
          }}
          onExploreMap={() => setActiveTab('map')}
          onViewOnMap={handleViewEventOnMap}
          onRsvp={handleRsvp}
          onAddComment={handleAddComment}
          reporterTokens={reporterTokens}
          unlockedVolunteers={unlockedVolunteers}
          onUnlockVolunteers={handleUnlockEventVolunteers}
          onLockVolunteers={handleLockEventVolunteers}
          onRefreshVolunteers={handleRefreshEventVolunteers}
        />
      )}

      {activeTab === 'impact' && (
        <ImpactLogView
          spots={spots}
          events={events}
          provinceFilter={provinceFilter}
          cityFilter={cityFilter}
          suburbFilter={suburbFilter}
          provinceCounts={spotProvinceCounts}
          cityOptions={spotCityOptions}
          suburbOptions={spotSuburbOptions}
          onChangeProvince={handleChangeProvince}
          onChangeCity={handleChangeCity}
          onChangeSuburb={handleChangeSuburb}
          onClearRegionFilter={handleClearRegionFilter}
          onInspectSpotOnMap={(spot) => {
            setActiveTab('map');
            setMobileMapView('map');
            handleSelectSpot(spot);
          }}
        />
      )}

      <ReportSpotModal
        isOpen={reportModalOpen}
        pickedCoords={pickedCoords}
        onClose={() => setReportModalOpen(false)}
        onStartMapPick={handleStartMapPick}
        onSubmitSpot={handleCreateSpot}
      />

      <CreateEventModal
        isOpen={createEventOpen}
        spots={spots}
        preselectedSpot={eventPreselectSpot}
        onClose={() => setCreateEventOpen(false)}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
}
