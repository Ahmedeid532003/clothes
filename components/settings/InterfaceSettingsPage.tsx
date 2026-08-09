import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Languages, Minus, Pipette, Plus, Settings2, Type } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import {
  ACCENT_COLOR_GRID,
  DEFAULT_ACCENT,
  broadcastAccentToIframes,
  getStoredAccent,
  normalizeHex,
  saveAndApplyAccent,
} from '@/lib/theme/accent';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  ORIGINAL_FONT_PX,
  broadcastFontScaleToIframes,
  clampFontScale,
  getStoredFontScale,
  saveAndApplyFontScale,
  scaleToPx,
} from '@/lib/theme/fontScale';

type Panel = 'home' | 'color' | 'font';

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

const LIGHT_MIN = 10;
const LIGHT_MAX = 90;

function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex) || DEFAULT_ACCENT;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case R:
        h = ((G - B) / d) % 6;
        break;
      case G:
        h = (B - R) / d + 2;
        break;
      default:
        h = (R - G) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function withLightness(hex: string, lightness: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(LIGHT_MIN, Math.min(LIGHT_MAX, lightness)) }));
}

/** Drag on the gradient itself to lighten / darken. */
function LightnessBar({
  baseHex,
  lightness,
  onChange,
  isAr,
}: {
  baseHex: string;
  lightness: number;
  onChange: (l: number) => void;
  isAr: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    let t = (clientX - rect.left) / rect.width;
    t = Math.max(0, Math.min(1, t));
    onChange(LIGHT_MIN + t * (LIGHT_MAX - LIGHT_MIN));
  };

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      let t = (e.clientX - rect.left) / rect.width;
      t = Math.max(0, Math.min(1, t));
      onChangeRef.current(LIGHT_MIN + t * (LIGHT_MAX - LIGHT_MIN));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const pct = ((lightness - LIGHT_MIN) / (LIGHT_MAX - LIGHT_MIN)) * 100;
  const dark = withLightness(baseHex, LIGHT_MIN);
  const mid = withLightness(baseHex, 50);
  const light = withLightness(baseHex, LIGHT_MAX);
  const current = withLightness(baseHex, lightness);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
        <span>{isAr ? 'أغمق' : 'Darker'}</span>
        <span className="font-mono text-slate-700">{current}</span>
        <span>{isAr ? 'أفتح' : 'Lighter'}</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={LIGHT_MIN}
        aria-valuemax={LIGHT_MAX}
        aria-valuenow={Math.round(lightness)}
        aria-label={isAr ? 'فتح أو تغميق اللون' : 'Lighten or darken color'}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(LIGHT_MIN, lightness - 2));
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(LIGHT_MAX, lightness + 2));
          }
        }}
        className="relative h-11 w-full cursor-ew-resize touch-none select-none rounded-full border border-black/10 shadow-inner outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-400"
        style={{
          background: `linear-gradient(to right, ${dark}, ${mid}, ${light})`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
          style={{
            left: `${pct}%`,
            backgroundColor: current,
            background: current,
          }}
        />
      </div>
    </div>
  );
}

/** Color chip that never uses <button className="border"> (ERP CSS forces white bg). */
function ColorSwatch({
  hex,
  selected,
  isOriginal,
  label,
  onSelect,
}: {
  hex: string;
  selected: boolean;
  isOriginal?: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={label}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'accent-color-swatch relative aspect-square w-full min-h-[40px] cursor-pointer rounded-lg outline-none transition-transform active:scale-95',
        selected ? 'z-[1] scale-105 ring-2 ring-slate-900 ring-offset-1' : 'hover:scale-105',
        isOriginal && !selected && 'ring-2 ring-orange-500 ring-offset-1',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-lg border border-black/15 shadow-sm"
        style={{ backgroundColor: hex, background: hex }}
      />
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" strokeWidth={3.5} />
        </span>
      )}
      {isOriginal && (
        <span className="absolute -top-1 -end-1 z-[2] flex h-4 min-w-4 items-center justify-center rounded-full border border-orange-300 bg-white px-0.5 text-[9px] font-black text-orange-600 shadow">
          1
        </span>
      )}
    </div>
  );
}

export function InterfaceSettingsPage() {
  const { locale, setLocale } = useLanguage();
  const isAr = locale === 'ar';
  const [panel, setPanel] = useState<Panel>('home');
  const [baseHex, setBaseHex] = useState(() => getStoredAccent());
  const [lightness, setLightness] = useState(() => rgbToHsl(hexToRgb(getStoredAccent())).l);
  const [applied, setApplied] = useState(() => getStoredAccent());
  const [appliedFont, setAppliedFont] = useState(() => getStoredFontScale());
  const [draftFont, setDraftFont] = useState(() => getStoredFontScale());
  const [toast, setToast] = useState<string | null>(null);
  const [sliderOpen, setSliderOpen] = useState(false);

  useEffect(() => {
    const onStorage = () => {
      const next = getStoredAccent();
      setApplied(next);
      setBaseHex(next);
      setLightness(rgbToHsl(hexToRgb(next)).l);
    };
    const onFont = () => {
      const next = getStoredFontScale();
      setAppliedFont(next);
      setDraftFont(next);
    };
    window.addEventListener('mahaly-accent-change', onStorage as EventListener);
    window.addEventListener('mahaly-font-scale-change', onFont as EventListener);
    return () => {
      window.removeEventListener('mahaly-accent-change', onStorage as EventListener);
      window.removeEventListener('mahaly-font-scale-change', onFont as EventListener);
    };
  }, []);

  const draftNorm = useMemo(
    () => withLightness(normalizeHex(baseHex) || DEFAULT_ACCENT, lightness),
    [baseHex, lightness],
  );

  const dirty = draftNorm.toLowerCase() !== applied.toLowerCase();
  const fontDirty = draftFont !== appliedFont;
  const isOriginalFontDraft = draftFont === DEFAULT_FONT_SCALE;

  const pickBase = (hex: string) => {
    const n = normalizeHex(hex) || DEFAULT_ACCENT;
    setBaseHex(n);
    setLightness(rgbToHsl(hexToRgb(n)).l);
    setSliderOpen(true);
  };

  const confirm = () => {
    const next = saveAndApplyAccent(draftNorm);
    setApplied(next);
    setBaseHex(next);
    setLightness(rgbToHsl(hexToRgb(next)).l);
    broadcastAccentToIframes(next);
    setToast(isAr ? 'تم تطبيق اللون بنجاح' : 'Color applied successfully');
    setTimeout(() => setToast(null), 2500);
  };

  const bumpFont = (delta: number) => {
    setDraftFont((prev) => clampFontScale(prev + delta));
  };

  const confirmFont = () => {
    const scale = saveAndApplyFontScale(draftFont);
    setAppliedFont(scale);
    setDraftFont(scale);
    broadcastFontScaleToIframes(scale);
    setToast(isAr ? 'تم تطبيق حجم الخط' : 'Font size applied');
    setTimeout(() => setToast(null), 2500);
  };

  if (panel === 'font') {
    const previewPx = scaleToPx(draftFont);
    return (
      <div className={cn('space-y-5 accent-settings-page', isAr && 'rtl font-[Cairo]')} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eaeff2] pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Type className="w-5 h-5 text-orange-500" />
                {isAr ? 'تغيير الخط' : 'Change font size'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftFont(appliedFont);
                setPanel('home');
              }}
              className="h-9 px-3 text-xs font-bold rounded-lg text-slate-600 hover:text-orange-600"
            >
              {isAr ? 'رجوع' : 'Back'}
            </button>
          </div>

          {/* Live preview of chosen size — does not apply until confirm */}
          <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50/50 px-4 py-8 font-scale-preview">
            <p className="text-[11px] font-black text-slate-500">{isAr ? 'تيست الحجم' : 'Size test'}</p>
            <p
              className="font-black text-slate-900 leading-none"
              style={{
                fontSize: `${previewPx}px`,
                // Cancel page zoom so preview matches the chosen px on screen
                zoom: appliedFont === DEFAULT_FONT_SCALE ? 1 : 100 / appliedFont,
              }}
            >
              محلى
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500 tabular-nums">
              {previewPx}px
              {isOriginalFontDraft
                ? isAr
                  ? ' — الحجم الأصلي'
                  : ' — Original size'
                : ` (${draftFont}%)`}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black text-slate-500">
              {isAr ? 'الحجم المختار' : 'Selected size'}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-800 tabular-nums">{previewPx}px</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isAr
                ? `الحجم الأصلي للنظام: ${ORIGINAL_FONT_PX}px`
                : `System original size: ${ORIGINAL_FONT_PX}px`}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              {isAr ? `المطبّق الآن: ${scaleToPx(appliedFont)}px` : `Applied now: ${scaleToPx(appliedFont)}px`}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => bumpFont(-FONT_SCALE_STEP)}
              disabled={draftFont <= FONT_SCALE_MIN}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-slate-700 disabled:opacity-40"
              aria-label={isAr ? 'تصغير' : 'Decrease'}
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="min-w-[120px] flex-1 text-center text-sm font-black text-slate-700">
              {draftFont}%
            </div>
            <button
              type="button"
              onClick={() => bumpFont(FONT_SCALE_STEP)}
              disabled={draftFont >= FONT_SCALE_MAX}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-slate-700 disabled:opacity-40"
              aria-label={isAr ? 'تكبير' : 'Increase'}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <input
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={draftFont}
            onChange={(e) => setDraftFont(clampFontScale(Number(e.target.value)))}
            className="mt-4 w-full cursor-pointer accent-orange-500"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDraftFont(DEFAULT_FONT_SCALE)}
              className="accent-original-btn h-12 min-w-[160px] rounded-xl px-5 text-sm font-black text-white"
            >
              {isAr ? `الحجم الأصلي (${ORIGINAL_FONT_PX}px)` : `Original size (${ORIGINAL_FONT_PX}px)`}
            </button>
            <button
              type="button"
              onClick={confirmFont}
              disabled={!fontDirty}
              className={cn(
                'accent-original-btn h-12 min-w-[160px] rounded-xl px-5 text-sm font-black text-white',
                !fontDirty && 'cursor-not-allowed opacity-50',
              )}
              style={
                fontDirty
                  ? undefined
                  : { background: '#94a3b8', backgroundColor: '#94a3b8' }
              }
            >
              {isAr ? 'تأكيد الحجم' : 'Confirm size'}
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
            <Check className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </div>
    );
  }

  if (panel === 'color') {
    return (
      <div className={cn('space-y-5 accent-settings-page', isAr && 'rtl font-[Cairo]')} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eaeff2] pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Pipette className="w-5 h-5 text-orange-500" />
                {isAr ? 'تغيير اللون' : 'Change color'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPanel('home')}
              className="h-9 px-3 text-xs font-bold rounded-lg text-slate-600 hover:text-orange-600"
            >
              {isAr ? 'رجوع' : 'Back'}
            </button>
          </div>

          {/* Preview + original + confirm — live color while sliding */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-slate-50 p-3">
            <div
              className="accent-live-fill relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border shadow-md"
              style={{ ['--accent-live' as string]: draftNorm }}
              title={draftNorm}
            >
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ background: draftNorm, backgroundColor: draftNorm }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-slate-500">{isAr ? 'اللون المختار' : 'Selected color'}</p>
              <p className="text-sm font-mono font-black text-slate-800">{draftNorm}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                pickBase(DEFAULT_ACCENT);
                setSliderOpen(true);
              }}
              className="accent-original-btn h-12 min-w-[140px] shrink-0 rounded-xl px-4 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {isAr ? 'اللون الأصلي' : 'Original color'}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!dirty}
              className={cn(
                'accent-live-fill h-12 min-w-[150px] shrink-0 rounded-xl px-5 text-sm font-black text-white transition active:scale-[0.98]',
                !dirty && 'cursor-not-allowed opacity-50',
              )}
              style={{
                ['--accent-live' as string]: dirty ? draftNorm : '#94a3b8',
              }}
            >
              {isAr ? 'تأكيد اللون' : 'Confirm color'}
            </button>
          </div>

          {/* Drag on the gradient bar itself */}
          {sliderOpen && (
            <LightnessBar
              baseHex={baseHex}
              lightness={lightness}
              onChange={setLightness}
              isAr={isAr}
            />
          )}

          {/* Color card grid — original orange first swatch */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
                {isAr ? `الألوان (${ACCENT_COLOR_GRID.length})` : `Colors (${ACCENT_COLOR_GRID.length})`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-slate-50/80 p-3">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                {ACCENT_COLOR_GRID.map((hex, index) => {
                  const isBase = (normalizeHex(baseHex) || '').toLowerCase() === hex.toLowerCase();
                  return (
                    <ColorSwatch
                      key={`${hex}-${index}`}
                      hex={hex}
                      selected={isBase}
                      isOriginal={index === 0}
                      label={index === 0 ? (isAr ? 'برتقالي أصلي' : 'Original orange') : hex}
                      onSelect={() => pickBase(hex)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-400">
              {isAr ? `المطبّق الآن: ${applied}` : `Applied now: ${applied}`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  pickBase(DEFAULT_ACCENT);
                  setSliderOpen(true);
                }}
                className="accent-original-btn h-11 min-w-[130px] rounded-xl px-4 text-xs font-black text-white"
              >
                {isAr ? 'اللون الأصلي' : 'Original color'}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!dirty}
                className={cn(
                  'accent-live-fill h-11 min-w-[140px] rounded-xl px-4 text-xs font-black text-white',
                  !dirty && 'cursor-not-allowed opacity-50',
                )}
                style={{
                  ['--accent-live' as string]: dirty ? draftNorm : '#94a3b8',
                }}
              >
                {isAr ? 'تأكيد اللون' : 'Confirm color'}
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
            <Check className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', isAr && 'rtl font-[Cairo]')} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white border border-gray-300 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#eaeff2] pb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
            <Settings2 className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{isAr ? 'الإعدادات' : 'Settings'}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {isAr ? 'إعدادات واجهة النظام والمظهر العام.' : 'System interface and appearance settings.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setPanel('color')}
            className="group cursor-pointer rounded-2xl border border-gray-200 bg-slate-50/60 p-5 text-start transition hover:border-orange-400 hover:bg-orange-50/40"
          >
            <div className="mb-3 grid h-10 w-10 grid-cols-3 gap-0.5 overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
              {['#f06424', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#0ea5e9', '#eab308', '#14b8a6', '#0a1945'].map(
                (c) => (
                  <span key={c} className="rounded-[2px]" style={{ backgroundColor: c, background: c }} />
                ),
              )}
            </div>
            <h3 className="text-sm font-black text-slate-800">{isAr ? 'تغيير اللون' : 'Change color'}</h3>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-white shadow"
                style={{ backgroundColor: applied, background: applied }}
              />
              <span className="font-mono text-[10px] font-bold text-slate-400">{applied}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPanel('font')}
            className="group cursor-pointer rounded-2xl border border-gray-200 bg-slate-50/60 p-5 text-start transition hover:border-orange-400 hover:bg-orange-50/40"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
              <Type className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-sm font-black text-slate-800">{isAr ? 'تغيير الخط' : 'Change font size'}</h3>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-black text-slate-700 tabular-nums">{scaleToPx(appliedFont)}px</span>
              <span className="text-[10px] font-bold text-slate-400">
                {appliedFont === DEFAULT_FONT_SCALE
                  ? isAr
                    ? 'الحجم الأصلي'
                    : 'Original'
                  : `${appliedFont}%`}
              </span>
            </div>
          </button>

          <div className="rounded-2xl border border-gray-200 bg-slate-50/60 p-5 text-start">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-orange-50">
              <Languages className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-sm font-black text-slate-800">{isAr ? 'اللغة' : 'Language'}</h3>
            <p className="mt-1 text-[11px] font-bold text-slate-400">
              {isAr ? 'تبديل لغة واجهة النظام' : 'Switch system interface language'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={cn(
                  'h-10 rounded-xl border text-xs font-black transition',
                  locale === 'ar'
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-gray-200 bg-white text-slate-600 hover:border-orange-300',
                )}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={cn(
                  'h-10 rounded-xl border text-xs font-black transition',
                  locale === 'en'
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-gray-200 bg-white text-slate-600 hover:border-orange-300',
                )}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
