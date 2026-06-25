import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Users, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
  type CatalogItem,
} from '@/lib/api/inventory';
import {
  fetchSupplierMeta,
  type SupplierMeta,
  type SupplierMetaCategory,
  type SupplierMetaDepartment,
  type SupplierMetaGroup,
  type SupplierMetaType,
} from '@/lib/api/suppliers';
import { OptionCardGrid } from '@/components/suppliers/OptionCardGrid';
import {
  ENTITY_KIND_OPTIONS,
  SETTLEMENT_MODE_OPTIONS,
  kindHint,
  kindLabel,
} from '@/lib/suppliers/defaults';
import { consumeSupplierPrefill } from '@/lib/suppliers/navigate';
import { WEEKLY_INVENTORY_DAYS } from '@/lib/suppliers/weekly-inventory-days';
import {
  CATEGORY_BADGE,
  DEPARTMENT_BADGE,
  SupplierClassificationBar,
} from '@/components/suppliers/SupplierClassificationBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type SupplierRow = CatalogItem & {
  supplier_type: string;
  supplier_group: string;
  supplier_type_name?: string;
  supplier_group_name?: string;
  supplier_category?: string | null;
  supplier_department?: string | null;
  supplier_category_name?: string;
  supplier_department_name?: string;
  supplier_category_kind?: string;
  supplier_department_kind?: string;
  contact_name?: string;
  contact_title?: string;
  phone?: string;
  whatsapp?: string;
  weekly_inventory_day?: string;
  is_also_customer?: boolean;
  linked_customer?: string | null;
  linked_customer_code?: string;
  linked_customer_name?: string;
  notes?: string;
};

import { ERP_NATIVE_SELECT } from '@/lib/ui/erpNativeSelect';

const selectClass = ERP_NATIVE_SELECT;

function resolveTypeId(types: SupplierMetaType[], entityKind: string) {
  return types.find((t) => t.entity_kind === entityKind)?.id ?? '';
}

function resolveGroupId(groups: SupplierMetaGroup[], mode: string) {
  return groups.find((g) => g.settlement_mode === mode)?.id ?? '';
}

function CatalogBadge({
  label,
  kind,
  palette,
}: {
  label?: string;
  kind?: string;
  palette: Record<string, string>;
}) {
  if (!label) return <span className="text-slate-400">—</span>;
  const tone = palette[kind || 'other'] ?? palette.other;
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

import { entityName } from '@/lib/entity-name';

function catalogLabel(
  row: SupplierMetaCategory | SupplierMetaDepartment,
) {
  return entityName(row);
}

export function SuppliersPage() {
  const { t, locale } = useLanguage();
  const [meta, setMeta] = useState<SupplierMeta | null>(null);
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    entity_kind: 'establishment',
    settlement_mode: 'consignment',
    supplier_category: '',
    supplier_department: '',
    contact_name: '',
    contact_title: '',
    phone: '',
    whatsapp: '',
    weekly_inventory_day: '',
    is_also_customer: false,
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sup, m] = await Promise.all([fetchSuppliers(), fetchSupplierMeta()]);
      setRows(sup as SupplierRow[]);
      setMeta(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const prefill = consumeSupplierPrefill();
    if (!prefill) return;
    setEditing(null);
    setSheetError(null);
    setForm({
      name_ar: '',
      name_en: '',
      entity_kind: prefill.entity_kind ?? ENTITY_KIND_OPTIONS[0]?.key ?? 'establishment',
      settlement_mode: prefill.settlement_mode ?? SETTLEMENT_MODE_OPTIONS[0]?.key ?? 'consignment',
      supplier_category: '',
      supplier_department: '',
      contact_name: '',
      contact_title: '',
      phone: '',
      whatsapp: '',
      notes: '',
    });
    setOpen(true);
  }, [loading]);

  const types = meta?.types ?? [];
  const groups = meta?.groups ?? [];
  const categories = meta?.categories ?? [];
  const departments = meta?.departments ?? [];

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterCategory && row.supplier_category !== filterCategory) return false;
      if (filterDepartment && row.supplier_department !== filterDepartment) return false;
      return true;
    });
  }, [rows, filterCategory, filterDepartment]);

  const hasActiveFilter = Boolean(filterCategory || filterDepartment);

  const kindOptions = ENTITY_KIND_OPTIONS.map((opt) => {
    const row = types.find((x) => x.entity_kind === opt.key);
    return {
      id: opt.key,
      title: row?.name_ar || kindLabel(opt, locale),
      description: row?.description || kindHint(opt, locale),
    };
  });

  const modeOptions = SETTLEMENT_MODE_OPTIONS.map((opt) => {
    const row = groups.find((g) => g.settlement_mode === opt.key);
    return {
      id: opt.key,
      title: row?.name_ar || kindLabel(opt, locale),
      description: row?.description || kindHint(opt, locale),
    };
  });

  const resetForm = () => ({
    name_ar: '',
    name_en: '',
    entity_kind: ENTITY_KIND_OPTIONS[0]?.key ?? 'establishment',
    settlement_mode: SETTLEMENT_MODE_OPTIONS[0]?.key ?? 'consignment',
    supplier_category: '',
    supplier_department: '',
    contact_name: '',
    contact_title: '',
    phone: '',
    whatsapp: '',
    weekly_inventory_day: '',
    is_also_customer: false,
    notes: '',
  });

  const openCreate = async () => {
    setSheetError(null);
    setEditing(null);
    if (!meta?.types?.length) {
      try {
        const m = await fetchSupplierMeta();
        setMeta(m);
      } catch {
        /* backend will resolve on save */
      }
    }
    setForm({
      ...resetForm(),
      supplier_category: filterCategory,
      supplier_department: filterDepartment,
    });
    setOpen(true);
  };

  const openEdit = (row: SupplierRow) => {
    const typeRow = types.find((x) => x.id === row.supplier_type);
    const groupRow = groups.find((g) => g.id === row.supplier_group);
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      entity_kind: typeRow?.entity_kind ?? 'establishment',
      settlement_mode: groupRow?.settlement_mode ?? 'consignment',
      supplier_category: row.supplier_category ?? '',
      supplier_department: row.supplier_department ?? '',
      contact_name: row.contact_name ?? '',
      contact_title: row.contact_title ?? '',
      phone: row.phone ?? '',
      whatsapp: row.whatsapp ?? '',
      weekly_inventory_day: row.weekly_inventory_day ?? '',
      is_also_customer: Boolean(row.is_also_customer),
      notes: row.notes ?? '',
    });
    setOpen(true);
  };

  const onSave = async () => {
    setSheetError(null);
    if (!form.name_ar.trim()) return;
    if (!form.contact_name.trim()) {
      setSheetError(t('suppliers.contactNameRequired'));
      return;
    }
    if (!form.contact_title.trim()) {
      setSheetError(t('suppliers.contactTitleRequired'));
      return;
    }

    const supplierType = resolveTypeId(types, form.entity_kind);
    const supplierGroup = resolveGroupId(groups, form.settlement_mode);
    const payload: Record<string, string | null> = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_ar.trim(),
      entity_kind: form.entity_kind,
      settlement_mode: form.settlement_mode,
      contact_name: form.contact_name.trim(),
      contact_title: form.contact_title.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      weekly_inventory_day: form.weekly_inventory_day,
      is_also_customer: form.is_also_customer,
      notes: form.notes.trim(),
      supplier_category: form.supplier_category || null,
      supplier_department: form.supplier_department || null,
    };
    if (supplierType) payload.supplier_type = supplierType;
    if (supplierGroup) payload.supplier_group = supplierGroup;

    setSaving(true);
    try {
      if (editing) await updateSupplier(editing.id, payload);
      else await createSupplier(payload);
      setOpen(false);
      setError(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('suppliers.saveFailed');
      setSheetError(msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(
    form.name_ar.trim() &&
      form.contact_name.trim() &&
      form.contact_title.trim() &&
      form.entity_kind &&
      form.settlement_mode,
  );

  const colSpan = 9;

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{t('nav.suppliers')}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('suppliers.supplierFormHint')}</p>
          </div>
          <SupplierClassificationBar
            categories={categories}
            departments={departments}
            supplierRows={rows}
            filterCategory={filterCategory}
            filterDepartment={filterDepartment}
            onFilterCategory={setFilterCategory}
            onFilterDepartment={setFilterDepartment}
            onCatalogUpdated={load}
          />
        </div>
        <div className="flex gap-2 shrink-0 self-start">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.add')}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!loading && types.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('suppliers.setupRequired')}
        </p>
      )}

      {hasActiveFilter && !loading ? (
        <p className="text-xs font-medium text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
          {t('suppliers.showingFilteredSuppliers')
            .replace('{shown}', String(filteredRows.length))
            .replace('{total}', String(rows.length))}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-start">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.nameAr')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.supplierCategory')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.supplierDepartment')}</th>
              <th className="px-4 py-3 text-start">{t('nav.supplierTypes')}</th>
              <th className="px-4 py-3 text-start">{t('nav.supplierGroups')}</th>
              <th className="px-4 py-3 text-start">{t('suppliers.contactPerson')}</th>
              <th className="px-4 py-3 text-start">{t('inventory.phone')}</th>
              <th className="px-4 py-3 text-end">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                  {hasActiveFilter ? t('suppliers.noSuppliersForFilter') : t('inventory.empty')}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.name_ar}
                    {row.is_also_customer ? (
                      <span className="ms-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                        {t('suppliers.alsoCustomerBadge')}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <CatalogBadge
                      label={row.supplier_category_name}
                      kind={row.supplier_category_kind}
                      palette={CATEGORY_BADGE}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CatalogBadge
                      label={row.supplier_department_name}
                      kind={row.supplier_department_kind}
                      palette={DEPARTMENT_BADGE}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.supplier_type_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.supplier_group_name || '—'}</td>
                  <td className="px-4 py-3">
                    {row.contact_name ? (
                      <div>
                        <p className="font-medium text-slate-800">{row.contact_name}</p>
                        {row.contact_title ? (
                          <p className="text-xs text-slate-500">{row.contact_title}</p>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{row.phone || '—'}</td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm(t('inventory.confirmDelete'))) return;
                        await deleteSupplier(row.id);
                        load();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? t('inventory.edit') : t('inventory.add')} — {t('nav.suppliers')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.supplierIdentity')}</h3>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">{t('inventory.nameAr')} *</p>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.classificationSection')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('suppliers.classificationSectionDesc')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">{t('suppliers.supplierCategory')}</p>
                  <select
                    className={selectClass}
                    value={form.supplier_category}
                    onChange={(e) => setForm({ ...form, supplier_category: e.target.value })}
                  >
                    <option value="">{t('suppliers.selectSupplierCategory')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {catalogLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">{t('suppliers.supplierDepartment')}</p>
                  <select
                    className={selectClass}
                    value={form.supplier_department}
                    onChange={(e) => setForm({ ...form, supplier_department: e.target.value })}
                  >
                    <option value="">{t('suppliers.selectSupplierDepartment')}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {catalogLabel(dept)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.contactPerson')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('suppliers.contactPersonDesc')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">{t('suppliers.contactName')} *</p>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    placeholder={t('suppliers.contactNamePh')}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">{t('suppliers.contactTitle')} *</p>
                  <Input
                    value={form.contact_title}
                    onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
                    placeholder={t('suppliers.contactTitlePh')}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">{t('suppliers.contactPersonUsage')}</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.selectEntityKind')} *</h3>
              <OptionCardGrid
                options={kindOptions}
                value={form.entity_kind}
                onChange={(id) => setForm({ ...form, entity_kind: id })}
                columns={2}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.selectSettlementMode')} *</h3>
              <OptionCardGrid
                options={modeOptions}
                value={form.settlement_mode}
                onChange={(id) => setForm({ ...form, settlement_mode: id })}
                columns={2}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.contactChannels')}</h3>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">{t('inventory.phone')}</p>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">{t('inventory.whatsapp')}</p>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.is_also_customer}
                  onChange={(e) => setForm({ ...form, is_also_customer: e.target.checked })}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('suppliers.alsoCustomer')}
                  </p>
                  <p className="text-xs text-indigo-800/70 mt-1">{t('suppliers.alsoCustomerDesc')}</p>
                </div>
              </label>
              {form.is_also_customer ? (
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2">
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-600" />
                      {t('suppliers.supplierAccountSide')}
                    </p>
                    <p className="text-slate-500 mt-0.5">{t('suppliers.supplierAccountSideHint')}</p>
                  </div>
                  <div className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2">
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                      {t('suppliers.customerAccountSide')}
                    </p>
                    <p className="text-slate-500 mt-0.5">{t('suppliers.customerAccountSideHint')}</p>
                  </div>
                  {editing?.linked_customer_code ? (
                    <p className="sm:col-span-2 text-indigo-800 font-medium">
                      {t('suppliers.linkedCustomerAccount')}: {editing.linked_customer_code}
                      {editing.linked_customer_name ? ` — ${editing.linked_customer_name}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t('suppliers.weeklyInventoryDay')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('suppliers.weeklyInventoryDayDesc')}</p>
              </div>
              <select
                className={selectClass}
                value={form.weekly_inventory_day}
                onChange={(e) => setForm({ ...form, weekly_inventory_day: e.target.value })}
              >
                {WEEKLY_INVENTORY_DAYS.map((day) => (
                  <option key={day.key || 'none'} value={day.key}>
                    {locale === 'en' ? day.labelEn : day.labelAr}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-600">{t('inventory.notes')}</p>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </section>
          </div>
          {sheetError && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-2">{sheetError}</p>
          )}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button type="button" onClick={onSave} disabled={!canSave || saving}>
              {saving ? t('inventory.loading') : t('inventory.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
