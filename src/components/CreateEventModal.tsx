import { useEffect, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import type { CleanupSpot, GeocodeResult } from '../types';
import { api } from '../api/client';

const SUPPLIES = [
  'Heavy-Duty Bags',
  'Work Gloves',
  'Litter Grabbers',
  'First Aid Kit',
  'Refreshments',
];

interface CreateEventModalProps {
  isOpen: boolean;
  spots: CleanupSpot[];
  preselectedSpot: CleanupSpot | null;
  onClose: () => void;
  onCreateEvent: (payload: {
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
  }) => Promise<void>;
}

export function CreateEventModal({
  isOpen,
  spots,
  preselectedSpot,
  onClose,
  onCreateEvent,
}: CreateEventModalProps) {
  const defaultDate = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

  const [spotId, setSpotId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [lat, setLat] = useState(-26.1538);
  const [lng, setLng] = useState(28.0074);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:30');
  const [durationHours, setDurationHours] = useState('2');
  const [maxVolunteers, setMaxVolunteers] = useState('15');
  const [organizer, setOrganizer] = useState(() => {
    try {
      return localStorage.getItem('cleancommons_name') || '';
    } catch {
      return '';
    }
  });
  const [supplies, setSupplies] = useState<string[]>(['Heavy-Duty Bags', 'Work Gloves']);
  const [reporterPasscode, setReporterPasscode] = useState('');
  const [geoMatches, setGeoMatches] = useState<GeocodeResult[]>([]);
  const [locatingSuburb, setLocatingSuburb] = useState(false);
  const [coordsPinnedLabel, setCoordsPinnedLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedSpot) {
      setSpotId(preselectedSpot.id);
      setTitle(`${preselectedSpot.neighborhood} Community Cleanup`);
      setLocationName(preselectedSpot.neighborhood);
      setMeetingPoint(`Near ${preselectedSpot.address}`);
      setLat(preselectedSpot.lat);
      setLng(preselectedSpot.lng);
    } else {
      setSpotId('');
    }
  }, [isOpen, preselectedSpot]);

  if (!isOpen) return null;

  const handleSelectSpot = (id: string) => {
    setSpotId(id);
    const match = spots.find((s) => s.id === id);
    if (match) {
      setLocationName(match.neighborhood);
      setMeetingPoint(`Near ${match.address}`);
      setLat(match.lat);
      setLng(match.lng);
      if (!title.trim()) {
        setTitle(`${match.neighborhood} Volunteer Cleanup`);
      }
    }
  };

  const toggleSupply = (item: string) => {
    setSupplies((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const handleLocateSuburb = async () => {
    const q = locationName.trim();
    if (q.length < 2) return;
    setLocatingSuburb(true);
    try {
      const results = await api.searchAddress(q);
      setGeoMatches(results);
      if (results.length > 0) {
        setLat(results[0].lat);
        setLng(results[0].lng);
        setCoordsPinnedLabel(results[0].displayName);
      }
    } catch {
      setGeoMatches([]);
    } finally {
      setLocatingSuburb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !date) {
      setError('Event title and date are required.');
      return;
    }

    const host = organizer.trim() || 'Neighborhood Host';
    try {
      localStorage.setItem('cleancommons_name', host);
    } catch {
      // Ignore storage errors
    }

    const linkedSpot = spots.find((s) => s.id === spotId);

    let resolvedLat = lat;
    let resolvedLng = lng;
    if (!spotId && locationName.trim().length >= 2 && !coordsPinnedLabel) {
      try {
        const matches = await api.searchAddress(locationName.trim());
        if (matches.length > 0) {
          resolvedLat = matches[0].lat;
          resolvedLng = matches[0].lng;
        }
      } catch {
        // Keep existing coordinates if geocode fails
      }
    }

    const trimmedPasscode = reporterPasscode.trim();
    if (trimmedPasscode && trimmedPasscode.length < 4) {
      setError('Private passcode must be at least 4 characters (or leave blank to claim later).');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateEvent({
        spotId: spotId || undefined,
        title: title.trim(),
        description: description.trim(),
        locationName: locationName.trim() || 'Neighborhood Park',
        meetingPoint: meetingPoint.trim() || 'Main trail entrance',
        lat: resolvedLat,
        lng: resolvedLng,
        date,
        startTime,
        durationHours: Math.max(0.5, Number(durationHours) || 2),
        organizer: host,
        suppliesProvided: supplies,
        maxVolunteers: Math.max(2, Number(maxVolunteers) || 15),
        bannerUrl: linkedSpot?.photoUrl,
        reporterPasscode: trimmedPasscode || undefined,
      });
      setTitle('');
      setDescription('');
      setReporterPasscode('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post event.');
    } finally {
      setSubmitting(false);
    }
  };

  const openSpots = spots.filter((s) => s.status !== 'cleaned');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-heading"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="create-event-heading" className="font-display text-lg font-semibold text-slate-900">
              Post Local Cleanup Event
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Invite neighbors on the community board and coordinate supplies.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="event-spot" className="block text-xs font-semibold text-slate-800 mb-1">
              Link to Reported Map Spot (optional)
            </label>
            <select
              id="event-spot"
              value={spotId}
              onChange={(e) => handleSelectSpot(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
            >
              <option value="">General neighborhood cleanup</option>
              {openSpots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.neighborhood}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="event-title" className="block text-xs font-semibold text-slate-800 mb-1">
              Event Title
            </label>
            <input
              id="event-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunday Riverbank Restoration Sweep"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-neighborhood" className="block text-xs font-semibold text-slate-800 mb-1">
                Suburb / Neighborhood
              </label>
              <div className="flex gap-1.5">
                <input
                  id="event-neighborhood"
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    setCoordsPinnedLabel('');
                  }}
                  placeholder="Emmarentia, Johannesburg"
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={handleLocateSuburb}
                  disabled={locatingSuburb || locationName.trim().length < 2}
                  title="Find suburb on map"
                  className="px-2.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{locatingSuburb ? '...' : 'Pin'}</span>
                </button>
              </div>
              {coordsPinnedLabel && (
                <p className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{coordsPinnedLabel}</span>
                </p>
              )}
              {geoMatches.length > 1 && (
                <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-28 overflow-y-auto bg-white">
                  {geoMatches.slice(0, 4).map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setLat(m.lat);
                        setLng(m.lng);
                        setLocationName(
                          m.neighborhood && m.neighborhood !== 'Local Area'
                            ? m.neighborhood
                            : locationName
                        );
                        setCoordsPinnedLabel(m.displayName);
                        setGeoMatches([]);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50 truncate cursor-pointer"
                    >
                      {m.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="event-organizer" className="block text-xs font-semibold text-slate-800 mb-1">
                Organizer / Reporter Name
              </label>
              <input
                id="event-organizer"
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="Thabo Mokoena"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="event-reporter-passcode"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Private Roster Passcode (volunteer names stay hidden from public visitors)
              </label>
              <input
                id="event-reporter-passcode"
                type="password"
                autoComplete="new-password"
                maxLength={100}
                value={reporterPasscode}
                onChange={(e) => setReporterPasscode(e.target.value)}
                placeholder="4+ characters to keep volunteer roster private to you"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-meeting" className="block text-xs font-semibold text-slate-800 mb-1">
              Exact Meeting Point
            </label>
            <input
              id="event-meeting"
              type="text"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="Meet by the south trailhead kiosk"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="event-date" className="block text-xs font-semibold text-slate-800 mb-1">
                Date
              </label>
              <input
                id="event-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="event-time" className="block text-xs font-semibold text-slate-800 mb-1">
                Start Time
              </label>
              <input
                id="event-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="event-duration" className="block text-xs font-semibold text-slate-800 mb-1">
                Hours
              </label>
              <input
                id="event-duration"
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="event-cap" className="block text-xs font-semibold text-slate-800 mb-1">
                Max Crew
              </label>
              <input
                id="event-cap"
                type="number"
                min="2"
                max="200"
                value={maxVolunteers}
                onChange={(e) => setMaxVolunteers(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-desc" className="block text-xs font-semibold text-slate-800 mb-1">
              Plan & What to Bring
            </label>
            <textarea
              id="event-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share target zone, footwear recommendations, and waste drop-off details..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700 resize-none"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-800 mb-1.5">
              Supplies Provided
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUPPLIES.map((item) => {
                const active = supplies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleSupply(item)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Posting...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
