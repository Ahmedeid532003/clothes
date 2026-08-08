/** System-wide UI font size (scales rem-based typography). */

export const FONT_SCALE_STORAGE_KEY = 'mahaly_font_scale';
export const FONT_SCALE_MESSAGE_TYPE = 'mahaly-font-scale';
/** Original / default system size (100% of 16px root). */
export const DEFAULT_FONT_SCALE = 100;
export const ORIGINAL_FONT_PX = 16;
export const FONT_SCALE_MIN = 50;
export const FONT_SCALE_MAX = 200;
export const FONT_SCALE_STEP = 5;

export function clampFontScale(n: number): number {
  const rounded = Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}

export function scaleToPx(scalePercent: number): number {
  return Math.round((ORIGINAL_FONT_PX * clampFontScale(scalePercent)) / 100);
}

export function formatFontSizeLabel(scalePercent: number, isAr: boolean): string {
  const scale = clampFontScale(scalePercent);
  const px = scaleToPx(scale);
  if (scale === DEFAULT_FONT_SCALE) {
    return isAr ? `${px}px — الحجم الأصلي` : `${px}px — Original size`;
  }
  return `${px}px (${scale}%)`;
}

export function getStoredFontScale(): number {
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (raw == null || raw === '') return DEFAULT_FONT_SCALE;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_FONT_SCALE;
    return clampFontScale(n);
  } catch {
    return DEFAULT_FONT_SCALE;
  }
}

/** Phone/tablet: css zoom > 1 blows past the screen width and clips UI. */
function isNarrowViewport(doc: Document = document): boolean {
  try {
    const win = doc.defaultView || window;
    return win.matchMedia('(max-width: 768px)').matches;
  } catch {
    return false;
  }
}

export function applyFontScale(scalePercent: number, doc: Document = document): number {
  const scale = clampFontScale(scalePercent);
  const narrow = isNarrowViewport(doc);
  // Keep layout inside phone bounds; mild rem scale only on narrow screens.
  const effectiveScale = narrow ? Math.min(scale, 110) : scale;
  const factor = effectiveScale / 100;
  const px = scaleToPx(effectiveScale);
  const root = doc.documentElement;
  const body = doc.body;

  root.style.setProperty('--mahaly-font-scale', String(factor));
  root.style.setProperty('--mahaly-font-px', `${px}px`);
  root.dataset.fontScale = String(scale);
  root.dataset.fontScaleEffective = String(effectiveScale);

  // Clear leftovers from either strategy.
  root.style.removeProperty('font-size');
  root.style.removeProperty('zoom');
  if (body) {
    body.style.removeProperty('transform');
    body.style.removeProperty('transform-origin');
    body.style.removeProperty('width');
  }

  if (narrow) {
    // rem-based only — never zoom on phone (prevents horizontal overflow).
    if (factor !== 1) {
      root.style.fontSize = `${px}px`;
    }
  } else {
    // Desktop: zoom scales rem + px (tables, toolbars, canvas UIs).
    if (factor !== 1) {
      root.style.zoom = String(factor);
    }
    if (body && typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('zoom', '1')) {
      body.style.transform = `scale(${factor})`;
      body.style.transformOrigin = 'top right';
      body.style.width = `${100 / factor}%`;
    }
  }

  try {
    window.dispatchEvent(
      new CustomEvent('mahaly-font-scale-change', { detail: { scale, effectiveScale, px } }),
    );
  } catch {
    /* ignore */
  }
  return scale;
}

export function saveAndApplyFontScale(scalePercent: number, doc: Document = document): number {
  const scale = applyFontScale(scalePercent, doc);
  try {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(scale));
  } catch {
    /* ignore */
  }
  return scale;
}

export function initFontScaleFromStorage(doc: Document = document) {
  const applied = applyFontScale(getStoredFontScale(), doc);
  try {
    const win = doc.defaultView || window;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => applyFontScale(getStoredFontScale(), doc), 120);
    };
    win.addEventListener('resize', onResize);
  } catch {
    /* ignore */
  }
  return applied;
}

export function listenForFontScaleMessages(doc: Document = document) {
  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === FONT_SCALE_MESSAGE_TYPE && typeof data.scale === 'number') {
      applyFontScale(data.scale, doc);
    }
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}

export function broadcastFontScaleToIframes(scale: number) {
  const frames = document.querySelectorAll('iframe');
  frames.forEach((frame) => {
    try {
      frame.contentWindow?.postMessage({ type: FONT_SCALE_MESSAGE_TYPE, scale }, '*');
    } catch {
      /* cross-origin ignore */
    }
  });
}
