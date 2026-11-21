import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CleanupSpot } from '../types';

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

    setSubmitting(true);
    try {
      await onCreateEvent({
        spotId: spotId || undefined,
        title: title.trim(),
        description: description.trim(),
        locationName: locationName.trim() || 'Neighborhood Park',
        meetingPoint: meetingPoint.trim() || 'Main trail entrance',
        lat,
        lng,
        date,
        startTime,
        durationHours: Math.max(0.5, Number(durationHours) || 2),
        organizer: host,
        suppliesProvided: supplies,
        maxVolunteers: Math.max(2, Number(maxVolunteers) || 15),
        bannerUrl: linkedSpot?.photoUrl,
      });
      setTitle('');
      setDescription('');
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
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-heading"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
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
                Neighborhood / Park
              </label>
              <input
                id="event-neighborhood"
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Emmarentia, Johannesburg"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="event-organizer" className="block text-xs font-semibold text-slate-800 mb-1">
                Organizer Name
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
