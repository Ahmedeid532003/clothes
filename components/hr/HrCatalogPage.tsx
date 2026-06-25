import React, { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, ClipboardList, Hash, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AlertBanner, PageToolbar } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErpRowActions } from '@/components/erp/ErpRowActions';

type Row = { id: string; code: string; name: string; description?: string };

type Props = {
  activeTab: string;
  titleKey: string;
  descKey: string;
  addKey: string;
  emptyKey: string;
  showDescription?: boolean;
  load: () => Promise<Row[]>;
  create: (body: { name: string; code?: string; description?: string }) => Promise<unknown>;
  update: (id: string, body: { name: string; description?: string }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

export function HrCatalogPage({
  activeTab,
  titleKey,
  descKey,
  addKey,
  emptyKey,
  showDescription,
  load,
  create,
  update,
  remove,
}: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pagination = useTablePagination(rows);

  const onSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await update(editing.id, { name: form.name.trim(), description: form.description.trim() });
      } else {
        await create({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
        });
      }
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <HrModuleLayout activeTab={activeTab}>
      <div className="hr-premium-page space-y-6">
        <section className="hr-premium-hero">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="hr-premium-hero-icon">
                <ClipboardList className="h-7 w-7" />
              </span>
              <div>
                <span className="hr-premium-eyebrow">HR Master Data</span>
                <h1>{t(titleKey)}</h1>
                <p>{t(descKey)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hr-premium-range-pill">
                <Sparkles className="h-4 w-4" />
                HR Catalog
              </div>
              <PageToolbar onRefresh={refresh}>
                <ErpAddButton
                  onClick={() => {
                    setEditing(null);
                    setForm({ code: '', name: '', description: '' });
                    setOpen(true);
                  }}
                >
                  {t(addKey)}
                </ErpAddButton>
              </PageToolbar>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="hr-premium-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p>إجمالي السجلات</p>
                <strong>{rows.length}</strong>
                <small>محدث تلقائيًا</small>
              </div>
              <span className="hr-stat-icon bg-blue-50 text-blue-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="hr-premium-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p>الأكواد</p>
                <strong>{rows.filter((row) => row.code).length}</strong>
                <small>سجلات لها كود واضح</small>
              </div>
              <span className="hr-stat-icon bg-emerald-50 text-emerald-700">
                <Hash className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div className="hr-premium-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p>آخر سجل</p>
                <strong className="line-clamp-1 text-2xl">{rows[0]?.name || '—'}</strong>
                <small>حسب ترتيب النظام الحالي</small>
              </div>
              <span className="hr-stat-icon bg-violet-50 text-violet-700">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="hr-premium-table-card">
          <div className="hr-premium-table-header">
            <div>
              <h2>{t(titleKey)}</h2>
              <p>عرض منظم بنفس نمط الإدارات مع إجراءات احترافية.</p>
            </div>
            <span>{rows.length} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="hr-premium-table w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-start font-black text-slate-600">{t('departments.columns.id')}</th>
                  <th className="px-6 py-4 text-start font-black text-slate-600">{t('departments.columns.name')}</th>
                  {showDescription ? (
                    <th className="px-6 py-4 text-start font-black text-slate-600">{t('employeeGroups.description')}</th>
                  ) : null}
                  <th className="px-6 py-4 text-end font-black text-slate-600">{t('erpTable.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showDescription ? 4 : 3} className="p-10">
                      <div className="hr-premium-empty-state">
                        <span className="erp-skeleton-line mx-auto h-3 w-48" />
                        <span className="erp-skeleton-line mx-auto h-3 w-64" />
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={showDescription ? 4 : 3} className="p-10">
                      <div className="hr-premium-empty-state">{t(emptyKey)}</div>
                    </td>
                  </tr>
                ) : (
                  pagination.pagedRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{r.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                            <BriefcaseBusiness className="h-4 w-4" />
                          </span>
                          <span className="font-extrabold text-slate-900">{r.name}</span>
                        </div>
                      </td>
                      {showDescription ? (
                        <td className="px-6 py-4 text-sm font-semibold text-slate-600">{r.description || '—'}</td>
                      ) : null}
                      <td className="px-6 py-4 text-end">
                        <ErpRowActions
                          onEdit={() => {
                            setEditing(r);
                            setForm({ code: r.code, name: r.name, description: r.description || '' });
                            setOpen(true);
                          }}
                          onDelete={async () => {
                            if (!confirm(t('departments.delete') + '?')) return;
                            await remove(r.id);
                            refresh();
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ErpTablePagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            pageSize={pagination.pageSize}
            shown={pagination.shown}
            total={pagination.total}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="erp-side-drawer hr-premium-drawer w-full border-s-0 p-0 sm:max-w-[62vw]">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{editing ? t('departments.edit') : t(addKey)}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">نموذج منظم لإضافة أو تعديل السجل بدون تداخل أو ازدحام.</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <ClipboardList className="h-6 w-6" />
              </span>
              <div>
                <h3>{editing ? t('departments.edit') : t(addKey)}</h3>
                <p>نموذج سريع ومنظم لإدارة بيانات الموارد البشرية بنفس شكل صفحات النظام الاحترافية.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {!editing ? (
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-600">{t('departments.deptCode')}</span>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="JT-001"
                  />
                </label>
              ) : null}
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-600">{t('departments.deptName')} *</span>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t(addKey)}
                />
              </label>
              {showDescription ? (
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-xs font-bold text-slate-600">{t('employeeGroups.description')}</span>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
              ) : null}
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={onSave} className="erp-add-save-action">
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
