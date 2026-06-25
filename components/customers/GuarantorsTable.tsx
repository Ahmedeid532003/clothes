import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  EMPTY_GUARANTOR,
  GUARANTOR_FIELD_KEYS,
  guarantorProfileKey,
  type GuarantorRow,
} from '@/lib/customers/profileExtras';
import { Input } from '@/components/ui/input';

type Props = {
  profile: Record<string, string | number | boolean>;
  onChange: (key: string, value: string) => void;
};

const FIELD_LABELS: Record<keyof GuarantorRow, { ar: string; en: string }> = {
  name: { ar: 'الاسم', en: 'Name' },
  phone: { ar: 'الهاتف', en: 'Phone' },
  national_id: { ar: 'الرقم القومي', en: 'National ID' },
  job_title: { ar: 'الوظيفة', en: 'Job' },
  address: { ar: 'العنوان', en: 'Address' },
};

export function GuarantorsTable({ profile, onChange }: Props) {
  const { locale, t } = useLanguage();
  const gu = (k: string) => t(`customers.guarantors.${k}` as never);

  const val = (index: 1 | 2 | 3, field: keyof GuarantorRow) => {
    const key = guarantorProfileKey(index, field);
    const v = profile[key];
    if (v === undefined || v === null) {
      if (index === 1 && field === 'name' && profile.guarantor_name) {
        return String(profile.guarantor_name);
      }
      return '';
    }
    return String(v);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{gu('optionalHint')}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="px-3 py-2 text-start font-bold w-28">{gu('colIndex')}</th>
              {GUARANTOR_FIELD_KEYS.map((f) => (
                <th key={f} className="px-3 py-2 text-start font-bold">
                  {locale === 'ar' ? FIELD_LABELS[f].ar : FIELD_LABELS[f].en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([1, 2, 3] as const).map((index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap">
                  {gu(`guarantor${index}` as never)}
                </td>
                {GUARANTOR_FIELD_KEYS.map((field) => (
                  <td key={field} className="px-2 py-1.5">
                    <Input
                      className="h-9 text-sm"
                      value={val(index, field)}
                      placeholder={EMPTY_GUARANTOR[field] ? '' : ''}
                      onChange={(e) => onChange(guarantorProfileKey(index, field), e.target.value)}
                      type={field === 'phone' ? 'tel' : 'text'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
