import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Lock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import type { CatalogItem } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { KindOption } from '@/lib/suppliers/defaults';
import { kindLabel } from '@/lib/suppliers/defaults';

type ApiClient = {
  list: () => Promise<CatalogItem[]>;
  create: (payload: Record<string, unknown>) => Promise<CatalogItem>;
  update: (id: string, payload: Record<string, unknown>) => Promise<CatalogItem>;
  remove: (id: string) => Promise<void>;
};

type CatalogRow = CatalogItem & {
  is_system?: boolean;
  entity_kind?: string;
  entity_kind_label?: string;
  settlement_mode?: string;
  settlement_mode_label?: string;
  description?: string;
};

type Props = {
  titleKey: string;
  hintKey: string;
  api: ApiClient;
  kindField: 'entity_kind' | 'settlement_mode';
  kindOptions: KindOption[];
  kindColumnLabelKey: string;
};

export function SupplierCatalogMasterPage({
  titleKey,
  hintKey,
  api,
  kindField,
  kindOptions,
  kindColumnLabelKey,
}: Props) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    code: '',
    kind: kindOptions[0]?.key ?? '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await api.list()) as CatalogRow[]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.loadFailed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    load();
  }, [load]);

  const kindDisplay = (row: CatalogRow) => {
    if (kindField === 'entity_kind') {
      return row.entity_kind_label || row.entity_kind || '—';
    }
    return row.settlement_mode_label || row.settlement_mode || '—';
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      name_ar: '',
      name_en: '',
      code: '',
      kind: kindOptions[0]?.key ?? '',
      description: '',
    });
    setOpen(true);
  };

  const openEdit = (row: CatalogRow) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      code: row.code,
      kind: (row[kindField] as string) || kindOptions[0]?.key || '',
      description: row.description || '',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name_ar.trim()) {
      setError(t('inventory.nameRequired'));
      return;
    }
    const payload: Record<string, unknown> = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_ar.trim(),
      description: form.description.trim(),
      [kindField]: form.kind,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    setError(null);
    try {
      if (editing) await api.update(editing.id, payload);
      else await api.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    }
  };

  const onDelete = async (row: CatalogRow) => {
    if (row.is_system) {
      setError(t('suppliers.cannotDeleteSystem'));
      return;
    }
    if (!confirm(t('inventory.confirmDelete'))) return;
    setError(null);
    try {
      await api.remove(row.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    }
  };

  return (
    <div className="space-y-4 p-1 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
          <p className="text-sm text-slate-500 mt-1">{t(hintKey)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 me-1" />
            {t('suppliers.addTypeOrGroup')}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.nameAr')}</th>
              <th className="px-4 py-3 text-start">{t(kindColumnLabelKey)}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{row.name_ar}</span>
                    {row.is_system && (
                      <span className="ms-2 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        <Lock className="h-3 w-3" />
                        {t('suppliers.systemDefault')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{kindDisplay(row)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={row.is_system}
                        title={row.is_system ? t('suppliers.cannotDeleteSystem') : undefined}
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className={`h-4 w-4 ${row.is_system ? 'text-slate-300' : 'text-red-600'}`} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('inventory.edit') : t('inventory.add')} — {t(titleKey)}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t(kindColumnLabelKey)} *</span>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={form.kind}
                disabled={Boolean(editing?.is_system)}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                {kindOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {kindLabel(opt, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t('inventory.nameAr')} *</span>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t('inventory.codeOptional')}</span>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={t('inventory.autoCode')}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t('suppliers.detailsNotes')}</span>
              <textarea
                className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button type="button" onClick={onSave} disabled={!form.name_ar.trim()}>
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
