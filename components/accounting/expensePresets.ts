export type ExpenseItemPreset = {
  name_ar: string;
  name_en: string;
  code_segment: string;
  category: 'operational' | 'administrative';
  /** GL account code used for smart auto-linking */
  gl_code: string;
};

export const EXPENSE_ITEM_PRESETS: ExpenseItemPreset[] = [
  { name_ar: 'إنترنت', name_en: 'Internet', code_segment: 'NET', category: 'operational', gl_code: '5120' },
  { name_ar: 'إيجارات', name_en: 'Rent', code_segment: 'RENT', category: 'administrative', gl_code: '5130' },
  { name_ar: 'شحن', name_en: 'Shipping', code_segment: 'SHIP', category: 'operational', gl_code: '5150' },
  { name_ar: 'كهرباء', name_en: 'Electricity', code_segment: 'ELEC', category: 'operational', gl_code: '5120' },
  { name_ar: 'مياه', name_en: 'Water', code_segment: 'WATER', category: 'operational', gl_code: '5120' },
  { name_ar: 'صيانة', name_en: 'Maintenance', code_segment: 'MNT', category: 'operational', gl_code: '5110' },
  { name_ar: 'ضيافة', name_en: 'Hospitality', code_segment: 'HOSP', category: 'administrative', gl_code: '5100' },
  { name_ar: 'وقود', name_en: 'Fuel', code_segment: 'FUEL', category: 'operational', gl_code: '5150' },
  { name_ar: 'أدوات مكتبية', name_en: 'Office supplies', code_segment: 'OFF', category: 'administrative', gl_code: '5100' },
  {
    name_ar: 'مصروفات تشغيلية أخرى',
    name_en: 'Other operating expenses',
    code_segment: 'OTH',
    category: 'operational',
    gl_code: '5100',
  },
];

export function suggestGlAccountId(
  expenseType: { code_segment: string; name_ar: string },
  glAccounts: Array<{ id: string; label: string }>,
): string | null {
  const preset =
    EXPENSE_ITEM_PRESETS.find(
      (p) => p.code_segment === expenseType.code_segment || p.name_ar === expenseType.name_ar,
    ) ?? null;
  if (!preset) return null;
  const match = glAccounts.find((g) => g.label.startsWith(`${preset.gl_code} `) || g.label.startsWith(preset.gl_code));
  return match?.id ?? null;
}
