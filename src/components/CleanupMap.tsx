import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Layers, LocateFixed, MapPin, Plus, Search, X } from 'lucide-react';
import type { CleanupSpot, GeocodeResult, RouteResult } from '../types';
import { api } from '../api/client';

export interface SearchedSuburbPin {
  lat: number;
  lng: number;
  label: string;
  displayName: string;
}

interface CleanupMapProps {
  spots: CleanupSpot[];
  selectedSpotId: string | null;
  onSelectSpot: (spot: CleanupSpot) => void;
  route: RouteResult | null;
  userOrigin: { lat: number; lng: number } | null;
  pickLocationMode: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  onMapPickLocation: (lat: number, lng: number) => void;
  onCancelPickMode: () => void;
  onLocateUser: () => void;
  focusTarget: { lat: number; lng: number; zoom?: number } | null;
  searchedSuburbPin?: SearchedSuburbPin | null;
  onLocateSuburb?: (loc: SearchedSuburbPin | null) => void;
  onReportAtSearchedSuburb?: (loc: SearchedSuburbPin) => void;
}

function getPinColor(spot: CleanupSpot): string {
  if (spot.status === 'cleaned') return '#15803D';
  if (spot.status === 'scheduled') return '#0284C7';
  if (spot.priority === 'high') return '#DC2626';
  return '#D97706';
}

function createSpotIcon(spot: CleanupSpot, isSelected: boolean): L.DivIcon {
  const color = getPinColor(spot);
  const scale = isSelected ? 1.22 : 1;
  const ring = isSelected
    ? `<circle cx="16" cy="15" r="14" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-opacity="0.35" />`
    : '';

  const html = `
    <div style="transform: scale(${scale}); transform-origin: 50% 100%; transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1);">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${ring}
        <path d="M16 38C16 38 28 24.8 28 15C28 8.37258 22.6274 3 16 3C9.37258 3 4 8.37258 4 15C4 24.8 16 38 16 38Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.2"/>
        <circle cx="16" cy="15" r="4.8" fill="#FFFFFF"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'cleancommons-pin',
    html,
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    tooltipAnchor: [0, -34],
  });
}

export function CleanupMap({
  spots,
  selectedSpotId,
  onSelectSpot,
  route,
  userOrigin,
  pickLocationMode,
  pickedCoords,
  onMapPickLocation,
  onCancelPickMode,
  onLocateUser,
  focusTarget,
  searchedSuburbPin = null,
  onLocateSuburb,
  onReportAtSearchedSuburb,
}: CleanupMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const suburbLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedLayerRef = useRef<L.LayerGroup | null>(null);
  const pickModeRef = useRef(pickLocationMode);
  const onPickRef = useRef(onMapPickLocation);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const [tileMode, setTileMode] = useState<'street' | 'osm' | 'topo'>('street');
  const [suburbInput, setSuburbInput] = useState('');
  const [suburbSuggestions, setSuburbSuggestions] = useState<SearchedSuburbPin[]>([]);
  const [searchingSuburb, setSearchingSuburb] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  pickModeRef.current = pickLocationMode;
  onPickRef.current = onMapPickLocation;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-29.0, 24.8],
      zoom: 6,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    suburbLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    pickedLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickModeRef.current) {
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    // Ensure Leaflet recalculates viewport dimensions after initial flex layout settles
    const rafId = requestAnimationFrame(() => map.invalidateSize());
    const timerId = window.setTimeout(() => map.invalidateSize(), 180);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch tile layer and fallback to OSM Humanitarian if primary street tiles fail
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let nextLayer: L.TileLayer;
    if (tileMode === 'topo') {
      nextLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
          maxZoom: 19,
        }
      );
    } else if (tileMode === 'osm') {
      nextLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
        maxZoom: 19,
      });
    } else {
      nextLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors',
          maxZoom: 19,
        }
      );
      let errorCount = 0;
      nextLayer.on('tileerror', () => {
        errorCount += 1;
        if (errorCount >= 3) {
          setTileMode('osm');
        }
      });
    }

    nextLayer.addTo(map);
    tileLayerRef.current = nextLayer;
  }, [tileMode]);

  // Cursor hint when picking location
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = pickLocationMode ? 'crosshair' : '';
  }, [pickLocationMode]);

  // Render cleanup spot markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    spots.forEach((spot) => {
      const isSelected = spot.id === selectedSpotId;
      const marker = L.marker([spot.lat, spot.lng], {
        icon: createSpotIcon(spot, isSelected),
        zIndexOffset: isSelected ? 500 : 0,
      });

      const tooltipEl = document.createElement('div');
      tooltipEl.style.fontFamily = "'DM Sans', sans-serif";
      tooltipEl.style.padding = '2px 4px';

      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '600';
      titleEl.style.fontSize = '12px';
      titleEl.style.color = '#0f172a';
      titleEl.textContent = spot.title;

      const hoodEl = document.createElement('div');
      hoodEl.style.fontSize = '11px';
      hoodEl.style.color = '#475569';
      hoodEl.textContent = spot.neighborhood;

      tooltipEl.appendChild(titleEl);
      tooltipEl.appendChild(hoodEl);

      marker.bindTooltip(tooltipEl, { direction: 'top', opacity: 0.96 });

      marker.on('click', () => {
        if (!pickModeRef.current) {
          onSelectSpot(spot);
        }
      });

      marker.addTo(layer);
    });
  }, [spots, selectedSpotId, onSelectSpot]);

  // Render picked pin marker
  useEffect(() => {
    const layer = pickedLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!pickedCoords) return;

    const icon = L.divIcon({
      className: 'cleancommons-pin',
      html: `
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 40C17 40 30 26.2 30 16C30 8.8203 24.1797 3 17 3C9.8203 3 4 8.8203 4 16C4 26.2 17 40 17 40Z" fill="#0F172A" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="17" cy="16" r="5" fill="#34D399"/>
        </svg>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
    });

    L.marker([pickedCoords.lat, pickedCoords.lng], { icon }).addTo(layer);
  }, [pickedCoords]);

  // Render active FreeRoute (OSRM) polyline & origin marker
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (userOrigin) {
      L.circleMarker([userOrigin.lat, userOrigin.lng], {
        radius: 7,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#0F172A',
        fillOpacity: 1,
      })
        .bindTooltip('Your starting location', { direction: 'top' })
        .addTo(layer);
    }

    if (route && route.coordinates.length >= 2) {
      // Soft halo under polyline for crisp cartographic contrast
      L.polyline(route.coordinates, {
        color: '#FFFFFF',
        weight: 7,
        opacity: 0.85,
      }).addTo(layer);

      const line = L.polyline(route.coordinates, {
        color: '#15803D',
        weight: 4,
        opacity: 0.95,
        dashArray: route.isFallback ? '6 6' : undefined,
      }).addTo(layer);

      map.fitBounds(line.getBounds(), { padding: [48, 48], maxZoom: 16 });
    }
  }, [route, userOrigin]);

  // Render searched suburb focus area & marker on the map
  useEffect(() => {
    const layer = suburbLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!searchedSuburbPin) return;

    L.circle([searchedSuburbPin.lat, searchedSuburbPin.lng], {
      radius: 650,
      color: '#3D634A',
      weight: 2,
      dashArray: '6 5',
      fillColor: '#3D634A',
      fillOpacity: 0.12,
    }).addTo(layer);

    const icon = L.divIcon({
      className: 'cleancommons-pin',
      html: `
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 40C17 40 30 26.2 30 16C30 8.8203 24.1797 3 17 3C9.8203 3 4 8.8203 4 16C4 26.2 17 40 17 40Z" fill="#3D634A" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="17" cy="16" r="5" fill="#F2F0C9"/>
        </svg>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      tooltipAnchor: [0, -34],
    });

    const marker = L.marker([searchedSuburbPin.lat, searchedSuburbPin.lng], {
      icon,
      zIndexOffset: 450,
    });
    marker.bindTooltip(searchedSuburbPin.label, {
      permanent: true,
      direction: 'top',
      opacity: 0.96,
    });
    marker.addTo(layer);
  }, [searchedSuburbPin]);

  // Close suburb dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  // Debounced live suburb autocomplete suggestions
  useEffect(() => {
    const q = suburbInput.trim();
    if (q.length < 2) {
      setSuburbSuggestions([]);
      setSearchingSuburb(false);
      return;
    }

    const qLower = q.toLowerCase();
    const localMatches: SearchedSuburbPin[] = [];
    const seenLabels = new Set<string>();
    for (const s of spots) {
      const hay = `${s.neighborhood} ${s.address} ${s.title}`.toLowerCase();
      if (hay.includes(qLower) && !seenLabels.has(s.neighborhood.toLowerCase())) {
        seenLabels.add(s.neighborhood.toLowerCase());
        localMatches.push({
          lat: s.lat,
          lng: s.lng,
          label: s.neighborhood,
          displayName: `${s.neighborhood} — ${s.title}`,
        });
      }
    }
    setSuburbSuggestions(localMatches.slice(0, 4));

    let cancelled = false;
    setSearchingSuburb(true);
    const timer = window.setTimeout(async () => {
      try {
        const remote: GeocodeResult[] = await api.searchAddress(q);
        if (cancelled) return;
        const remotePins: SearchedSuburbPin[] = remote.map((r) => ({
          lat: r.lat,
          lng: r.lng,
          label: r.neighborhood && r.neighborhood !== 'Local Area' ? r.neighborhood : q,
          displayName: r.displayName,
        }));
        const merged = [...localMatches];
        for (const pin of remotePins) {
          if (
            !merged.some(
              (m) =>
                Math.abs(m.lat - pin.lat) < 0.005 && Math.abs(m.lng - pin.lng) < 0.005
            )
          ) {
            merged.push(pin);
          }
        }
        setSuburbSuggestions(merged.slice(0, 6));
      } catch {
        // Keep local matches on geocode failure
      } finally {
        if (!cancelled) setSearchingSuburb(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [suburbInput, spots]);

  // Pan map when focusTarget changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 15, {
      duration: 0.55,
    });
  }, [focusTarget]);

  const handleSelectSuburbPin = (pin: SearchedSuburbPin) => {
    setSuburbInput(pin.label);
    setDropdownOpen(false);
    onLocateSuburb?.(pin);
    mapRef.current?.flyTo([pin.lat, pin.lng], 14, { duration: 0.55 });
  };

  const handleSubmitSuburbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = suburbInput.trim();
    if (q.length < 2) return;

    if (suburbSuggestions.length > 0) {
      handleSelectSuburbPin(suburbSuggestions[0]);
      return;
    }

    setSearchingSuburb(true);
    try {
      const results = await api.searchAddress(q);
      if (results.length > 0) {
        const first = results[0];
        handleSelectSuburbPin({
          lat: first.lat,
          lng: first.lng,
          label: first.neighborhood && first.neighborhood !== 'Local Area' ? first.neighborhood : q,
          displayName: first.displayName,
        });
      }
    } finally {
      setSearchingSuburb(false);
    }
  };

  const handleFitAllSpots = () => {
    const map = mapRef.current;
    if (!map || spots.length === 0) return;
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  };

  const cycleTileMode = () => {
    setTileMode((prev) =>
      prev === 'street' ? 'osm' : prev === 'osm' ? 'topo' : 'street'
    );
  };

  const tileLabel =
    tileMode === 'street'
      ? 'Street Map'
      : tileMode === 'osm'
      ? 'OpenStreetMap'
      : 'Satellite';

  return (
    <div className="relative w-full h-full min-h-[320px] bg-slate-200 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top map overlay: Suburb Search (left) + Map Controls (right) */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 z-[450] flex flex-col md:flex-row md:items-start md:justify-between gap-2 pointer-events-none">
        {/* Suburb search bar on map */}
        <div ref={searchBoxRef} className="relative w-full md:w-80 pointer-events-auto">
          <form
            onSubmit={handleSubmitSuburbSearch}
            className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden focus-within:border-[#3D634A]"
          >
            <Search
              className="w-4 h-4 text-slate-400 ml-3 shrink-0 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={suburbInput}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                const val = e.target.value;
                setSuburbInput(val);
                setDropdownOpen(true);
                if (!val.trim() && searchedSuburbPin) {
                  onLocateSuburb?.(null);
                }
              }}
              placeholder="Type a suburb to show on map..."
              aria-label="Type a suburb to show on map"
              className="flex-1 min-w-0 px-2.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
            />
            {(suburbInput || searchedSuburbPin) && (
              <button
                type="button"
                onClick={() => {
                  setSuburbInput('');
                  setSuburbSuggestions([]);
                  setDropdownOpen(false);
                  onLocateSuburb?.(null);
                }}
                aria-label="Clear suburb search"
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              disabled={searchingSuburb || suburbInput.trim().length < 2}
              className="px-3 py-2 text-xs font-semibold bg-[#3D634A] hover:bg-[#32523D] disabled:opacity-50 text-white cursor-pointer shrink-0 transition-colors"
            >
              {searchingSuburb ? '...' : 'Go'}
            </button>
          </form>

          {dropdownOpen && suburbInput.trim().length >= 2 && (
            <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
              {suburbSuggestions.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-500">
                  {searchingSuburb
                    ? 'Searching South African suburbs...'
                    : 'No matching suburb found — press Go to retry'}
                </div>
              ) : (
                suburbSuggestions.map((item, idx) => (
                  <button
                    key={`${item.lat}-${item.lng}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSuburbPin(item)}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin
                      className="w-3.5 h-3.5 text-[#3D634A] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.label}</p>
                      <p className="text-[11px] text-slate-500 truncate">{item.displayName}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {searchedSuburbPin && !dropdownOpen && (
            <div className="mt-1.5 bg-white/95 backdrop-blur-xs border border-[#3D634A]/25 rounded-xl shadow-sm px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {searchedSuburbPin.label}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {searchedSuburbPin.displayName}
                </p>
              </div>
              {onReportAtSearchedSuburb && (
                <button
                  type="button"
                  onClick={() => onReportAtSearchedSuburb(searchedSuburbPin)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#3D634A] hover:bg-[#32523D] rounded-lg shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  <span>Report Here</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Map layer, locate & fit controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 pointer-events-auto self-end md:self-auto">
          <button
            type="button"
            onClick={cycleTileMode}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Switch map layer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>{tileLabel}</span>
          </button>

          <button
            type="button"
            onClick={onLocateUser}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Use my current location"
          >
            <LocateFixed className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">My Location</span>
          </button>

          <button
            type="button"
            onClick={handleFitAllSpots}
            className="flex items-center gap-1.5 px-2.5 py-2 sm:px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Fit all reported spots in view"
            aria-label="Fit all reported spots in view"
          >
            <Crosshair className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span className="hidden sm:inline">Fit Spots</span>
          </button>
        </div>
      </div>

      {/* Compact legend at bottom left */}
      <div className="absolute bottom-4 left-4 z-[450] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-sm hidden sm:flex items-center gap-4 text-xs text-slate-700">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" aria-hidden="true" />
          High Priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" aria-hidden="true" />
          Needs Cleanup
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" aria-hidden="true" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" aria-hidden="true" />
          Cleaned
        </span>
      </div>

      {/* Interactive Pick Location Banner */}
      {pickLocationMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[460] bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-4 text-sm max-w-[92vw]">
          <span className="font-medium truncate">
            Click anywhere on the map to place the cleanup pin
          </span>
          <button
            type="button"
            onClick={onCancelPickMode}
            className="flex items-center gap-1 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}
