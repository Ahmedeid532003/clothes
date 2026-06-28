import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { CatalogItem } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

type ApiClient = {
  list: () => Promise<CatalogItem[]>;
  create: (payload: Record<string, unknown>) => Promise<CatalogItem>;
  update: (id: string, payload: Record<string, unknown>) => Promise<CatalogItem>;
  remove: (id: string) => Promise<void>;
};

type FieldDef = {
  key: string;
  labelKey: string;
  type?: 'text' | 'number';
};

type MasterDataPageProps = {
  titleKey: string;
  api: ApiClient;
  extraFields?: FieldDef[];
};

export function MasterDataPage({ titleKey, api, extraFields = [] }: MasterDataPageProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name_ar: '', name_en: '', code: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    const init: Record<string, string> = { name_ar: '', name_en: '', code: '' };
    extraFields.forEach((f) => {
      init[f.key] = '';
    });
    setForm(init);
    setOpen(true);
  };

  const openEdit = (row: CatalogItem) => {
    setEditing(row);
    const init: Record<string, string> = {
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      code: row.code,
    };
    extraFields.forEach((f) => {
      init[f.key] = String((row as Record<string, unknown>)[f.key] ?? '');
    });
    setForm(init);
    setOpen(true);
  };

  const onSave = async () => {
    const nameAr = form.name_ar.trim();
    const code = form.code.trim();
    if (!nameAr && !code) {
      setError(t('inventory.nameRequired'));
      return;
    }
    const payload: Record<string, unknown> = {
      name_ar: nameAr || code,
      name_en: nameAr || code,
    };
    if (code) payload.code = code;
    extraFields.forEach((f) => {
      if (form[f.key]) payload[f.key] = form[f.key];
    });
    try {
      if (editing) await api.update(editing.id, payload);
      else await api.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onDelete = async (row: CatalogItem) => {
    if (!confirm(t('inventory.confirmDelete'))) return;
    try {
      await api.remove(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/70 text-slate-600">
            <tr>
              <th className="px-6 py-4 text-start">{t('inventory.code')}</th>
              <th className="px-6 py-4 text-start">{t('inventory.nameAr')}</th>
              <th className="px-6 py-4 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 transition-all duration-200 even:bg-slate-50/40 hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{row.code}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{row.name_ar}</td>
                  <td className="px-6 py-4 text-end">
                    <ErpRowActions
                      onEdit={() => openEdit(row)}
                      onDelete={() => onDelete(row)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="center" className="erp-form-modal erp-form-modal--wide erp-side-drawer w-full border-0 p-0 flex flex-col">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>
              {editing ? t('inventory.edit') : t('inventory.add')} — {t(titleKey)}
            </SheetTitle>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t('inventory.nameAr')}</span>
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
            {extraFields.map((f) => (
              <label key={f.key} className="block space-y-1">
                <span className="text-sm font-medium">{t(f.labelKey)}</span>
                <Input
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </label>
            ))}
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button type="button" onClick={onSave}>
              {t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
