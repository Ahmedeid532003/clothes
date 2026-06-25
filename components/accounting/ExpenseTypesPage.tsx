import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  costCentersApi,
  expenseTypesApi,
  glAccountsApi,
  type ExpenseTypeDto,
  type ExpenseTypePayload,
} from '@/lib/api/accounting';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  AlertBanner,
  DataCard,
  LinkAction,
  PageSectionHeader,
  PageToolbar,
} from '@/components/accounting/AccountingUi';
import { emitExpensesRefresh } from '@/components/accounting/ExpensesHub';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type BranchOption = { id: string; name: string };
type DeptOption = { id: string; name: string };

type FormState = {
  name_ar: string;
  name_en: string;
  parent: string;
  code: string;
  code_segment: string;
  gl_account: string;
  cost_center: string;
  branch: string;
  department: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name_ar: '',
  name_en: '',
  parent: '',
  code: '',
  code_segment: '',
  gl_account: '',
  cost_center: '',
  branch: '',
  department: '',
  notes: '',
});

function buildTreeRows(rows: ExpenseTypeDto[]): ExpenseTypeDto[] {
  const sorted = [...rows].sort((a, b) => a.tree_path.localeCompare(b.tree_path));
  return sorted;
}

export function ExpenseTypesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ExpenseTypeDto[]>([]);
  const [glAccounts, setGlAccounts] = useState<{ id: string; label: string }[]>([]);
  const [costCenters, setCostCenters] = useState<{ id: string; label: string }[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTypeDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [codePreview, setCodePreview] = useState('');
  const [autoCode, setAutoCode] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, gl, cc, br, depts] = await Promise.all([
        expenseTypesApi.list(),
        glAccountsApi.list(),
        costCentersApi.list(),
        apiFetch<BranchOption[]>('/organization/branches/').catch(() => []),
        apiFetch<DeptOption[]>('/hr/departments/').catch(() => []),
      ]);
      setRows(types);
      setGlAccounts(gl.map((a) => ({ id: a.id, label: `${a.code} — ${a.name_ar}` })));
      setCostCenters(cc.map((c) => ({ id: c.id, label: `${c.code} — ${c.name_ar}` })));
      setBranches(
        (br as { id: string; name_ar?: string; name_en?: string; code?: string }[]).map((b) => ({
          id: b.id,
          name: b.name_ar || b.name_en || b.code || b.id,
        })),
      );
      setDepartments(
        (depts as { id: string; name?: string; code?: string }[]).map((d) => ({
          id: d.id,
          name: d.name || d.code || d.id,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
      emitExpensesRefresh();
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCodePreview = useCallback(async () => {
    if (!autoCode || editing) return;
    try {
      const { code } = await expenseTypesApi.nextCode({
        parent: form.parent || undefined,
        code_segment: form.code_segment,
        name_ar: form.name_ar,
      });
      setCodePreview(code);
      if (!form.code.trim()) setForm((f) => ({ ...f, code }));
    } catch {
      setCodePreview('');
    }
  }, [autoCode, editing, form.parent, form.code_segment, form.name_ar, form.code]);

  useEffect(() => {
    const tmr = setTimeout(() => {
      void refreshCodePreview();
    }, 300);
    return () => clearTimeout(tmr);
  }, [refreshCodePreview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tree = buildTreeRows(rows);
    if (!q) return tree;
    return tree.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name_ar.toLowerCase().includes(q) ||
        (r.path_label || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const parentOptions = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        label: `${'—'.repeat(r.level)} ${r.code} — ${r.name_ar}`.trim(),
      })),
    [rows],
  );

  const openAdd = (parentId?: string) => {
    setEditing(null);
    const init = emptyForm();
    if (parentId) init.parent = parentId;
    setForm(init);
    setAutoCode(true);
    setCodePreview('');
    setOpen(true);
  };

  const openEdit = (row: ExpenseTypeDto) => {
    setEditing(row);
    setForm({
      name_ar: row.name_ar,
      name_en: row.name_en || '',
      parent: row.parent || '',
      code: row.code,
      code_segment: row.code_segment || '',
      gl_account: row.gl_account || '',
      cost_center: row.cost_center || '',
      branch: row.branch || '',
      department: row.department || '',
      notes: row.notes || '',
    });
    setAutoCode(false);
    setCodePreview(row.code);
    setOpen(true);
  };

  const payloadFromForm = (): ExpenseTypePayload => ({
    name_ar: form.name_ar,
    name_en: form.name_ar.trim(),
    parent: form.parent || null,
    code: autoCode && !editing ? undefined : form.code || undefined,
    code_segment: form.code_segment || undefined,
    gl_account: form.gl_account || null,
    cost_center: form.cost_center || null,
    branch: form.branch || null,
    department: form.department || null,
    notes: form.notes,
  });

  const onSave = async () => {
    try {
      if (editing) await expenseTypesApi.update(editing.id, payloadFromForm());
      else await expenseTypesApi.create(payloadFromForm());
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onDelete = async (row: ExpenseTypeDto) => {
    if (!confirm(t('accounting.confirmDelete'))) return;
    try {
      await expenseTypesApi.remove(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );

  const withGl = rows.filter((r) => r.gl_account).length;

  return (
    <div className="space-y-4">
      <PageSectionHeader
        icon={<FolderTree className="h-6 w-6" />}
        title={t('accounting.expenseTypesTitle')}
        description={t('accounting.expenseTypesDesc')}
        actions={
          <PageToolbar onRefresh={load}>
            <Button type="button" size="sm" onClick={() => openAdd()}>
              <Plus className="h-4 w-4 me-1" />
              {t('accounting.addRoot')}
            </Button>
          </PageToolbar>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {rows.length > 0 && withGl < rows.length ? (
        <AlertBanner variant="info">
          {t('accounting.setupExpenseTypes')}{' '}
          <LinkAction label={t('nav.expenseVouchers')} tab="expense-vouchers" />
        </AlertBanner>
      ) : null}

      <DataCard>
        <div className="border-b border-slate-100 px-4 py-3 flex flex-wrap gap-3 items-center">
          <Input
            className="max-w-md"
            placeholder={t('accounting.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-xs text-slate-500">{t('accounting.treeHint')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colCode')}</th>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colName')}</th>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colPath')}</th>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colGl')}</th>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colCostCenter')}</th>
                <th className="px-4 py-2 text-start font-semibold">{t('accounting.colBranch')}</th>
                <th className="px-4 py-2 text-end font-semibold">{t('accounting.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    {t('departments.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    {t('accounting.empty')}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-2 font-mono text-xs text-blue-700 whitespace-nowrap">
                      <span style={{ paddingInlineStart: `${row.level * 16}px` }} className="inline-flex items-center gap-1">
                        {row.level > 0 ? <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" /> : null}
                        {row.code}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-900">{row.name_ar}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs max-w-[200px] truncate" title={row.path_label}>
                      {row.path_label}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {row.gl_account_code ? `${row.gl_account_code}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {row.cost_center_code || '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{row.branch_name || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t('accounting.addChild')}
                          onClick={() => openAdd(row.id)}
                        >
                          <Plus className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('accounting.editType') : t('accounting.addType')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {field(
              t('accounting.parentType'),
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.parent}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
              >
                <option value="">{t('accounting.rootLevel')}</option>
                {parentOptions
                  .filter((p) => !editing || p.id !== editing.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
              </select>,
            )}
            {field(
              t('accounting.nameAr'),
              <Input
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              />,
            )}
            {!editing ? (
              field(
                t('accounting.codeSegment'),
                <Input
                  placeholder="MNT, NET, SHP..."
                  value={form.code_segment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code_segment: e.target.value.toUpperCase() }))
                  }
                />,
              )
            ) : null}
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-blue-900 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  {t('accounting.codeLabel')}
                </span>
                {!editing ? (
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoCode}
                      onChange={(e) => setAutoCode(e.target.checked)}
                    />
                    {t('accounting.autoCode')}
                  </label>
                ) : null}
              </div>
              <Input
                value={autoCode && !editing ? codePreview || form.code : form.code}
                disabled={autoCode && !editing}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="font-mono"
              />
              <p className="text-xs text-slate-500">{t('accounting.codeHelp')}</p>
            </div>
            {field(
              t('accounting.glAccount'),
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.gl_account}
                onChange={(e) => setForm((f) => ({ ...f, gl_account: e.target.value }))}
              >
                <option value="">{t('accounting.none')}</option>
                {glAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('accounting.costCenter'),
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.cost_center}
                onChange={(e) => setForm((f) => ({ ...f, cost_center: e.target.value }))}
              >
                <option value="">{t('accounting.none')}</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('accounting.branch'),
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              >
                <option value="">{t('accounting.none')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('accounting.department'),
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              >
                <option value="">{t('accounting.none')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              t('accounting.notes'),
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />,
            )}
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('departments.cancel')}
            </Button>
            <Button type="button" onClick={onSave}>
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
