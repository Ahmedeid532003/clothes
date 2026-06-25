import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Lock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ApiRequestError } from '@/lib/api/errors';
import type { CatalogItem } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type ApiClient = {
  list: () => Promise<CatalogItem[]>;
  create: (payload: Record<string, unknown>) => Promise<CatalogItem>;
  update: (id: string, payload: Record<string, unknown>) => Promise<CatalogItem>;
  remove: (id: string) => Promise<void>;
};

type CatalogRow = CatalogItem & {
  is_system?: boolean;
  description?: string;
};

type Props = {
  titleKey: string;
  hintKey: string;
  api: ApiClient;
};

export function SupplierSimpleCatalogPage({ titleKey, hintKey, api }: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState({ name_ar: '', name_en: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await api.list()) as CatalogRow[]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name_ar: '', name_en: '', description: '' });
    setOpen(true);
  };

  const openEdit = (row: CatalogRow) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      description: row.description || '',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name_ar.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_ar.trim(),
        description: form.description.trim(),
      };
      if (editing) await api.update(editing.id, payload);
      else await api.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t(hintKey)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.nameAr')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.name_ar}
                    {row.is_system ? (
                      <Lock className="inline h-3.5 w-3.5 ms-1 text-slate-400" />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!row.is_system ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm(t('inventory.confirmDelete'))) return;
                          await api.remove(row.id);
                          load();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('inventory.edit') : t('inventory.add')} — {t(titleKey)}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t('inventory.nameAr')} *</span>
              <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">{t('inventory.notes')}</span>
              <textarea
                className="w-full min-h-[72px] rounded-md border px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button type="button" onClick={onSave} disabled={!form.name_ar.trim() || saving}>
              {saving ? t('inventory.loading') : t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
