const API_ORIGIN = new URL(
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1',
).origin;

/** Resolve Django media URL (absolute or relative) for display. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}
