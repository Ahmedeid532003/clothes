/** بيانات إضافية من profile_data — زوج/ة، ضامنون، بحث. */

export type GuarantorRow = {
  name: string;
  phone: string;
  national_id: string;
  job_title: string;
  address: string;
};

export const GUARANTOR_FIELD_KEYS = ['name', 'phone', 'national_id', 'job_title', 'address'] as const;

export const EMPTY_GUARANTOR: GuarantorRow = {
  name: '',
  phone: '',
  national_id: '',
  job_title: '',
  address: '',
};

export function guarantorProfileKey(index: 1 | 2 | 3, field: keyof GuarantorRow): string {
  return `guarantor_${index}_${field}`;
}

export function parseGuarantors(profile: Record<string, unknown> | undefined | null): GuarantorRow[] {
  const p = profile ?? {};
  const rows: GuarantorRow[] = [];
  for (const i of [1, 2, 3] as const) {
    const row: GuarantorRow = { ...EMPTY_GUARANTOR };
    for (const f of GUARANTOR_FIELD_KEYS) {
      const v = p[guarantorProfileKey(i, f)];
      if (v !== undefined && v !== null && v !== '') row[f] = String(v);
    }
    if (i === 1 && !row.name) {
      const legacy = String(p.guarantor_name || '');
      if (legacy) row.name = legacy;
    }
    rows.push(row);
  }
  return rows;
}

export function spouseFromProfile(profile: Record<string, unknown> | undefined | null): string {
  const p = profile ?? {};
  return String(p.spouse_name || p.husband_name || '').trim();
}

export function guarantorsSummary(profile: Record<string, unknown> | undefined | null): string {
  return parseGuarantors(profile)
    .map((g) => g.name.trim())
    .filter(Boolean)
    .join(' · ');
}

export function customerSearchHaystack(row: {
  name_ar?: string;
  code?: string;
  phone?: string;
  whatsapp?: string;
  profile_data?: Record<string, unknown>;
  customer_group_path?: string;
  notes?: string;
  spouse_name?: string;
  guarantor_summary?: string;
}): string {
  const p = row.profile_data ?? {};
  const guarantors = parseGuarantors(p);
  const parts = [
    row.name_ar,
    row.code,
    row.phone,
    row.whatsapp,
    row.spouse_name || spouseFromProfile(p),
    row.guarantor_summary,
    ...guarantors.flatMap((g) => [g.name, g.phone, g.national_id, g.job_title]),
    row.customer_group_path,
    row.notes,
    String(p.job_title || ''),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function matchesCustomerSearch(
  row: Parameters<typeof customerSearchHaystack>[0],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = customerSearchHaystack(row);
  return q.split(/\s+/).every((w) => hay.includes(w));
}
