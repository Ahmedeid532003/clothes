import { useEffect } from 'react';
import {
  ACCENT_MESSAGE_TYPE,
  getStoredAccent,
  listenForAccentMessages,
} from '@/lib/theme/accent';
import {
  FONT_SCALE_MESSAGE_TYPE,
  getStoredFontScale,
} from '@/lib/theme/fontScale';

/** Keep iframe canvases in sync with the shell accent color + font scale. */
export function useAccentIframeSync(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  useEffect(() => {
    const post = (color: string, scale: number) => {
      try {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        win.postMessage({ type: ACCENT_MESSAGE_TYPE, color }, '*');
        win.postMessage({ type: FONT_SCALE_MESSAGE_TYPE, scale }, '*');
      } catch {
        /* ignore */
      }
    };

    const syncAll = () => post(getStoredAccent(), getStoredFontScale());
    const onLoad = () => syncAll();
    const frame = iframeRef.current;
    frame?.addEventListener('load', onLoad);

    const onAccent = (e: Event) => {
      const detail = (e as CustomEvent<{ color?: string }>).detail;
      post(detail?.color || getStoredAccent(), getStoredFontScale());
    };
    const onFont = (e: Event) => {
      const detail = (e as CustomEvent<{ scale?: number }>).detail;
      post(getStoredAccent(), detail?.scale ?? getStoredFontScale());
    };
    window.addEventListener('mahaly-accent-change', onAccent as EventListener);
    window.addEventListener('mahaly-font-scale-change', onFont as EventListener);

    syncAll();

    return () => {
      frame?.removeEventListener('load', onLoad);
      window.removeEventListener('mahaly-accent-change', onAccent as EventListener);
      window.removeEventListener('mahaly-font-scale-change', onFont as EventListener);
    };
  }, [iframeRef]);
}

// Re-export so canvases that imported listen still typecheck if needed
export { listenForAccentMessages };
