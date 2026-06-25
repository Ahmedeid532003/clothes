import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HandCoins, CreditCard, Package, CalendarClock, RefreshCw, Pencil, AlertCircle, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supplierGroupsApi, fetchSuppliers, type SupplierDto } from '@/lib/api/inventory';
import { fetchSupplierMeta, type SupplierMetaGroup } from '@/lib/api/suppliers';
import {
  SETTLEMENT_MODE_OPTIONS,
  kindHint,
  kindLabel,
} from '@/lib/suppliers/defaults';
import { navigateToSuppliersWithPrefill } from '@/lib/suppliers/navigate';
import { FilteredSuppliersSheet } from './FilteredSuppliersSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const MODE_ICONS: Record<string, React.ReactNode> = {
  consignment: <Package className="h-7 w-7 text-blue-600" />,
  cash: <HandCoins className="h-7 w-7 text-blue-600" />,
  credit_returns: <CalendarClock className="h-7 w-7 text-blue-600" />,
  credit_no_returns: <CreditCard className="h-7 w-7 text-blue-600" />,
};

export function SupplierGroupsPage() {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<SupplierMetaGroup[]>([]);
  const [supplierCounts, setSupplierCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [form, setForm] = useState({
    settlement_mode: 'consignment',
    name_ar: '',
    name_en: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, suppliers] = await Promise.all([fetchSupplierMeta(), fetchSuppliers()]);
      setRows(m.groups);
      const counts: Record<string, number> = {};
      for (const s of suppliers) {
        const mode = s.supplier_group_mode;
        if (mode) counts[mode] = (counts[mode] ?? 0) + 1;
      }
      setSupplierCounts(counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suppliers.loadFailed'));
      try {
        const list = (await supplierGroupsApi.list()) as SupplierMetaGroup[];
        setRows(list);
      } catch {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const rowForMode = (mode: string) => rows.find((r) => r.settlement_mode === mode);

  const openModeList = (modeKey: string) => {
    setActiveMode(modeKey);
    setListOpen(true);
  };

  const openModeEdit = (modeKey: string) => {
    const opt = SETTLEMENT_MODE_OPTIONS.find((m) => m.key === modeKey);
    const row = rowForMode(modeKey);
    setForm({
      settlement_mode: modeKey,
      name_ar: row?.name_ar ?? (opt ? kindLabel(opt, 'ar') : ''),
      name_en: row?.name_en ?? (opt ? kindLabel(opt, 'en') : ''),
      description: row?.description ?? (opt ? kindHint(opt, locale) : ''),
    });
    setEditOpen(true);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_ar.trim(),
      settlement_mode: form.settlement_mode,
      description: form.description.trim(),
    };
    try {
      const existing = rowForMode(form.settlement_mode);
      if (existing) {
        await supplierGroupsApi.update(existing.id, payload);
      } else {
        await supplierGroupsApi.create(payload);
      }
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('suppliers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const activeOpt = SETTLEMENT_MODE_OPTIONS.find((m) => m.key === activeMode);
  const activeTitle = activeOpt ? kindLabel(activeOpt, locale) : '';
  const listFilters = useMemo(
    () => (activeMode ? { settlement_mode: activeMode } : {}),
    [activeMode],
  );
  const activeLabel = activeOpt ? kindLabel(activeOpt, locale) : form.settlement_mode;

  return (
    <div className="space-y-5 p-1 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.supplierGroups')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('suppliers.groupsConfigHint')}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-xs text-slate-500">{t('suppliers.groupsTapToView')}</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {SETTLEMENT_MODE_OPTIONS.map((m) => (
            <div key={m.key} className="h-40 rounded-xl border bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {SETTLEMENT_MODE_OPTIONS.map((opt) => {
            const row = rowForMode(opt.key);
            const title = row?.name_ar || kindLabel(opt, locale);
            const desc = row?.description || kindHint(opt, locale);
            const count = supplierCounts[opt.key] ?? 0;
            return (
              <div
                key={opt.key}
                className="rounded-xl border-2 border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col min-h-[180px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => openModeList(opt.key)}
                  className="flex-1 p-4 text-start flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span className="flex items-center gap-3">
                      {MODE_ICONS[opt.key]}
                      <span className="font-bold text-slate-900">{title}</span>
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                      {count} {t('suppliers.supplierCount')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 flex-1 leading-relaxed line-clamp-2">{desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                    <Users className="h-3.5 w-3.5" />
                    {t('suppliers.viewSuppliers')}
                  </span>
                </button>
                <div className="border-t px-2 py-1.5 bg-slate-50/80">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => openModeEdit(opt.key)}
                  >
                    <Pencil className="h-3.5 w-3.5 me-1" />
                    {t('suppliers.editGroupDetails')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FilteredSuppliersSheet
        open={listOpen}
        onOpenChange={setListOpen}
        title={t('suppliers.suppliersOfGroup', { group: activeTitle })}
        subtitle={t('suppliers.viewSuppliersHint')}
        filters={listFilters}
        onAddSupplier={() => {
          if (activeMode) {
            setListOpen(false);
            navigateToSuppliersWithPrefill({ settlement_mode: activeMode });
          }
        }}
        onEditSupplier={() => {
          setListOpen(false);
          if (activeMode) navigateToSuppliersWithPrefill({ settlement_mode: activeMode });
        }}
      />

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('suppliers.editGroupDetails')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs text-blue-700">{t('suppliers.settlementMode')}</p>
              <p className="font-semibold text-blue-900">{activeLabel}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600">{t('suppliers.displayNameAr')} *</p>
              <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-600">{t('suppliers.detailsNotes')}</p>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('suppliers.groupDetailsPlaceholder')}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={onSave} disabled={!form.name_ar.trim() || saving}>
              {saving ? t('inventory.loading') : t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
