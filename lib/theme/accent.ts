/** System accent (replaces hardcoded Ma7aly orange across UI). */

export const ACCENT_STORAGE_KEY = 'mahaly_accent_color';
/** Ma7aly brand orange used across V13 UIs (#f06424). */
export const DEFAULT_ACCENT = '#f06424';
export const ACCENT_MESSAGE_TYPE = 'mahaly-accent';

/** Exact Tailwind orange scale — original UI shade before accent remapping. */
export const ORIGINAL_ORANGE_SCALE: Record<string, string> = {
  '50': '#fff7ed',
  '100': '#ffedd5',
  '200': '#fed7aa',
  '300': '#fdba74',
  '400': '#fb923c',
  '500': '#f97316',
  '600': '#ea580c',
  '700': '#c2410c',
  '800': '#9a3412',
  '900': '#7c2d12',
  '950': '#431407',
};

const ORIGINAL_SHELL_BRAND = {
  brand: '#4f46e5',
  hover: '#4338ca',
  soft: '#eef2ff',
};

export const ACCENT_PRESETS: { id: string; hex: string; labelAr: string; labelEn: string }[] = [
  { id: 'orange', hex: DEFAULT_ACCENT, labelAr: 'برتقالي (افتراضي)', labelEn: 'Orange (default)' },
];

/**
 * Curated swatches from the brand color card (ignore labels).
 * Original Ma7aly orange is always first.
 */
const PALETTE_FROM_CARD = [
  '#aaba4f', '#9cb037', '#a2a113', '#ecd54b', '#f6d321', '#f7d229', '#677101', '#aab809', '#618f2c', '#98ae7d',
  '#273b22', '#83ba77', '#c2ab41', '#f1ba08', '#f8bf0d', '#eeac0d', '#deb13e', '#2a470f', '#206e3a', '#3ba02a',
  '#246068', '#226463', '#9d5c3c', '#b47353', '#e3937c', '#d66102', '#d96e0c', '#181d17', '#03411c', '#046f45',
  '#7b97ac', '#296d9e', '#173d7e', '#1b3f7d', '#80589e', '#a50a70', '#ac1073', '#e60a61', '#c70e1c', '#d94032',
  '#212d47', '#2c3852', '#1b1c30', '#786376', '#bc95b0', '#490b54', '#8b0983', '#f90962', '#98091b', '#820934',
] as const;

export const ACCENT_COLOR_GRID: string[] = [
  DEFAULT_ACCENT.toLowerCase(),
  ...PALETTE_FROM_CARD.filter((c) => c.toLowerCase() !== DEFAULT_ACCENT.toLowerCase()),
];

type Rgb = { r: number; g: number; b: number };

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

/** Treat Ma7aly orange + Tailwind orange-500 as the default (no remapping). */
export function isDefaultAccent(hex: string): boolean {
  const n = normalizeHex(hex);
  return n === DEFAULT_ACCENT || n === ORIGINAL_ORANGE_SCALE['500'] || n === '#ff6900';
}

function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex) ?? DEFAULT_ACCENT;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function shade(base: Rgb, amount: number): Rgb {
  if (amount < 0) return mix(base, { r: 255, g: 255, b: 255 }, Math.abs(amount));
  return mix(base, { r: 0, g: 0, b: 0 }, amount);
}

/** Tailwind-like scale generated from a custom brand hex. */
export function buildAccentScale(hex: string): Record<string, string> {
  const base = hexToRgb(hex);
  return {
    '50': rgbToHex(shade(base, -0.92)),
    '100': rgbToHex(shade(base, -0.82)),
    '200': rgbToHex(shade(base, -0.65)),
    '300': rgbToHex(shade(base, -0.4)),
    '400': rgbToHex(shade(base, -0.18)),
    '500': rgbToHex(base),
    '600': rgbToHex(shade(base, 0.12)),
    '700': rgbToHex(shade(base, 0.28)),
    '800': rgbToHex(shade(base, 0.42)),
    '900': rgbToHex(shade(base, 0.55)),
    '950': rgbToHex(shade(base, 0.7)),
  };
}

const HEX_BRIDGE_STYLE_ID = 'mahaly-accent-hex-bridge';

function clearHexBridgeStyle(doc: Document) {
  doc.getElementById(HEX_BRIDGE_STYLE_ID)?.remove();
}

function ensureHexBridgeStyle(doc: Document, accent500: string, accent600: string) {
  let el = doc.getElementById(HEX_BRIDGE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = HEX_BRIDGE_STYLE_ID;
    doc.head.appendChild(el);
  }
  el.textContent = `
    [class*="bg-[#f06424]"], [class*="bg-[#F06424]"],
    [class*="bg-[#ff6900]" i], [class*="bg-[#FF6900]"],
    [class*="bg-[#f97316]" i], [class*="bg-[#F97316]"],
    [class*="bg-[#ea580c]" i] {
      background-color: ${accent500} !important;
    }
    [class*="hover:bg-[#f06424]"]:hover, [class*="hover:bg-[#FF6900]"]:hover,
    [class*="hover:bg-[#f97316]"]:hover {
      background-color: ${accent600} !important;
    }
    [class*="text-[#f06424]"], [class*="text-[#F06424]"],
    [class*="text-[#ff6900]" i], [class*="text-[#FF6900]"],
    [class*="text-[#f97316]" i] {
      color: ${accent500} !important;
    }
    [class*="border-[#f06424]"], [class*="border-[#F06424]"],
    [class*="border-[#ff6900]" i], [class*="border-[#FF6900]"],
    [class*="border-[#f97316]" i] {
      border-color: ${accent500} !important;
    }
    [class*="from-[#f06424]"], [class*="from-[#FF6900]"], [class*="from-[#f97316]"] {
      --tw-gradient-from: ${accent500} !important;
    }
    [class*="to-[#f06424]"], [class*="to-[#FF6900]"], [class*="to-[#f97316]"] {
      --tw-gradient-to: ${accent500} !important;
    }
    table thead[class*="bg-[#FF6900]"] th,
    table thead[class*="bg-[#ff6900]"] th,
    table thead[class*="bg-[#f06424]"] th,
    table th[class*="bg-[#FF6900]"],
    table th[class*="bg-[#f06424]"] {
      background-color: ${accent500} !important;
      color: #fff !important;
    }
  `;
}

function clearInlineAccent(root: HTMLElement) {
  const keys = [
    '--mahaly-accent',
    '--mahaly-accent-hover',
    '--mahaly-accent-soft',
    '--theme-brand',
    '--theme-brand-hover',
    '--theme-brand-soft',
    '--primary',
    '--accent',
    '--accent-foreground',
    '--ring',
  ];
  for (const step of Object.keys(ORIGINAL_ORANGE_SCALE)) {
    keys.push(`--color-orange-${step}`, `--mahaly-accent-${step}`);
  }
  keys.forEach((k) => root.style.removeProperty(k));
}

/** Restore exact original orange + shell brand (no custom remapping). */
function applyDefaultAccent(doc: Document) {
  const root = doc.documentElement;
  clearInlineAccent(root);
  clearHexBridgeStyle(doc);

  // Pin Tailwind orange back to the exact original shades
  for (const [step, value] of Object.entries(ORIGINAL_ORANGE_SCALE)) {
    root.style.setProperty(`--color-orange-${step}`, value);
    root.style.setProperty(`--mahaly-accent-${step}`, value);
  }

  root.style.setProperty('--mahaly-accent', DEFAULT_ACCENT);
  root.style.setProperty('--mahaly-accent-hover', ORIGINAL_ORANGE_SCALE['600']);
  root.style.setProperty('--mahaly-accent-soft', ORIGINAL_ORANGE_SCALE['50']);
  root.dataset.accent = DEFAULT_ACCENT;

  // Shell brand back to original indigo
  root.style.setProperty('--theme-brand', ORIGINAL_SHELL_BRAND.brand);
  root.style.setProperty('--theme-brand-hover', ORIGINAL_SHELL_BRAND.hover);
  root.style.setProperty('--theme-brand-soft', ORIGINAL_SHELL_BRAND.soft);
  root.style.setProperty('--primary', ORIGINAL_SHELL_BRAND.brand);
  root.style.setProperty('--accent', ORIGINAL_SHELL_BRAND.soft);
  root.style.setProperty('--accent-foreground', ORIGINAL_SHELL_BRAND.hover);
  root.style.removeProperty('--ring');

  return DEFAULT_ACCENT;
}

export function applyAccentColor(hex: string, doc: Document = document) {
  const normalized = normalizeHex(hex) ?? DEFAULT_ACCENT;

  if (isDefaultAccent(normalized)) {
    return applyDefaultAccent(doc);
  }

  const scale = buildAccentScale(normalized);
  const root = doc.documentElement;

  root.style.setProperty('--mahaly-accent', scale['500']);
  root.style.setProperty('--mahaly-accent-hover', scale['600']);
  root.style.setProperty('--mahaly-accent-soft', scale['50']);
  root.dataset.accent = scale['500'];

  for (const [step, value] of Object.entries(scale)) {
    root.style.setProperty(`--color-orange-${step}`, value);
    root.style.setProperty(`--mahaly-accent-${step}`, value);
  }

  root.style.setProperty('--theme-brand', scale['500']);
  root.style.setProperty('--theme-brand-hover', scale['600']);
  root.style.setProperty('--theme-brand-soft', scale['50']);
  root.style.setProperty('--primary', scale['500']);
  root.style.setProperty('--accent', scale['50']);
  root.style.setProperty('--accent-foreground', scale['700']);
  root.style.setProperty('--ring', scale['500']);

  ensureHexBridgeStyle(doc, scale['500'], scale['600']);
  return scale['500'];
}

export function getStoredAccent(): string {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return normalizeHex(stored || '') ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function saveAndApplyAccent(hex: string): string {
  const applied = applyAccentColor(hex);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, applied);
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent('mahaly-accent-change', { detail: { color: applied } }));
  } catch {
    /* ignore */
  }
  return applied;
}

/** Boot: apply saved accent (one-time restore to original orange if needed). */
export function initAccentFromStorage(doc: Document = document) {
  const RESTORE_FLAG = 'mahaly_accent_restored_original_v1';
  try {
    if (!localStorage.getItem(RESTORE_FLAG)) {
      localStorage.setItem(ACCENT_STORAGE_KEY, DEFAULT_ACCENT);
      localStorage.setItem(RESTORE_FLAG, '1');
    }
  } catch {
    /* ignore */
  }
  return applyAccentColor(getStoredAccent(), doc);
}

export function listenForAccentMessages(doc: Document = document) {
  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === ACCENT_MESSAGE_TYPE && typeof data.color === 'string') {
      applyAccentColor(data.color, doc);
    }
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}

export function broadcastAccentToIframes(color: string) {
  const frames = document.querySelectorAll('iframe');
  frames.forEach((frame) => {
    try {
      frame.contentWindow?.postMessage({ type: ACCENT_MESSAGE_TYPE, color }, '*');
    } catch {
      /* cross-origin ignore */
    }
  });
}
