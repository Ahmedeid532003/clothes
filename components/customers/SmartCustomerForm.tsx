import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Scan } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  SECTION_LABELS,
  getMandatoryForSlug,
  getVisibleFields,
  type SmartFieldDef,
} from '@/lib/customers/fieldCatalog';
import { validateEgyptianNationalId } from '@/lib/customers/egyptianNationalId';
import { computeCreditScore } from '@/lib/customers/creditScore';
import { GuarantorsTable } from '@/components/customers/GuarantorsTable';
import { customersApi, type DuplicateWarning } from '@/lib/api/customers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type SmartFormState = {
  profile: Record<string, string | number | boolean>;
  workflow_status: string;
  customer_group: string;
  notes: string;
};

type Props = {
  slug: string;
  state: SmartFormState;
  customerCode?: string;
  excludeId?: string;
  readOnlyStats?: {
    last_activity_at?: string | null;
    purchase_count?: number;
    avg_purchase_amount?: string;
    credit_score?: number;
  };
  onProfileChange: (key: string, value: string | number | boolean) => void;
};

export function SmartCustomerForm({
  slug,
  state,
  customerCode,
  excludeId,
  readOnlyStats,
  onProfileChange,
}: Props) {
  const { t, locale } = useLanguage();
  const fields = useMemo(() => getVisibleFields(slug), [slug]);
  const mandatory = useMemo(() => new Set(getMandatoryForSlug(slug)), [slug]);
  const [dupWarnings, setDupWarnings] = useState<DuplicateWarning[]>([]);
  const [nidError, setNidError] = useState<string | null>(null);
  const [nidWarning, setNidWarning] = useState<string | null>(null);

  const label = (f: SmartFieldDef) =>
    locale === 'ar' ? f.label_ar : f.label_en || f.label_ar;

  const profileVal = (key: string) => {
    const v = state.profile[key];
    if (v === undefined || v === null) return '';
    return String(v);
  };

  useEffect(() => {
    if (slug !== 'individual') {
      setDupWarnings([]);
      return;
    }
    const nid = profileVal('national_id');
    const phone = profileVal('phone');
    if (!nid && !phone) {
      setDupWarnings([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await customersApi.checkDuplicate({
          national_id: nid,
          phone,
          exclude: excludeId,
        });
        setDupWarnings(res.warnings);
      } catch {
        setDupWarnings([]);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [slug, state.profile.national_id, state.profile.phone, excludeId]);

  useEffect(() => {
    if (slug === 'shop') return;
    const phone = profileVal('owner_phone');
    if (phone.length < 8) {
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await customersApi.checkDuplicate({
          phone,
          exclude: excludeId,
        });
        setDupWarnings(res.warnings);
      } catch {
        setDupWarnings([]);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [slug, state.profile.owner_phone, excludeId]);

  const onNationalIdChange = (raw: string) => {
    onProfileChange('national_id', raw);
    const parsed = validateEgyptianNationalId(raw);
    if (!raw.trim()) {
      setNidError(null);
      return;
    }
    if (!parsed.valid) {
      setNidError(parsed.error ?? t('customers.nidInvalid'));
      return;
    }
    setNidError(null);
    if (parsed.birthDate) {
      onProfileChange('birth_date', parsed.birthDate);
      onProfileChange('id_derived_birth_date', parsed.birthDate);
    }
    if (parsed.gender) {
      onProfileChange('gender', parsed.gender);
      onProfileChange('id_derived_gender', parsed.gender === 'male' ? 'ذكر' : 'أنثى');
    }
    const score = computeCreditScore({ ...state.profile, national_id: raw });
    onProfileChange('credit_score_display', String(score));
  };

  const sections = useMemo(() => {
    const map = new Map<string, SmartFieldDef[]>();
    for (const f of fields) {
      if (f.key === 'customer_code_preview') continue;
      const list = map.get(f.section) ?? [];
      list.push(f);
      map.set(f.section, list);
    }
    return [...map.entries()];
  }, [fields]);

  const renderField = (f: SmartFieldDef) => {
    if (f.key === 'spouse_name' && profileVal('marital_status') !== 'married') {
      return null;
    }
    const req = mandatory.has(f.key);
    const span = f.col_span === 2 ? 'sm:col-span-2' : '';

    if (f.key === 'customer_code_preview' || f.type === 'readonly') {
      let display = profileVal(f.key);
      if (f.key === 'customer_code_preview') display = customerCode ?? '—';
      if (f.key === 'last_deal_date') display = readOnlyStats?.last_activity_at?.slice(0, 10) ?? '—';
      if (f.key === 'purchase_count') display = String(readOnlyStats?.purchase_count ?? 0);
      if (f.key === 'avg_purchase_amount') display = readOnlyStats?.avg_purchase_amount ?? '0';
      if (f.key === 'credit_score_display') {
        display = String(readOnlyStats?.credit_score ?? state.profile.credit_score_display ?? '—');
      }
      return (
        <div key={f.key} className={span}>
          <label className="text-xs font-medium text-slate-600">{label(f)}</label>
          <div className="mt-1 rounded-md border bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
            {display || '—'}
          </div>
        </div>
      );
    }

    if (f.type === 'checkbox') {
      const checked = Boolean(state.profile[f.key]);
      return (
        <label key={f.key} className={`flex items-center gap-2 text-sm ${span}`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onProfileChange(f.key, e.target.checked)}
          />
          <span>{label(f)}</span>
        </label>
      );
    }

    if (f.type === 'rating') {
      const val = Number(state.profile[f.key] || 0);
      return (
        <div key={f.key} className={span}>
          <label className="text-xs font-medium">{label(f)}</label>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`h-8 w-8 rounded border text-sm ${
                  val >= n ? 'bg-amber-400 border-amber-500' : 'bg-white'
                }`}
                onClick={() => onProfileChange(f.key, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (f.type === 'gps') {
      const lat = profileVal('gps_lat') || (profileVal('gps_location').split(',')[0] ?? '');
      const lng = profileVal('gps_lng') || (profileVal('gps_location').split(',')[1] ?? '');
      return (
        <div key={f.key} className={`space-y-2 ${span}`}>
          <label className="text-xs font-medium">{label(f)}</label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Lat"
              value={lat}
              onChange={(e) => {
                onProfileChange('gps_lat', e.target.value);
                onProfileChange('gps_location', `${e.target.value},${lng}`);
              }}
            />
            <Input
              placeholder="Lng"
              value={lng}
              onChange={(e) => {
                onProfileChange('gps_lng', e.target.value);
                onProfileChange('gps_location', `${lat},${e.target.value}`);
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition((pos) => {
                const la = String(pos.coords.latitude);
                const ln = String(pos.coords.longitude);
                onProfileChange('gps_lat', la);
                onProfileChange('gps_lng', ln);
                onProfileChange('gps_location', `${la},${ln}`);
              });
            }}
          >
            {t('customers.captureGps')}
          </Button>
        </div>
      );
    }

    if (f.type === 'file') {
      return (
        <div key={f.key} className={span}>
          <label className="text-xs font-medium">{label(f)}</label>
          <Input
            type="file"
            className="mt-1"
            onChange={(e) => {
              const name = e.target.files?.[0]?.name ?? '';
              onProfileChange(f.key, name);
            }}
          />
          {profileVal(f.key) ? (
            <p className="text-xs text-slate-500 mt-1">{profileVal(f.key)}</p>
          ) : null}
        </div>
      );
    }

    if (f.type === 'select') {
      return (
        <div key={f.key} className={span}>
          <label className="text-xs font-medium">
            {label(f)}
            {req ? ' *' : ''}
          </label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={profileVal(f.key)}
            required={req}
            onChange={(e) => onProfileChange(f.key, e.target.value)}
          >
            <option value="">—</option>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {locale === 'ar' ? o.label_ar : o.label_en || o.label_ar}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const isNid = f.key === 'national_id';
    const isTextarea = f.type === 'textarea';

    return (
      <div key={f.key} className={span}>
        <label className="text-xs font-medium">
          {label(f)}
          {req ? ' *' : ''}
        </label>
        {isTextarea ? (
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
            required={req}
            value={profileVal(f.key)}
            onChange={(e) =>
              isNid ? onNationalIdChange(e.target.value) : onProfileChange(f.key, e.target.value)
            }
          />
        ) : (
          <Input
            className="mt-1"
            type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text'}
            required={req}
            value={profileVal(f.key)}
            onChange={(e) =>
              isNid ? onNationalIdChange(e.target.value) : onProfileChange(f.key, e.target.value)
            }
          />
        )}
        {isNid && nidError ? (
          <p className="text-xs text-red-600 mt-1">{nidError}</p>
        ) : null}
        {isNid && !nidError && nidWarning ? (
          <p className="text-xs text-amber-700 mt-1">{nidWarning}</p>
        ) : null}
        {isNid && slug === 'individual' ? (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Scan className="h-3 w-3" />
            {t('customers.ocrSoon')}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {slug === 'shop' && !customerCode ? (
        <div className="rounded-lg border border-dashed bg-blue-50/50 px-3 py-2 text-xs text-blue-900">
          {t('customers.codeAutoHint')}
        </div>
      ) : null}

      {dupWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-bold flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {t('customers.duplicateWarning')}
          </p>
          <ul className="mt-1 list-disc ps-4">
            {dupWarnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {slug === 'individual' ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
          {t('customers.individualSmartHint')}
        </div>
      ) : null}

      {sections.map(([section, sectionFields]) => {
        const secLabel = SECTION_LABELS[section];
        return (
          <fieldset
            key={section}
            className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm"
          >
            <legend className="px-2 text-sm font-bold text-slate-800">
              {locale === 'ar' ? secLabel?.ar : secLabel?.en}
            </legend>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sectionFields.map(renderField)}
            </div>
          </fieldset>
        );
      })}

      {slug === 'individual' ? (
        <fieldset className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm">
          <legend className="px-2 text-sm font-bold text-slate-800">
            {locale === 'ar' ? SECTION_LABELS.guarantors?.ar : SECTION_LABELS.guarantors?.en}
          </legend>
          <div className="mt-2">
            <GuarantorsTable
              profile={state.profile as Record<string, string | number | boolean>}
              onChange={onProfileChange}
            />
          </div>
        </fieldset>
      ) : null}

    </div>
  );
}
