import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSeason, fetchSeasons, updateSeason, type SeasonDto } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErpPaginatedTableSection } from '@/components/erp/ErpPaginatedTableSection';

export function SeasonsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SeasonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SeasonDto | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    code: '',
    is_open: true,
    is_current: false,
    starts_at: '',
    ends_at: '',
    barcode_prefix: '',
    barcode_next_number: '100000',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchSeasons());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    const payload: Record<string, unknown> = {
      name_ar: form.name_ar,
      name_en: form.name_ar.trim(),
      is_open: form.is_open,
      is_current: form.is_current,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      barcode_prefix: form.barcode_prefix,
      barcode_next_number: parseInt(form.barcode_next_number, 10) || 100000,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    try {
      if (editing) await updateSeason(editing.id, payload);
      else await createSeason(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.seasons')}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setForm({
                name_ar: '',
                name_en: '',
                code: '',
                is_open: true,
                is_current: false,
                starts_at: '',
                ends_at: '',
                barcode_prefix: '',
                barcode_next_number: '100000',
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ErpPaginatedTableSection rows={rows}>
        {(pagedRows) => (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.nameAr')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.seasonOpen')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.seasonCurrent')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.empty')}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">{row.name_ar}</td>
                  <td className="px-4 py-3">{row.is_open ? t('inventory.yes') : t('inventory.no')}</td>
                  <td className="px-4 py-3">{row.is_current ? t('inventory.yes') : t('inventory.no')}</td>
                  <td className="px-4 py-3 text-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(row);
                        setForm({
                          name_ar: row.name_ar,
                          name_en: row.name_en || '',
                          code: row.code,
                          is_open: row.is_open,
                          is_current: row.is_current,
                          starts_at: row.starts_at?.slice(0, 10) ?? '',
                          ends_at: row.ends_at?.slice(0, 10) ?? '',
                          barcode_prefix: row.barcode_prefix ?? '',
                          barcode_next_number: String(row.barcode_next_number ?? 100000),
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </ErpPaginatedTableSection>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? t('inventory.edit') : t('inventory.add')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder={t('inventory.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <Input
              placeholder={t('inventory.codeOptional')}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_open}
                onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
              />
              {t('inventory.seasonOpen')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
              />
              {t('inventory.seasonCurrent')}
            </label>
            <Input
              type="date"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <Input
              type="date"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
            <p className="text-sm font-medium pt-2">{t('inventory.barcodeSettings')}</p>
            <Input
              placeholder={t('inventory.barcodePrefix')}
              value={form.barcode_prefix}
              onChange={(e) => setForm({ ...form, barcode_prefix: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('inventory.barcodeStartNumber')}
              value={form.barcode_next_number}
              onChange={(e) => setForm({ ...form, barcode_next_number: e.target.value })}
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={onSave}>{t('inventory.save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
