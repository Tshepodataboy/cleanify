import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { CleanupEvent, CleanupSpot, SpotStatus } from '../types';
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

interface ImpactLogViewProps {
  spots: CleanupSpot[];
  events: CleanupEvent[];
  provinceFilter: 'all' | SouthAfricanProvince;
  cityFilter: string;
  suburbFilter: string;
  provinceCounts: Partial<Record<SouthAfricanProvince, number>>;
  cityOptions: CityOption[];
  suburbOptions: SuburbOption[];
  onChangeProvince: (province: 'all' | SouthAfricanProvince) => void;
  onChangeCity: (city: string) => void;
  onChangeSuburb: (suburb: string) => void;
  onClearRegionFilter: () => void;
  onInspectSpotOnMap: (spot: CleanupSpot) => void;
}

export function ImpactLogView({
  spots,
  events,
  provinceFilter,
  cityFilter,
  suburbFilter,
  provinceCounts,
  cityOptions,
  suburbOptions,
  onChangeProvince,
  onChangeCity,
  onChangeSuburb,
  onClearRegionFilter,
  onInspectSpotOnMap,
}: ImpactLogViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | SpotStatus>('all');

  const regionSpots = useMemo(() => {
    return spots.filter((s) => {
      const loc = inferSouthAfricanLocation(s);
      if (provinceFilter !== 'all' && loc.province !== provinceFilter) {
        return false;
      }
      if (cityFilter !== 'all' && loc.city !== cityFilter) {
        return false;
      }
      if (suburbFilter !== 'all' && loc.suburb !== suburbFilter) {
        return false;
      }
      return true;
    });
  }, [spots, provinceFilter, cityFilter, suburbFilter]);

  const cleanedSpots = regionSpots.filter((s) => s.status === 'cleaned');
  const totalBags = cleanedSpots.reduce((sum, s) => sum + (s.bagsCollected || 0), 0);
  const totalVotes = regionSpots.reduce((sum, s) => sum + s.upvotes, 0);
  const totalVolunteers = events.reduce((sum, e) => sum + e.volunteers.length, 0);

  const visibleSpots =
    statusFilter === 'all' ? regionSpots : regionSpots.filter((s) => s.status === statusFilter);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              South Africa Impact Log
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track verified cleanups, before-and-after results, and priority sites across every
              South African province, city, and suburb.
            </p>
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
            align="right"
          />
        </div>

        {/* Summary Metrics Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Cleared Locations</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700">
              {cleanedSpots.length}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Total Bags Removed</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
              {totalBags}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Volunteer RSVPs</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
              {totalVolunteers}
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Community Votes</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
              {totalVotes}
            </p>
          </div>
        </section>

        {/* Before & After Showcase for Cleaned Spots */}
        {cleanedSpots.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Verified Restorations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cleanedSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{spot.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {spot.neighborhood} · {spot.bagsCollected || 0} bags collected ·{' '}
                        {spot.cleanedAt ? formatRelativeTime(spot.cleanedAt) : 'Recently'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectSpotOnMap(spot)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Map</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <ResilientImage src={spot.photoUrl} alt={`${spot.title} before`} />
                      </div>
                      <p className="text-xs text-slate-500">Before</p>
                    </div>
                    <div className="space-y-1">
                      <div className="aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <ResilientImage
                          src={spot.afterPhotoUrl || spot.photoUrl}
                          alt={`${spot.title} after`}
                        />
                      </div>
                      <p className="text-xs font-medium text-emerald-700">After Cleanup</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full Ledger Table */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              All Reported Sites
            </h2>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'needs_cleanup', label: 'Needs Cleanup' },
                  { id: 'scheduled', label: 'Scheduled' },
                  { id: 'cleaned', label: 'Cleaned' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-4">Suburb</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Votes</th>
                  <th className="py-3 px-4 text-right">Bags</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleSpots.map((spot) => {
                  const loc = inferSouthAfricanLocation(spot);
                  return (
                    <tr key={spot.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-medium text-slate-900">{spot.title}</td>
                      <td className="py-3 px-4 text-slate-600">{loc.suburb}</td>
                      <td className="py-3 px-4 text-slate-600">{loc.city}</td>
                      <td className="py-3 px-4 text-slate-600">{loc.province}</td>
                      <td className={`py-3 px-4 text-xs ${getStatusTextClass(spot.status)}`}>
                        {getStatusLabel(spot.status)}
                      </td>
                      <td className={`py-3 px-4 text-xs ${getPriorityTextClass(spot.priority)}`}>
                        {getPriorityLabel(spot.priority)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {spot.upvotes}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {typeof spot.bagsCollected === 'number' ? spot.bagsCollected : '—'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectSpotOnMap(spot)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                        >
                          View on Map
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
