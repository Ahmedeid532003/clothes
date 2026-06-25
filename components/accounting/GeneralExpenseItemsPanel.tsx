import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Check,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  costCentersApi,
  expenseTypesApi,
  glAccountsApi,
  type ExpenseTypeDto,
  type ExpenseTypePayload,
} from '@/lib/api/accounting';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { EXPENSE_ITEM_PRESETS, suggestGlAccountId } from '@/components/accounting/expensePresets';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';

type ItemForm = {
  name_ar: string;
  name_en: string;
  parent: string;
  code_segment: string;
  gl_account: string;
  cost_center: string;
  notes: string;
};

const emptyForm = (): ItemForm => ({
  name_ar: '',
  name_en: '',
  parent: '',
  code_segment: '',
  gl_account: '',
  cost_center: '',
  notes: '',
});

export function GeneralExpenseItemsPanel({
  embedded = false,
  onChanged,
  externalTypes,
  externalGlAccounts,
  skipInitialLoad = false,
  openAddSignal = 0,
}: {
  embedded?: boolean;
  onChanged?: () => void;
  externalTypes?: ExpenseTypeDto[];
  externalGlAccounts?: Array<{ id: string; label: string }>;
  skipInitialLoad?: boolean;
  openAddSignal?: number;
} = {}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ExpenseTypeDto[]>(externalTypes ?? []);
  const [glAccounts, setGlAccounts] = useState<{ id: string; label: string }[]>(externalGlAccounts ?? []);
  const [costCenters, setCostCenters] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(!skipInitialLoad);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTypeDto | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, gl, cc] = await Promise.all([
        expenseTypesApi.list(),
        glAccountsApi.list(),
        costCentersApi.list(),
      ]);
      setRows(types);
      setGlAccounts(
        gl
          .filter((a) => a.account_type === 'expense')
          .map((a) => ({ id: a.id, label: `${a.code} — ${a.name_ar}` })),
      );
      setCostCenters(cc.map((c) => ({ id: c.id, label: `${c.code} — ${c.name_ar}` })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    if (externalTypes) setRows(externalTypes);
  }, [externalTypes]);

  useEffect(() => {
    if (externalGlAccounts) setGlAccounts(externalGlAccounts);
  }, [externalGlAccounts]);

  useEffect(() => {
    if (!skipInitialLoad) load();
  }, [load, skipInitialLoad]);

  const categoryLabel = (key: string) => {
    const map: Record<string, string> = {
      operational: t('accounting.expenseCategoryOperational'),
      administrative: t('accounting.expenseCategoryAdministrative'),
    };
    return map[key] ?? key;
  };

  const inferCategory = (row: ExpenseTypeDto): 'operational' | 'administrative' | 'other' => {
    const preset = EXPENSE_ITEM_PRESETS.find(
      (p) => p.name_ar === row.name_ar || p.code_segment === row.code_segment,
    );
    if (preset) return preset.category;
    if (row.parent_name?.includes('إدار')) return 'administrative';
    if (row.parent_name?.includes('تشغيل')) return 'operational';
    return 'other';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const cat = inferCategory(row);
      if (categoryFilter && cat !== categoryFilter) return false;
      if (!q) return true;
      return (
        row.code.toLowerCase().includes(q) ||
        row.name_ar.toLowerCase().includes(q) ||
        (row.gl_account_code ?? '').toLowerCase().includes(q) ||
        (row.path_label ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, categoryFilter]);

  const parentOptions = useMemo(
    () =>
      rows
        .filter((r) => r.level === 0)
        .map((r) => ({ id: r.id, label: `${r.code} — ${r.name_ar}` })),
    [rows],
  );

  const existingNames = useMemo(() => new Set(rows.map((r) => r.name_ar)), [rows]);

  const missingPresets = useMemo(
    () => EXPENSE_ITEM_PRESETS.filter((p) => !existingNames.has(p.name_ar)),
    [existingNames],
  );

  const openAdd = (preset?: (typeof EXPENSE_ITEM_PRESETS)[number]) => {
    setEditing(null);
    const suggestedGl =
      preset && glAccounts.length
        ? suggestGlAccountId(
            { code_segment: preset.code_segment, name_ar: preset.name_ar },
            glAccounts,
          ) ?? ''
        : '';
    setForm({
      ...emptyForm(),
      name_ar: preset?.name_ar ?? '',
      name_en: preset?.name_en ?? '',
      code_segment: preset?.code_segment ?? '',
      gl_account: suggestedGl,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (openAddSignal > 0) openAdd();
  }, [openAddSignal]);

  const openEdit = (row: ExpenseTypeDto) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      parent: row.parent || '',
      code_segment: row.code_segment || '',
      gl_account: row.gl_account || '',
      cost_center: row.cost_center || '',
      notes: row.notes || '',
    });
    setOpen(true);
  };

  const payloadFromForm = (): ExpenseTypePayload => ({
    name_ar: form.name_ar.trim(),
    name_en: form.name_ar.trim(),
    parent: form.parent || null,
    code_segment: form.code_segment || undefined,
    gl_account: form.gl_account || null,
    cost_center: form.cost_center || null,
    notes: form.notes,
  });

  const onSave = async () => {
    if (!form.name_ar.trim()) {
      setError(t('accounting.expenseItemNameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) await expenseTypesApi.update(editing.id, payloadFromForm());
      else await expenseTypesApi.create(payloadFromForm());
      setOpen(false);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (row: ExpenseTypeDto) => {
    if (!confirm(t('accounting.confirmDeactivateItem'))) return;
    setError(null);
    try {
      await expenseTypesApi.remove(row.id);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const quickAddPreset = async (preset: (typeof EXPENSE_ITEM_PRESETS)[number]) => {
    setError(null);
    try {
      await expenseTypesApi.create({
        name_ar: preset.name_ar,
        name_en: preset.name_en,
        code_segment: preset.code_segment,
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const withGl = rows.filter((r) => r.gl_account).length;
  const filterSelectClass =
    'erp-native-select erp-smart-filter-select min-h-10 w-full rounded-xl border border-slate-200 bg-white ps-3 !pe-10 text-sm';

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('accounting.expenseItemsTitle')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('accounting.expenseItemsDesc')}</p>
          </div>
          <PageToolbar onRefresh={load}>
            <Button type="button" size="sm" onClick={() => openAdd()}>
              <Plus className="h-4 w-4 me-1" />
              {t('accounting.addExpenseItem')}
            </Button>
          </PageToolbar>
        </div>
      ) : (
        <div className="flex justify-end mb-2">
          <Button type="button" size="sm" onClick={() => openAdd()}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.addExpenseItem')}
          </Button>
        </div>
      )}

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {rows.length > 0 && withGl < rows.length ? (
        <AlertBanner variant="warning">{t('accounting.expenseItemsGlHint')}</AlertBanner>
      ) : null}

      {missingPresets.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
            <Sparkles className="h-4 w-4" />
            {t('accounting.expensePresetsTitle')}
          </div>
          <div className="flex flex-wrap gap-2">
            {missingPresets.map((preset) => (
              <button
                key={preset.code_segment}
                type="button"
                onClick={() => quickAddPreset(preset)}
                className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors"
              >
                + {preset.name_ar}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="erp-smart-filter-bar rounded-2xl border border-slate-200/80 bg-white p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 start-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('accounting.searchExpenseItems')}
            className="w-full h-10 rounded-xl border ps-9 pe-3 text-sm"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
          {[
            { value: '', label: t('accounting.filterAllCategories') },
            { value: 'operational', label: t('accounting.expenseCategoryOperational') },
            { value: 'administrative', label: t('accounting.expenseCategoryAdministrative') },
          ].map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setCategoryFilter(item.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap',
                categoryFilter === item.value
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:bg-white/80',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500 tabular-nums">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {loading ? (
        <p className="py-12 text-center text-slate-500">{t('inventory.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center bg-slate-50">
          <FolderTree className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">{t('accounting.expenseItemsEmpty')}</p>
          <Button type="button" size="sm" className="mt-4" onClick={() => openAdd()}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.addExpenseItem')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const cat = inferCategory(row);
            return (
              <article
                key={row.id}
                className="rounded-2xl border bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-blue-700">{row.code}</p>
                    <h3 className="font-bold text-slate-900 mt-1">{row.name_ar}</h3>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      cat === 'administrative'
                        ? 'bg-violet-100 text-violet-800'
                        : cat === 'operational'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {cat === 'other' ? t('accounting.expenseCategoryOther') : categoryLabel(cat)}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>
                    <strong>{t('accounting.colGl')}:</strong>{' '}
                    {row.gl_account_code ? (
                      <span className="text-emerald-700 font-semibold">{row.gl_account_code}</span>
                    ) : (
                      <span className="text-amber-700">{t('accounting.glNotLinked')}</span>
                    )}
                  </p>
                  {row.path_label && row.path_label !== row.name_ar ? (
                    <p className="truncate" title={row.path_label}>
                      <strong>{t('accounting.colPath')}:</strong> {row.path_label}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end gap-1 border-t pt-3">
                  <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title={t('accounting.deactivateItem')}
                    onClick={() => onDeactivate(row)}
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-600" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('accounting.editExpenseItem') : t('accounting.addExpenseItem')}
        description={t('accounting.expenseItemDrawerDesc')}
        saveLabel={t('inventory.save')}
        cancelLabel={t('inventory.cancel')}
        disabled={saving}
        onSave={onSave}
        steps={[
          t('accounting.expenseItemName'),
          t('accounting.expenseCategory'),
          t('accounting.colGl'),
        ]}
        currentStep={form.name_ar ? (form.gl_account ? 2 : 1) : 0}
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('accounting.expenseItemName')} *</span>
            <Input
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              placeholder={t('accounting.expenseItemNamePlaceholder')}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('accounting.expenseCategory')}</span>
            <select
              className={filterSelectClass}
              value={form.parent}
              onChange={(e) => setForm({ ...form, parent: e.target.value })}
            >
              <option value="">{t('accounting.noParentCategory')}</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('accounting.colGl')} *</span>
            <select
              className={filterSelectClass}
              value={form.gl_account}
              onChange={(e) => setForm({ ...form, gl_account: e.target.value })}
            >
              <option value="">{t('accounting.selectGlAccount')}</option>
              {glAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{t('accounting.expenseGlHint')}</p>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('accounting.costCenter')}</span>
            <select
              className={filterSelectClass}
              value={form.cost_center}
              onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
            >
              <option value="">{t('accounting.none')}</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">{t('inventory.notes')}</span>
            <textarea
              className="w-full min-h-[72px] rounded-xl border px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {form.gl_account ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              {t('accounting.expenseGlLinkedPreview')}
            </div>
          ) : null}
        </div>
      </ErpSideDrawer>
    </div>
  );
}
