import { useState } from 'react';
import {
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Navigation,
  RotateCcw,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import type { AuthUser, CleanupEvent, CleanupSpot, RouteProfile, RouteResult } from '../types';
import { ResilientImage } from './ResilientImage';
import { compressImageFile } from '../utils/imageCompress';
import { inferSouthAfricanLocation } from '../utils/southAfrica';
import {
  formatDistance,
  formatDuration,
  formatEventDate,
  formatRelativeTime,
  getPriorityLabel,
  getPriorityTextClass,
  getStatusLabel,
  getStatusTextClass,
} from '../utils/formatters';

interface SpotDetailDrawerProps {
  spot: CleanupSpot;
  linkedEvents: CleanupEvent[];
  currentUser: AuthUser | null;
  route: RouteResult | null;
  routeLoading: boolean;
  routeError: string | null;
  onClose: () => void;
  onUpvote: (spotId: string) => void;
  onRequestRoute: (spot: CleanupSpot, profile: RouteProfile) => void;
  onClearRoute: () => void;
  onViewRouteOnMap?: () => void;
  onHostEventForSpot: (spot: CleanupSpot) => void;
  onViewEventOnBoard: (eventId: string) => void;
  onUpdateStatus: (
    spotId: string,
    status: 'cleaned' | 'needs_cleanup',
    afterPhotoUrl?: string,
    bagsCollected?: number
  ) => Promise<void>;
  onDeleteSpot: (spotId: string) => Promise<void>;
  onRequireAuth: (reason: string) => void;
}

export function SpotDetailDrawer({
  spot,
  linkedEvents,
  currentUser,
  route,
  routeLoading,
  routeError,
  onClose,
  onUpvote,
  onRequestRoute,
  onClearRoute,
  onViewRouteOnMap,
  onHostEventForSpot,
  onViewEventOnBoard,
  onUpdateStatus,
  onDeleteSpot,
  onRequireAuth,
}: SpotDetailDrawerProps) {
  const [profile, setProfile] = useState<RouteProfile>('foot');
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [photoView, setPhotoView] = useState<'before' | 'after'>(
    spot.status === 'cleaned' && spot.afterPhotoUrl ? 'after' : 'before'
  );
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [bagsCollected, setBagsCollected] = useState('4');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [submittingClean, setSubmittingClean] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayedPhoto =
    photoView === 'after' && spot.afterPhotoUrl ? spot.afterPhotoUrl : spot.photoUrl;

  const handleAfterPhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressImageFile(file);
      setAfterPhotoUrl(compressed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleConfirmCleaned = async (e: React.FormEvent) => {
    e.preventDefault();
    setRlsError(null);
    setSubmittingClean(true);
    try {
      await onUpdateStatus(
        spot.id,
        'cleaned',
        afterPhotoUrl || undefined,
        Math.max(0, Number(bagsCollected) || 0)
      );
      setShowCompleteForm(false);
      if (afterPhotoUrl) setPhotoView('after');
    } catch (err) {
      setRlsError(err instanceof Error ? err.message : 'Unable to update spot status.');
    } finally {
      setSubmittingClean(false);
    }
  };

  const handleConfirmDelete = async () => {
    setRlsError(null);
    setDeleting(true);
    try {
      await onDeleteSpot(spot.id);
    } catch (err) {
      setRlsError(err instanceof Error ? err.message : 'Unable to delete spot.');
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label={`Details for ${spot.title}`}
      className="w-full lg:w-[400px] bg-white lg:border-l border-slate-200 flex flex-col h-full shrink-0 shadow-lg z-20"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">
            {(() => {
              const loc = inferSouthAfricanLocation(spot);
              return loc.suburb !== loc.city
                ? `${loc.suburb} · ${loc.city} · ${loc.province}`
                : `${loc.city} · ${loc.province}`;
            })()}
          </p>
          <h2 className="font-display text-base font-semibold text-slate-900 truncate">
            {spot.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close spot details"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Photo with optional Before / After switcher */}
        <div className="space-y-2">
          <div className="aspect-4/3 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <ResilientImage
              src={displayedPhoto}
              alt={`${spot.title} (${photoView} photo)`}
              fallbackLabel={spot.title}
            />
          </div>

          {spot.afterPhotoUrl && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPhotoView('before')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  photoView === 'before'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reported Photo
              </button>
              <button
                type="button"
                onClick={() => setPhotoView('after')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  photoView === 'after'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                After Cleanup
              </button>
            </div>
          )}
        </div>

        {/* Unboxed Status & Metadata */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <span className={getStatusTextClass(spot.status)}>{getStatusLabel(spot.status)}</span>
            <span aria-hidden="true">·</span>
            <span className={getPriorityTextClass(spot.priority)}>
              {getPriorityLabel(spot.priority)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Reported by {spot.reportedBy}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(spot.createdAt)}</span>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">{spot.description}</p>

          <div className="pt-1 space-y-1 text-xs text-slate-500">
            <p className="text-slate-800 font-medium">{spot.address}</p>
            <p className="font-mono tabular-nums text-slate-500">
              {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
            </p>
            <p className="text-slate-600">
              Waste types: {spot.wasteTypes.join(' · ')}
            </p>
            {spot.status === 'cleaned' && typeof spot.bagsCollected === 'number' && (
              <p className="text-emerald-700 font-medium tabular-nums">
                Verified clean · {spot.bagsCollected} bags removed
              </p>
            )}
          </div>
        </div>

        {/* Community Support & Primary Actions */}
        <div className="space-y-3 pt-1 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUpvote(spot.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer tabular-nums"
            >
              <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Priority Vote ({spot.upvotes})</span>
            </button>

            {spot.status !== 'cleaned' && (
              <button
                type="button"
                onClick={() => onHostEventForSpot(spot)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Organize Cleanup</span>
              </button>
            )}

            {spot.isOwner && (
              <>
                {spot.status !== 'cleaned' ? (
                  <button
                    type="button"
                    onClick={() => setShowCompleteForm((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Mark Cleaned</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setRlsError(null);
                      try {
                        await onUpdateStatus(spot.id, 'needs_cleanup');
                      } catch (err) {
                        setRlsError(err instanceof Error ? err.message : 'Unable to reopen spot.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reopen Spot</span>
                  </button>
                )}

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-medium text-red-800">Delete spot?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleConfirmDelete}
                      className="px-2 py-0.5 text-[11px] font-semibold text-white bg-red-700 hover:bg-red-800 rounded cursor-pointer disabled:opacity-60"
                    >
                      {deleting ? '...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {rlsError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {rlsError}
            </div>
          )}

          {/* Row-Level Security status bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck
                className={`w-3.5 h-3.5 shrink-0 ${
                  spot.isOwner ? 'text-emerald-700' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">
                {spot.isOwner
                  ? 'Row-Level Security: You own this report'
                  : `Row-Level Security: Only ${spot.reportedBy} can edit or delete`}
              </span>
            </div>
            {!currentUser && (
              <button
                type="button"
                onClick={() => onRequireAuth('Sign in to manage spots you reported.')}
                className="font-semibold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Mark Cleaned Form */}
        {showCompleteForm && (
          <form
            onSubmit={handleConfirmCleaned}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <h3 className="text-xs font-semibold text-slate-900">
              Confirm Cleanup Completion
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bags Collected
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={bagsCollected}
                onChange={(e) => setBagsCollected(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                After-Cleanup Photo (optional)
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-emerald-700 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>{afterPhotoUrl ? 'After photo attached' : 'Upload after photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleAfterPhotoUpload(e.target.files?.[0])}
                />
              </label>
              {uploadError && <p className="mt-1 text-xs text-red-700">{uploadError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteForm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingClean}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {submittingClean ? 'Saving...' : 'Save Cleaned Status'}
              </button>
            </div>
          </form>
        )}

        {/* FreeRoute (OSRM) Directions Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-900">
              Route to Cleanup Site
            </h3>
            {route && (
              <button
                type="button"
                onClick={onClearRoute}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear route
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(
              [
                { id: 'foot', label: 'Walk' },
                { id: 'bike', label: 'Bike' },
                { id: 'driving', label: 'Drive' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setProfile(mode.id);
                  if (route) {
                    onRequestRoute(spot, mode.id);
                  }
                }}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  profile === mode.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onRequestRoute(spot, profile)}
            disabled={routeLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{routeLoading ? 'Calculating route...' : 'Show Route on Map'}</span>
          </button>

          {routeError && <p className="text-xs text-red-700">{routeError}</p>}

          {route && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
                </span>
                <span className="text-slate-500 capitalize">
                  {route.isFallback ? 'Direct estimate' : `${route.profile} route`}
                </span>
              </div>

              {onViewRouteOnMap && (
                <button
                  type="button"
                  onClick={onViewRouteOnMap}
                  className="lg:hidden w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                >
                  View Route on Full Map
                </button>
              )}

              {route.steps.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setStepsExpanded((prev) => !prev)}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <span>
                      {stepsExpanded
                        ? 'Hide turn-by-turn steps'
                        : `View ${route.steps.length} turn-by-turn steps`}
                    </span>
                    {stepsExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>

                  {stepsExpanded && (
                    <ol className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs text-slate-700">
                      {route.steps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-baseline justify-between gap-2 py-1 border-b border-slate-200/70 last:border-0"
                        >
                          <span>
                            {i + 1}. {step.instruction}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500 shrink-0">
                            {formatDistance(step.distanceMeters)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Linked Community Cleanup Events */}
        {linkedEvents.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900">
              Scheduled Community Events
            </h3>
            <div className="space-y-2">
              {linkedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 border border-slate-200 rounded-lg bg-white flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5 tabular-nums">
                      {formatEventDate(ev.date, ev.startTime)} ·{' '}
                      {ev.volunteerCount ?? ev.volunteers.length}/{ev.maxVolunteers} volunteers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewEventOnBoard(ev.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors shrink-0 cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
