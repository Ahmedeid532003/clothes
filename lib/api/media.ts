function resolveApiOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return new URL(raw).origin;
  }
  // Relative base e.g. /api/v1 on Cloudflare Pages — use current site origin for media paths.
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

const API_ORIGIN = resolveApiOrigin();

/** Resolve Django media URL (absolute or relative) for display. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}
