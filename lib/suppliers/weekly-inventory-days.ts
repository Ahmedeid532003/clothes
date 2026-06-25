export const WEEKLY_INVENTORY_DAYS = [
  { key: '', labelAr: 'بدون جرد أسبوعي', labelEn: 'No weekly report' },
  { key: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' },
  { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
  { key: 'monday', labelAr: 'الإثنين', labelEn: 'Monday' },
  { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
  { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
  { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' },
  { key: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
] as const;

export function weeklyInventoryDayLabel(key: string | undefined | null, locale: string) {
  const row = WEEKLY_INVENTORY_DAYS.find((d) => d.key === (key || ''));
  if (!row) return '—';
  return locale === 'en' ? row.labelEn : row.labelAr;
}
