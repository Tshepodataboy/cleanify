import type { SpotPriority, SpotStatus } from '../types';

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatEventDate(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return `${dateStr} · ${timeStr}`;
  const dateObj = new Date(y, m - 1, d);
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${formatted} · ${timeStr}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function getStatusLabel(status: SpotStatus): string {
  if (status === 'cleaned') return 'Cleaned';
  if (status === 'scheduled') return 'Event Scheduled';
  return 'Needs Cleanup';
}

export function getStatusTextClass(status: SpotStatus): string {
  if (status === 'cleaned') return 'text-emerald-700 font-semibold';
  if (status === 'scheduled') return 'text-sky-700 font-semibold';
  return 'text-amber-700 font-semibold';
}

export function getPriorityLabel(priority: SpotPriority): string {
  if (priority === 'high') return 'High Priority';
  if (priority === 'low') return 'Quick Sweep';
  return 'Standard';
}

export function getPriorityTextClass(priority: SpotPriority): string {
  if (priority === 'high') return 'text-red-700 font-semibold';
  if (priority === 'low') return 'text-slate-600 font-medium';
  return 'text-slate-700 font-medium';
}
