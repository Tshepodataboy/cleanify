import { useState } from 'react';
import { MapPin } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/src/assets/images/')) return true;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(trimmed)) return true;
  if (trimmed.startsWith('https://')) return true;
  return false;
}

export function ResilientImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  const safe = isSafeImageSrc(src);

  if (!safe || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <MapPin className="w-6 h-6 text-emerald-700/70 mb-1.5" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
