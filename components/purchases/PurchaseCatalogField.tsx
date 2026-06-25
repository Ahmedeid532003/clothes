import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Option = { id: string; name_ar: string; name_en?: string };

type PurchaseCatalogFieldProps = {
  label?: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  onCreated?: (item: Option) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  createLabel: string;
  onCreate: (name_ar: string) => Promise<Option>;
  compact?: boolean;
  showAdd?: boolean;
  className?: string;
};

import { ERP_NATIVE_SELECT_COMPACT } from '@/lib/ui/erpNativeSelect';

const selectCompact = ERP_NATIVE_SELECT_COMPACT;
const btnCompact =
  'h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-white text-[#4169E1] hover:bg-[#4169E1] hover:text-white hover:border-[#4169E1] transition-all';

export function PurchaseCatalogField({
  label,
  value,
  options,
  onChange,
  onCreated,
  allowEmpty,
  emptyLabel,
  createLabel,
  onCreate,
  compact = false,
  showAdd = true,
  className = '',
}: PurchaseCatalogFieldProps) {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const item = await onCreate(name.trim());
      onCreated?.(item);
      onChange(item.id);
      setName('');
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className={className}>
        {label ? (
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-0.5 truncate">
            {label}
          </p>
        ) : null}
        <div className="flex gap-1">
          <select className={selectCompact} value={value} onChange={(e) => onChange(e.target.value)}>
            {allowEmpty ? <option value="">{emptyLabel ?? '—'}</option> : null}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_ar}
              </option>
            ))}
          </select>
          {showAdd ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={btnCompact}
              title={createLabel}
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
        {showCreate ? (
          <div className="mt-1 rounded-lg border border-blue-200 bg-blue-50/80 p-1.5 space-y-1">
            <Input
              className="h-7 text-xs bg-white"
              placeholder={createLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowCreate(false)}>
                {t('purchases.form.cancel')}
              </Button>
              <Button type="button" size="sm" className="h-6 text-[10px]" disabled={saving || !name.trim()} onClick={handleCreate}>
                {t('purchases.add')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label ? <p className="text-[11px] font-semibold text-slate-600">{label}</p> : null}
      <div className="flex gap-1">
        <select
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {allowEmpty ? <option value="">{emptyLabel ?? '—'}</option> : null}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name_ar}
            </option>
          ))}
        </select>
        {showAdd ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 h-[38px] w-[38px] border-slate-200"
            title={createLabel}
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {showCreate ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2 space-y-2">
          <Input
            className="h-8 text-sm bg-white"
            placeholder={createLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              {t('purchases.form.cancel')}
            </Button>
            <Button type="button" size="sm" disabled={saving || !name.trim()} onClick={handleCreate}>
              {t('purchases.add')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
