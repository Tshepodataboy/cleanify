import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Layers, LocateFixed, X } from 'lucide-react';
import type { CleanupSpot, RouteResult } from '../types';

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
}: CleanupMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedLayerRef = useRef<L.LayerGroup | null>(null);
  const pickModeRef = useRef(pickLocationMode);
  const onPickRef = useRef(onMapPickLocation);
  const [tileMode, setTileMode] = useState<'street' | 'osm' | 'topo'>('street');

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

  // Pan map when focusTarget changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 15, {
      duration: 0.55,
    });
  }, [focusTarget]);

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

      {/* Top map controls */}
      <div className="absolute top-4 right-4 z-[450] flex items-center gap-2">
        <button
          type="button"
          onClick={cycleTileMode}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          title="Switch map layer"
        >
          <Layers className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          <span>{tileLabel}</span>
        </button>

        <button
          type="button"
          onClick={onLocateUser}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          title="Use my current location"
        >
          <LocateFixed className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
          <span>My Location</span>
        </button>

        <button
          type="button"
          onClick={handleFitAllSpots}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          title="Fit all reported spots in view"
        >
          <Crosshair className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          <span>Fit Spots</span>
        </button>
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
