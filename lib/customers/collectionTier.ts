export type CollectionTier = 'auto' | 'normal' | 'excellent' | 'black' | 'lawyer';

export const COLLECTION_TIER_PRESETS: Record<
  Exclude<CollectionTier, 'auto'>,
  { labelAr: string; labelEn: string; bg: string; text: string }
> = {
  normal: { labelAr: 'عادي', labelEn: 'Normal', bg: '', text: '#334155' },
  excellent: { labelAr: 'ممتاز', labelEn: 'Excellent', bg: '#16a34a', text: '#ffffff' },
  black: { labelAr: 'بلاك', labelEn: 'Black', bg: '#000000', text: '#ffffff' },
  lawyer: { labelAr: 'محامي', labelEn: 'Lawyer', bg: '#dc2626', text: '#ffffff' },
};

export const GROUP_COLOR_PRESETS = ['#000000', '#16a34a', '#dc2626', '#4F46E5', '#f59e0b', '#64748b', '#7c3aed'];

export function contrastText(hex: string) {
  const h = (hex || '#4F46E5').replace('#', '');
  if (h.length !== 6) return '#111';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140 ? '#ffffff' : '#111827';
}

export function tierFromGroupName(name: string): CollectionTier | null {
  const n = name.toLowerCase();
  if (n.includes('محام') || n.includes('lawyer')) return 'lawyer';
  if (n.includes('بلاك') || n.includes('black') || n.includes('سي')) return 'black';
  if (n.includes('ممتاز') || n.includes('excellent')) return 'excellent';
  if (n.includes('عادي') || n.includes('normal')) return 'normal';
  return null;
}

export function tierFromColor(color: string): CollectionTier | null {
  const c = (color || '').toLowerCase();
  if (c === '#dc2626' || c === '#ef4444') return 'lawyer';
  if (c === '#000000') return 'black';
  if (c === '#16a34a' || c === '#22c55e') return 'excellent';
  return null;
}
