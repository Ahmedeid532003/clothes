import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { CustomerFormField } from '@/lib/api/customers';
import { Input } from '@/components/ui/input';

type Props = {
  schema: CustomerFormField[];
  mandatoryFields: string[];
  profile: Record<string, string>;
  core: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
  };
  onProfileChange: (key: string, value: string) => void;
  onCoreChange: (field: keyof Props['core'], value: string) => void;
};

const CORE_KEYS = new Set(['phone', 'whatsapp', 'email', 'address']);

export function DynamicCustomerForm({
  schema,
  mandatoryFields,
  profile,
  core,
  onProfileChange,
  onCoreChange,
}: Props) {
  const { t, locale } = useLanguage();
  const mandatory = new Set(mandatoryFields);

  const label = (f: CustomerFormField) => (locale === 'ar' ? f.label_ar : f.label_en || f.label_ar);
  const visibleSchema = schema.filter((f) => f.key !== 'name_en');

  const renderField = (f: CustomerFormField) => {
    const req = mandatory.has(f.key);
    const isCore = CORE_KEYS.has(f.key);
    const value = isCore ? core[f.key as keyof typeof core] ?? '' : profile[f.key] ?? '';

    if (f.type === 'textarea' || f.key === 'address' || f.key === 'notes') {
      return (
        <textarea
          key={f.key}
          rows={f.key === 'notes' ? 2 : 3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={value}
          required={req}
          onChange={(e) =>
            isCore
              ? onCoreChange(f.key as keyof typeof core, e.target.value)
              : onProfileChange(f.key, e.target.value)
          }
        />
      );
    }

    return (
      <Input
        key={f.key}
        type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
        value={value}
        required={req}
        onChange={(e) =>
          isCore
            ? onCoreChange(f.key as keyof typeof core, e.target.value)
            : onProfileChange(f.key, e.target.value)
        }
      />
    );
  };

  const sections = ['main', 'contact', 'other'] as const;
  const sectionTitle: Record<string, string> = {
    main: t('customers.sectionMain'),
    contact: t('customers.sectionContact'),
    other: t('customers.sectionOther'),
  };

  return (
    <div className="space-y-4">
      {sections.map((sec) => {
        const fields = visibleSchema.filter((f) => (f.section || 'main') === sec);
        if (!fields.length) return null;
        return (
          <div key={sec} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-600 mb-2 uppercase">{sectionTitle[sec]}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {label(f)}
                    {mandatory.has(f.key) ? <span className="text-red-500"> *</span> : null}
                  </label>
                  {renderField(f)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
