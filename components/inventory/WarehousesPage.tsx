import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Store } from 'lucide-react';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehouses,
  updateWarehouse,
  type WarehouseDto,
} from '@/lib/api/inventory';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { ErpPaginatedTableSection } from '@/components/erp/ErpPaginatedTableSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type FormState = {
  name_ar: string;
  name_en: string;
  code: string;
  manager_name: string;
  primary_branch_id: string;
};

const emptyForm = (): FormState => ({
  name_ar: '',
  name_en: '',
  code: '',
  manager_name: '',
  primary_branch_id: '',
});

export function WarehousesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<WarehouseDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wh, br] = await Promise.all([fetchWarehouses(), fetchBranches()]);
      setRows(wh);
      setBranches(br.filter((b) => b.is_active));
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
    if (!form.name_ar.trim()) {
      setError(t('inventory.warehouseNameRequired'));
      return;
    }
    if (!editing?.is_sale_outlet && !form.primary_branch_id) {
      setError(t('inventory.branchRequired'));
      return;
    }
    const payload: Record<string, unknown> = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || form.name_ar.trim(),
      manager_name: form.manager_name.trim(),
    };
    if (form.code.trim()) payload.code = form.code.trim();
    if (!editing?.is_sale_outlet) {
      payload.primary_branch_id = form.primary_branch_id;
    }
    try {
      if (editing) await updateWarehouse(editing.id, payload);
      else await createWarehouse(payload);
      setOpen(false);
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (row: WarehouseDto) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en,
      code: row.code,
      manager_name: row.manager_name,
      primary_branch_id: row.primary_branch || '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('inventory.warehousesTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('inventory.warehousesDesc')}</p>
        </div>
        <PageToolbar onRefresh={load}>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 me-1" />
            {t('inventory.addWarehouse')}
          </Button>
        </PageToolbar>
      </div>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <ErpPaginatedTableSection rows={rows}>
        {(pagedRows) => (
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-start font-bold">{t('inventory.code')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('inventory.branch')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('inventory.warehouseName')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('inventory.manager')}</th>
              <th className="px-4 py-3 text-start font-bold">{t('inventory.warehouseType')}</th>
              <th className="px-4 py-3 text-end font-bold">{t('inventory.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  {t('inventory.warehousesEmpty')}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{row.code}</td>
                  <td className="px-4 py-3">{row.primary_branch_name || '—'}</td>
                  <td className="px-4 py-3 font-medium">{row.name_ar}</td>
                  <td className="px-4 py-3">{row.manager_name || '—'}</td>
                  <td className="px-4 py-3">
                    {row.is_sale_outlet ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                        <Store className="h-3 w-3" />
                        {t('inventory.warehouseSaleOutlet')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">{t('inventory.storageWarehouse')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!row.is_sale_outlet && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (confirm(t('inventory.confirmDelete'))) {
                            await deleteWarehouse(row.id);
                            load();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </ErpPaginatedTableSection>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing
                ? editing.is_sale_outlet
                  ? t('inventory.warehouseSaleOutlet')
                  : t('inventory.editWarehouse')
                : t('inventory.addWarehouse')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {editing?.is_sale_outlet && (
              <p className="text-xs text-blue-800 bg-blue-50 rounded-md p-2">{t('pos.branchIsPos')}</p>
            )}
            {!editing?.is_sale_outlet && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">{t('inventory.code')}</label>
                  <Input
                    placeholder={t('inventory.codeOptional')}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">{t('inventory.branch')} *</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.primary_branch_id}
                    onChange={(e) => setForm({ ...form, primary_branch_id: e.target.value })}
                  >
                    <option value="">{t('inventory.selectBranch')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{t('inventory.warehouseName')} *</label>
              <Input
                placeholder={t('inventory.warehouseNamePlaceholder')}
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{t('inventory.manager')}</label>
              <Input
                placeholder={t('inventory.managerPlaceholder')}
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              />
            </div>
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
