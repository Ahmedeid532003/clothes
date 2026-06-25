import React, { useMemo, useState } from 'react';
import { Check, Layers, LayoutGrid, Plus, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  supplierCategoriesApi,
  supplierDepartmentsApi,
  type CatalogItem,
} from '@/lib/api/inventory';
import { ApiRequestError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const CATEGORY_BADGE: Record<string, string> = {
  local: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  imported: 'bg-blue-100 text-blue-800 border-blue-200',
  wholesale: 'bg-violet-100 text-violet-800 border-violet-200',
  retail: 'bg-amber-100 text-amber-800 border-amber-200',
  strategic: 'bg-rose-100 text-rose-800 border-rose-200',
  seasonal: 'bg-orange-100 text-orange-800 border-orange-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const DEPARTMENT_BADGE: Record<string, string> = {
  women: 'bg-pink-100 text-pink-800 border-pink-200',
  men: 'bg-sky-100 text-sky-800 border-sky-200',
  children: 'bg-lime-100 text-lime-800 border-lime-200',
  shoes: 'bg-orange-100 text-orange-900 border-orange-200',
  bags: 'bg-purple-100 text-purple-800 border-purple-200',
  accessories: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  watches: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  cosmetics: 'bg-rose-100 text-rose-700 border-rose-200',
  sportswear: 'bg-green-100 text-green-800 border-green-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

type ChipItem = CatalogItem & { category_kind?: string; dept_kind?: string };

type SupplierRef = {
  supplier_category?: string | null;
  supplier_department?: string | null;
};

type Props = {
  categories: ChipItem[];
  departments: ChipItem[];
  supplierRows: SupplierRef[];
  filterCategory: string;
  filterDepartment: string;
  onFilterCategory: (id: string) => void;
  onFilterDepartment: (id: string) => void;
  onCatalogUpdated: () => void;
};

function chipLabel(row: ChipItem, locale: string) {
  if (locale === 'en' && row.name_en) return row.name_en;
  return row.name_ar;
}

function ChipRow({
  title,
  icon,
  items,
  counts,
  palette,
  kindKey,
  selectedId,
  onSelect,
  quickAddLabel,
  onQuickAdd,
  quickAddOpen,
  onQuickAddOpen,
  quickAddName,
  onQuickAddName,
  quickAddSaving,
  quickAddError,
  locale,
  totalSuppliers,
  unassignedCount,
}: {
  title: string;
  icon: React.ReactNode;
  items: ChipItem[];
  counts: Record<string, number>;
  palette: Record<string, string>;
  kindKey: 'category_kind' | 'dept_kind';
  selectedId: string;
  onSelect: (id: string) => void;
  quickAddLabel: string;
  onQuickAdd: () => void;
  quickAddOpen: boolean;
  onQuickAddOpen: (open: boolean) => void;
  quickAddName: string;
  onQuickAddName: (v: string) => void;
  quickAddSaving: boolean;
  quickAddError: string | null;
  locale: string;
  totalSuppliers: number;
  unassignedCount: number;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0">
          {icon}
          {title}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onSelect('')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
              !selectedId
                ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            {t('suppliers.filterAll')}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] tabular-nums',
                !selectedId ? 'bg-white/20' : 'bg-slate-100',
              )}
            >
              {totalSuppliers}
            </span>
          </button>
          {items.map((item) => {
            const kind = item[kindKey] || 'other';
            const tone = palette[kind] ?? palette.other;
            const active = selectedId === item.id;
            const count = counts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(active ? '' : item.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition max-w-[11rem]',
                  tone,
                  active && 'ring-2 ring-offset-1 ring-violet-500 shadow-sm',
                )}
                title={chipLabel(item, locale)}
              >
                <span className="truncate">{chipLabel(item, locale)}</span>
                <span className="rounded-full bg-white/70 px-1.5 text-[10px] tabular-nums shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
          {unassignedCount > 0 ? (
            <span className="text-[10px] text-slate-400 px-1">
              {t('suppliers.unclassifiedCount').replace('{n}', String(unassignedCount))}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs gap-1"
          onClick={() => onQuickAddOpen(!quickAddOpen)}
        >
          <Plus className="h-3.5 w-3.5" />
          {quickAddLabel}
        </Button>
      </div>
      {quickAddOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-violet-200 bg-white/80 px-3 py-2">
          <Input
            className="h-8 max-w-xs text-sm"
            value={quickAddName}
            onChange={(e) => onQuickAddName(e.target.value)}
            placeholder={quickAddLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onQuickAdd();
            }}
          />
          <Button type="button" size="sm" className="h-8" disabled={!quickAddName.trim() || quickAddSaving} onClick={onQuickAdd}>
            <Check className="h-3.5 w-3.5 me-1" />
            {quickAddSaving ? t('inventory.loading') : t('inventory.save')}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onQuickAddOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
          {quickAddError ? <p className="w-full text-xs text-red-600">{quickAddError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function SupplierClassificationBar({
  categories,
  departments,
  supplierRows,
  filterCategory,
  filterDepartment,
  onFilterCategory,
  onFilterDepartment,
  onCatalogUpdated,
}: Props) {
  const { t, locale } = useLanguage();
  const [catQuickOpen, setCatQuickOpen] = useState(false);
  const [deptQuickOpen, setDeptQuickOpen] = useState(false);
  const [catQuickName, setCatQuickName] = useState('');
  const [deptQuickName, setDeptQuickName] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [deptSaving, setDeptSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [deptError, setDeptError] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of supplierRows) {
      if (row.supplier_category) {
        counts[row.supplier_category] = (counts[row.supplier_category] ?? 0) + 1;
      }
    }
    return counts;
  }, [supplierRows]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of supplierRows) {
      if (row.supplier_department) {
        counts[row.supplier_department] = (counts[row.supplier_department] ?? 0) + 1;
      }
    }
    return counts;
  }, [supplierRows]);

  const unassignedCategories = useMemo(
    () => supplierRows.filter((r) => !r.supplier_category).length,
    [supplierRows],
  );
  const unassignedDepartments = useMemo(
    () => supplierRows.filter((r) => !r.supplier_department).length,
    [supplierRows],
  );

  const hasFilter = Boolean(filterCategory || filterDepartment);

  const saveCategory = async () => {
    if (!catQuickName.trim()) return;
    setCatSaving(true);
    setCatError(null);
    try {
      await supplierCategoriesApi.create({ name_ar: catQuickName.trim(), name_en: '', description: '' });
      setCatQuickName('');
      setCatQuickOpen(false);
      await onCatalogUpdated();
    } catch (e) {
      setCatError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    } finally {
      setCatSaving(false);
    }
  };

  const saveDepartment = async () => {
    if (!deptQuickName.trim()) return;
    setDeptSaving(true);
    setDeptError(null);
    try {
      await supplierDepartmentsApi.create({ name_ar: deptQuickName.trim(), name_en: '', description: '' });
      setDeptQuickName('');
      setDeptQuickOpen(false);
      await onCatalogUpdated();
    } catch (e) {
      setDeptError(e instanceof ApiRequestError ? e.message : t('suppliers.saveFailed'));
    } finally {
      setDeptSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/20 to-slate-50 px-3 py-3 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">{t('suppliers.classificationBarHint')}</p>
        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              onFilterCategory('');
              onFilterDepartment('');
            }}
            className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 underline-offset-2 hover:underline"
          >
            {t('suppliers.clearClassificationFilter')}
          </button>
        ) : null}
      </div>
      <ChipRow
        title={t('nav.supplierCategories')}
        icon={<Layers className="h-3.5 w-3.5 text-violet-600" />}
        items={categories}
        counts={categoryCounts}
        palette={CATEGORY_BADGE}
        kindKey="category_kind"
        selectedId={filterCategory}
        onSelect={onFilterCategory}
        quickAddLabel={t('suppliers.quickAddCategory')}
        onQuickAdd={saveCategory}
        quickAddOpen={catQuickOpen}
        onQuickAddOpen={setCatQuickOpen}
        quickAddName={catQuickName}
        onQuickAddName={setCatQuickName}
        quickAddSaving={catSaving}
        quickAddError={catError}
        locale={locale}
        totalSuppliers={supplierRows.length}
        unassignedCount={unassignedCategories}
      />
      <ChipRow
        title={t('nav.supplierDepartments')}
        icon={<LayoutGrid className="h-3.5 w-3.5 text-violet-600" />}
        items={departments}
        counts={departmentCounts}
        palette={DEPARTMENT_BADGE}
        kindKey="dept_kind"
        selectedId={filterDepartment}
        onSelect={onFilterDepartment}
        quickAddLabel={t('suppliers.quickAddDepartment')}
        onQuickAdd={saveDepartment}
        quickAddOpen={deptQuickOpen}
        onQuickAddOpen={setDeptQuickOpen}
        quickAddName={deptQuickName}
        onQuickAddName={setDeptQuickName}
        quickAddSaving={deptSaving}
        quickAddError={deptError}
        locale={locale}
        totalSuppliers={supplierRows.length}
        unassignedCount={unassignedDepartments}
      />
    </div>
  );
}
