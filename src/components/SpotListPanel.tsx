import { Search, ThumbsUp } from 'lucide-react';
import type { CleanupSpot, SpotStatus } from '../types';
import { ResilientImage } from './ResilientImage';
import {
  ProvinceLocationFilter,
  type CityOption,
  type SuburbOption,
} from './ProvinceLocationFilter';
import { inferSouthAfricanLocation, type SouthAfricanProvince } from '../utils/southAfrica';
import {
  formatRelativeTime,
  getPriorityLabel,
  getPriorityTextClass,
  getStatusLabel,
  getStatusTextClass,
} from '../utils/formatters';

interface SpotListPanelProps {
  spots: CleanupSpot[];
  selectedSpotId: string | null;
  statusFilter: 'all' | SpotStatus;
  searchQuery: string;
  provinceFilter: 'all' | SouthAfricanProvince;
  cityFilter: string;
  suburbFilter: string;
  provinceCounts: Partial<Record<SouthAfricanProvince, number>>;
  cityOptions: CityOption[];
  suburbOptions: SuburbOption[];
  onStatusFilterChange: (filter: 'all' | SpotStatus) => void;
  onSearchChange: (q: string) => void;
  onChangeProvince: (province: 'all' | SouthAfricanProvince) => void;
  onChangeCity: (city: string) => void;
  onChangeSuburb: (suburb: string) => void;
  onClearRegionFilter: () => void;
  onSelectSpot: (spot: CleanupSpot) => void;
  onUpvoteSpot: (spotId: string) => void;
  onOpenReportModal: () => void;
  loading: boolean;
}

export function SpotListPanel({
  spots,
  selectedSpotId,
  statusFilter,
  searchQuery,
  provinceFilter,
  cityFilter,
  suburbFilter,
  provinceCounts,
  cityOptions,
  suburbOptions,
  onStatusFilterChange,
  onSearchChange,
  onChangeProvince,
  onChangeCity,
  onChangeSuburb,
  onClearRegionFilter,
  onSelectSpot,
  onUpvoteSpot,
  onOpenReportModal,
  loading,
}: SpotListPanelProps) {
  const filters: { id: 'all' | SpotStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'needs_cleanup', label: 'Open' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'cleaned', label: 'Cleaned' },
  ];

  return (
    <aside className="w-full lg:w-[400px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="font-display text-base font-semibold text-slate-900">
            Reported Areas
          </h1>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {spots.length} {spots.length === 1 ? 'site' : 'sites'}
          </span>
        </div>

        {/* Live search */}
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search street, suburb, city, waste..."
            aria-label="Search reported areas"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-700 transition-colors"
          />
        </div>

        {/* Province, City & Suburb Filter Button */}
        <div className="flex items-center justify-between gap-2">
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

        {/* Segmented status filter */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          {filters.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onStatusFilterChange(f.id)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable spots list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex gap-3 animate-pulse">
                <div className="w-24 h-20 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : spots.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">No cleanup spots match this filter</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Clear your province, location, or search filter, or report a new litter hotspot with a photo and map pin.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(provinceFilter !== 'all' ||
                cityFilter !== 'all' ||
                suburbFilter !== 'all' ||
                statusFilter !== 'all' ||
                searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    onClearRegionFilter();
                    onStatusFilterChange('all');
                    onSearchChange('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                onClick={onOpenReportModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                Report New Spot
              </button>
            </div>
          </div>
        ) : (
          spots.map((spot) => {
            const isSelected = spot.id === selectedSpotId;
            return (
              <div
                key={spot.id}
                onClick={() => onSelectSpot(spot)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSpot(spot);
                  }
                }}
                className={`p-4 flex gap-3.5 transition-colors cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-700 ${
                  isSelected ? 'bg-emerald-50/60' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-24 h-[72px] rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                  <ResilientImage
                    src={spot.status === 'cleaned' && spot.afterPhotoUrl ? spot.afterPhotoUrl : spot.photoUrl}
                    alt={spot.title}
                    fallbackLabel={spot.neighborhood}
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 truncate">
                        {spot.title}
                      </h2>
                    </div>

                    {/* Zero-pill unboxed metadata */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                      <span className={getStatusTextClass(spot.status)}>
                        {getStatusLabel(spot.status)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={getPriorityTextClass(spot.priority)}>
                        {getPriorityLabel(spot.priority)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{spot.neighborhood}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400 truncate">
                        {inferSouthAfricanLocation(spot).province}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      {spot.wasteTypes.slice(0, 2).join(', ')} · {formatRelativeTime(spot.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpvoteSpot(spot.id);
                      }}
                      aria-label={`Support priority for ${spot.title} (${spot.upvotes} votes)`}
                      className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600 hover:text-emerald-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{spot.upvotes}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
