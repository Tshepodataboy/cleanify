import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { SA_PROVINCES, type SouthAfricanProvince } from '../utils/southAfrica';

export interface CityOption {
  name: string;
  province: SouthAfricanProvince;
  count: number;
}

export interface SuburbOption {
  name: string;
  city: string;
  province: SouthAfricanProvince;
  count: number;
}

interface ProvinceLocationFilterProps {
  selectedProvince: 'all' | SouthAfricanProvince;
  selectedCity: string;
  selectedSuburb: string;
  provinceCounts: Partial<Record<SouthAfricanProvince, number>>;
  cityOptions: CityOption[];
  suburbOptions: SuburbOption[];
  onChangeProvince: (province: 'all' | SouthAfricanProvince) => void;
  onChangeCity: (city: string) => void;
  onChangeSuburb: (suburb: string) => void;
  onClearAll: () => void;
  align?: 'left' | 'right';
}

export function ProvinceLocationFilter({
  selectedProvince,
  selectedCity,
  selectedSuburb,
  provinceCounts,
  cityOptions,
  suburbOptions,
  onChangeProvince,
  onChangeCity,
  onChangeSuburb,
  onClearAll,
  align = 'left',
}: ProvinceLocationFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const hasActiveFilter =
    selectedProvince !== 'all' || selectedCity !== 'all' || selectedSuburb !== 'all';

  const visibleCities =
    selectedProvince === 'all'
      ? cityOptions
      : cityOptions.filter((c) => c.province === selectedProvince);

  const visibleSuburbs = suburbOptions.filter((s) => {
    if (selectedProvince !== 'all' && s.province !== selectedProvince) return false;
    if (selectedCity !== 'all' && s.city !== selectedCity) return false;
    return true;
  });

  const activeParts: string[] = [];
  if (selectedProvince !== 'all') activeParts.push(selectedProvince);
  if (selectedCity !== 'all') activeParts.push(selectedCity);
  if (selectedSuburb !== 'all' && selectedSuburb !== selectedCity) {
    activeParts.push(selectedSuburb);
  }
  const buttonText =
    activeParts.length > 0 ? activeParts.join(' · ') : 'Filter: Province · City · Suburb';

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5 max-w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer max-w-[290px] ${
          hasActiveFilter
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{buttonText}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClearAll}
          title="Reset province, city, and suburb filter"
          aria-label="Reset province, city, and suburb filter"
          className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/35 sm:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Filter by South African province, city, and suburb"
            className={`fixed inset-x-3 bottom-3 z-50 sm:inset-auto sm:top-full sm:mt-2 sm:w-[376px] bg-white border border-slate-200 rounded-xl shadow-2xl sm:shadow-xl overflow-hidden ${
              align === 'right' ? 'sm:right-0' : 'sm:left-0'
            }`}
          >
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                South Africa Location Filter
              </p>
              <p className="text-[11px] text-slate-500">
                Filter by province, city, and suburb
              </p>
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 max-h-[min(60vh,460px)] overflow-y-auto">
            {/* 1. Province */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">1. Province</span>
                <button
                  type="button"
                  onClick={() => onChangeProvince('all')}
                  className={`text-xs font-medium cursor-pointer ${
                    selectedProvince === 'all'
                      ? 'text-emerald-700 font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Provinces
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {SA_PROVINCES.map((prov) => {
                  const active = selectedProvince === prov.id;
                  const count = provinceCounts[prov.id] || 0;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => onChangeProvince(active ? 'all' : prov.id)}
                      className={`px-2.5 py-2 text-left rounded-lg border text-xs transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                          : count > 0
                          ? 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          : 'bg-slate-50/70 text-slate-500 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{prov.name}</span>
                      <span
                        className={`font-mono tabular-nums text-[11px] shrink-0 ${
                          active ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. City */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>2. City / Metro</span>
                </span>
                {selectedCity !== 'all' && (
                  <button
                    type="button"
                    onClick={() => onChangeCity('all')}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    All cities
                  </button>
                )}
              </div>

              {visibleCities.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">
                  No reported cities in {selectedProvince} yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeCity('all')}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                      selectedCity === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All Cities
                  </button>
                  {visibleCities.map((city) => {
                    const active = selectedCity === city.name;
                    return (
                      <button
                        key={`${city.province}-${city.name}`}
                        type="button"
                        onClick={() => onChangeCity(active ? 'all' : city.name)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{city.name}</span>
                        <span
                          className={`font-mono tabular-nums text-[11px] ${
                            active ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {city.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Suburb */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>3. Suburb / Area</span>
                </span>
                {selectedSuburb !== 'all' && (
                  <button
                    type="button"
                    onClick={() => onChangeSuburb('all')}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    All suburbs
                  </button>
                )}
              </div>

              {visibleSuburbs.length === 0 ? (
                <p className="text-xs text-slate-500 py-1">
                  No reported suburbs match this selection yet.
                </p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    onClick={() => onChangeSuburb('all')}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      selectedSuburb === 'all'
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>
                      {selectedCity !== 'all'
                        ? `All Suburbs in ${selectedCity}`
                        : selectedProvince !== 'all'
                        ? `All Suburbs in ${selectedProvince}`
                        : 'All Suburbs'}
                    </span>
                    {selectedSuburb === 'all' && (
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                    )}
                  </button>

                  {visibleSuburbs.map((sub) => {
                    const active = selectedSuburb === sub.name;
                    return (
                      <button
                        key={`${sub.province}-${sub.city}-${sub.name}`}
                        type="button"
                        onClick={() => onChangeSuburb(active ? 'all' : sub.name)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">
                          {sub.name}
                          {selectedCity === 'all' && sub.city !== sub.name ? (
                            <span className="text-slate-400 font-normal"> · {sub.city}</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-mono tabular-nums text-[11px] text-slate-400">
                            {sub.count}
                          </span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 truncate">
              {hasActiveFilter ? activeParts.join(' · ') : 'Showing all 9 provinces'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              Done
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
