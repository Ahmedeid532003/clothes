import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  chartOfAccountsApi,
  costCentersApi,
  type ChartAccountDto,
} from '@/lib/api/accounting';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
const TYPE_STYLE: Record<string, string> = {
  asset: 'text-emerald-700 bg-emerald-50',
  liability: 'text-rose-700 bg-rose-50',
  equity: 'text-violet-700 bg-violet-50',
  revenue: 'text-sky-700 bg-sky-50',
  expense: 'text-amber-700 bg-amber-50',
};

export function ChartOfAccountsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ChartAccountDto[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [costCenters, setCostCenters] = useState<{ id: string; label: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChartAccountDto | null>(null);
  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    parent: '',
    account_type: 'asset' as string,
    code: '',
    code_segment: '',
    cost_center: '',
    branch: '',
  });
  const [codePreview, setCodePreview] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cc, br] = await Promise.all([
        chartOfAccountsApi.list(filterType || undefined),
        costCentersApi.list(),
        apiFetch<{ id: string; name_ar?: string; code?: string }[]>('/organization/branches/').catch(
          () => [],
        ),
      ]);
      setRows(list);
      setCostCenters(cc.map((c) => ({ id: c.id, label: `${c.code} — ${c.name_ar}` })));
      setBranches(br.map((b) => ({ id: b.id, name: b.name_ar || b.code || b.id })));
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) => a.tree_path.localeCompare(b.tree_path));
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name_ar.toLowerCase().includes(q) ||
        r.path_label.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const refreshCode = useCallback(async () => {
    if (editing) return;
    try {
      const { code } = await chartOfAccountsApi.nextCode({
        parent: form.parent,
        account_type: form.account_type,
        code_segment: form.code_segment,
        name_ar: form.name_ar,
      });
      setCodePreview(code);
      setForm((f) => ({ ...f, code }));
    } catch {
      setCodePreview('');
    }
  }, [form.parent, form.account_type, form.code_segment, form.name_ar, editing]);

  useEffect(() => {
    const tmr = setTimeout(refreshCode, 300);
    return () => clearTimeout(tmr);
  }, [refreshCode]);

  const onSave = async () => {
    const payload = {
      ...form,
      name_en: form.name_ar.trim(),
      parent: form.parent || null,
      cost_center: form.cost_center || null,
      branch: form.branch || null,
    };
    if (editing) await chartOfAccountsApi.update(editing.id, payload);
    else await chartOfAccountsApi.create(payload);
    setOpen(false);
    load();
  };

  const openAdd = (parent?: ChartAccountDto) => {
    setEditing(null);
    setForm({
      name_ar: '',
      name_en: '',
      parent: parent?.id ?? '',
      account_type: parent?.account_type ?? (filterType || 'asset'),
      code: '',
      code_segment: '',
      cost_center: '',
      branch: '',
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-slate-800" />
            {t('nav.chartOfAccounts')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('accounting.chartDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="h-4 w-4 me-1" />
            {t('accounting.chartAdd')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filterType === '' ? 'default' : 'outline'}
          onClick={() => setFilterType('')}
        >
          {t('accounting.chartAll')}
        </Button>
        {TYPES.map((ty) => (
          <Button
            key={ty}
            size="sm"
            variant={filterType === ty ? 'default' : 'outline'}
            onClick={() => setFilterType(ty)}
          >
            {t(`accounting.chartType_${ty}`)}
          </Button>
        ))}
      </div>

      <Input
        placeholder={t('accounting.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-start">{t('accounting.colCode')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.colName')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.chartType')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.colPath')}</th>
              <th className="px-3 py-2 text-start">{t('accounting.costCenter')}</th>
              <th className="px-3 py-2 text-end">{t('accounting.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  {t('inventory.loading')}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-xs" style={{ paddingInlineStart: 12 + r.level * 16 }}>
                    {r.level > 0 && <ChevronRight className="inline h-3 w-3 opacity-40 me-1" />}
                    {r.code}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.name_ar}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[r.account_type] ?? ''}`}>
                      {t(`accounting.chartType_${r.account_type}`)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.path_label}</td>
                  <td className="px-3 py-2 text-xs">{r.cost_center_name ?? '—'}</td>
                  <td className="px-3 py-2 text-end whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => openAdd(r)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(r);
                        setForm({
                          name_ar: r.name_ar,
                          name_en: r.name_en,
                          parent: r.parent ?? '',
                          account_type: r.account_type,
                          code: r.code,
                          code_segment: r.code_segment,
                          cost_center: r.cost_center ?? '',
                          branch: r.branch ?? '',
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!r.is_system && !r.has_movements && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(t('accounting.confirmDelete'))) {
                            chartOfAccountsApi.remove(r.id).then(load);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? t('accounting.chartEdit') : t('accounting.chartAdd')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {!editing && (
              <>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={form.account_type}
                  onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                >
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {t(`accounting.chartType_${ty}`)}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder={t('accounting.codeSegment')}
                  value={form.code_segment}
                  onChange={(e) => setForm({ ...form, code_segment: e.target.value })}
                />
                <div className="text-xs font-mono text-indigo-600">{codePreview}</div>
              </>
            )}
            <Input
              placeholder={t('accounting.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
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
          </div>
          <SheetFooter>
            <Button onClick={onSave}>{t('inventory.saveDraft')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
