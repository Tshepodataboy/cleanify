import { useEffect, useState } from 'react';
import { Camera, LocateFixed, MapPin, Search, X } from 'lucide-react';
import type { GeocodeResult, SpotPriority } from '../types';
import { api } from '../api/client';
import { compressImageFile } from '../utils/imageCompress';

const WASTE_CATEGORIES = [
  'Plastics',
  'Packaging',
  'Glass & Metal',
  'Bulky Dumping',
  'Organic Debris',
  'Marine Drift',
];

interface ReportSpotModalProps {
  isOpen: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onStartMapPick: () => void;
  onSubmitSpot: (payload: {
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
  }) => Promise<void>;
}

export function ReportSpotModal({
  isOpen,
  pickedCoords,
  onClose,
  onStartMapPick,
  onSubmitSpot,
}: ReportSpotModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('Emmarentia, Johannesburg');
  const [lat, setLat] = useState(-26.1538);
  const [lng, setLng] = useState(28.0074);
  const [priority, setPriority] = useState<SpotPriority>('medium');
  const [wasteTypes, setWasteTypes] = useState<string[]>(['Plastics']);
  const [photoUrl, setPhotoUrl] = useState('');
  const [reportedBy, setReportedBy] = useState(() => {
    try {
      return localStorage.getItem('cleancommons_name') || '';
    } catch {
      return '';
    }
  });
  const [reporterPasscode, setReporterPasscode] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pickedCoords) return;
    setLat(pickedCoords.lat);
    setLng(pickedCoords.lng);
    api
      .reverseGeocode(pickedCoords.lat, pickedCoords.lng)
      .then((res) => {
        setAddress(res.displayName);
        setNeighborhood(res.neighborhood);
      })
      .catch(() => {
        setAddress(`${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`);
      });
  }, [pickedCoords]);

  if (!isOpen) return null;

  const handlePhotoChange = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      setPhotoUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load image.');
    }
  };

  const handleSearchAddress = async () => {
    if (addressQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await api.searchAddress(addressQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser. Pick a pin on the map instead.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        try {
          const rev = await api.reverseGeocode(nextLat, nextLng);
          setAddress(rev.displayName);
          setNeighborhood(rev.neighborhood);
        } catch {
          setAddress(`${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('Unable to read GPS location. Search an address or pick a pin on the map.');
      },
      { timeout: 6000 }
    );
  };

  const toggleWasteType = (category: string) => {
    setWasteTypes((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Please enter a short title describing the area.');
      return;
    }

    const author = reportedBy.trim() || 'Community Member';
    try {
      localStorage.setItem('cleancommons_name', author);
    } catch {
      // Ignore storage failures
    }

    const trimmedPasscode = reporterPasscode.trim();
    if (trimmedPasscode && trimmedPasscode.length < 4) {
      setError('Reporter passcode must be at least 4 characters (or leave blank to set later).');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitSpot({
        title: title.trim(),
        description: description.trim(),
        address: address.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        neighborhood: neighborhood.trim() || 'Neighborhood',
        lat,
        lng,
        priority,
        wasteTypes: wasteTypes.length > 0 ? wasteTypes : ['Plastics'],
        photoUrl: photoUrl || '/src/assets/images/spot_riverbank_plastics_1795254462665.jpg',
        reportedBy: author,
        reporterPasscode: trimmedPasscode || undefined,
      });
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      setReporterPasscode('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-spot-heading"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="report-spot-heading" className="font-display text-lg font-semibold text-slate-900">
              Report Area Needing Cleanup
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share a photo and map pin so neighbors can organize a cleanup.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Site Photograph
            </label>
            {photoUrl ? (
              <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img src={photoUrl} alt="Cleanup site preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-slate-900/80 text-white text-xs font-medium rounded-md hover:bg-slate-900 cursor-pointer"
                >
                  Replace photo
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-6 px-4 border border-dashed border-slate-300 hover:border-emerald-700 rounded-xl bg-slate-50 hover:bg-emerald-50/30 transition-colors cursor-pointer text-center">
                <Camera className="w-6 h-6 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Upload photo from device or camera
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    JPG, PNG, or WebP · automatically resized for fast sharing
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                />
              </label>
            )}
          </div>

          {/* Location Picker */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800">Location & Map Pin</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>{locating ? 'Locating...' : 'My GPS'}</span>
                </button>
                <button
                  type="button"
                  onClick={onStartMapPick}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Pick Pin on Map</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchAddress();
                    }
                  }}
                  placeholder="Search South African street, suburb, or landmark..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchAddress}
                disabled={searching}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0"
              >
                {searching ? 'Finding...' : 'Find'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-36 overflow-y-auto bg-white">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLat(item.lat);
                      setLng(item.lng);
                      setAddress(item.displayName);
                      setNeighborhood(item.neighborhood);
                      setSearchResults([]);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {item.displayName}
                  </button>
                ))}
              </div>
            )}

            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-700 truncate">
                {address || `${neighborhood} (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
              </span>
              <span className="font-mono tabular-nums text-slate-500 shrink-0">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Title & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="spot-title" className="block text-xs font-semibold text-slate-800 mb-1">
                Location Title
              </label>
              <input
                id="spot-title"
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Plastic bottles near Liesbeek River bridge"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="spot-desc" className="block text-xs font-semibold text-slate-800 mb-1">
                Condition Notes
              </label>
              <textarea
                id="spot-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe access notes, volume of litter, or helpful equipment (gloves, grabbers, heavy-duty bags)..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Cleanup Priority
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'high', label: 'High' },
                    { id: 'medium', label: 'Standard' },
                    { id: 'low', label: 'Quick' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      priority === p.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="spot-reporter" className="block text-xs font-semibold text-slate-800 mb-1">
                Your Name
              </label>
              <input
                id="spot-reporter"
                type="text"
                maxLength={60}
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Thabo Mokoena"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="spot-reporter-passcode"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Private Reporter Passcode (keeps volunteer lists visible only to you)
              </label>
              <input
                id="spot-reporter-passcode"
                type="password"
                autoComplete="new-password"
                maxLength={100}
                value={reporterPasscode}
                onChange={(e) => setReporterPasscode(e.target.value)}
                placeholder="4+ characters to unlock future cleanup rosters"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          {/* Waste categories */}
          <div>
            <span className="block text-xs font-semibold text-slate-800 mb-1.5">
              Materials Observed
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WASTE_CATEGORIES.map((category) => {
                const selected = wasteTypes.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleWasteType(category)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {category}
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
              {submitting ? 'Publishing...' : 'Publish Spot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
