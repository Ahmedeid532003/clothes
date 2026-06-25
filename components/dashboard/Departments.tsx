import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Clock3, TrendingUp, UsersRound } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
  type DepartmentDto,
} from '@/lib/api/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErpDataTable, type ErpColumn } from '@/components/erp/ErpDataTable';
import { ErpCrudPage } from '@/components/erp/ErpCrudPage';
import { ErpRowActions } from '@/components/erp/ErpRowActions';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';

function formatDate(value: string, locale: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function UserCell({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const label = name || '—';
  const initials =
    label === '—'
      ? '؟'
      : label
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join('');

  return (
    <div className="department-user-cell">
      <span className="department-user-avatar">
        {avatarUrl ? <img src={avatarUrl} alt={label} /> : <span>{initials}</span>}
      </span>
      <span className="font-bold text-slate-700">{label}</span>
    </div>
  );
}

function DepartmentKpi({
  label,
  value,
  icon,
  tone = 'blue',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'blue' | 'emerald' | 'slate' | 'violet';
  hint?: string;
}) {
  const toneClass = {
    blue: 'from-blue-50 to-white text-blue-700',
    emerald: 'from-emerald-50 to-white text-emerald-700',
    slate: 'from-slate-50 to-white text-slate-700',
    violet: 'from-violet-50 to-white text-violet-700',
  }[tone];

  return (
    <div className={`department-kpi-card rounded-2xl border bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-[11px] font-bold text-slate-400">{hint}</p> : null}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </span>
      </div>
      {tone === 'blue' ? (
        <svg className="mt-3 h-8 w-28 text-cyan-600" viewBox="0 0 120 34" fill="none" aria-hidden>
          <path d="M2 25C15 8 25 27 39 13C52 0 61 20 75 10C88 1 98 14 118 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
    </div>
  );
}

export const DepartmentsPage: React.FC = () => {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'view' | 'edit'>('add');
  const [active, setActive] = useState<DepartmentDto | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    manager_name: '',
    operational_budget: '0.00',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchDepartments());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesGlobal =
        !q ||
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.manager_name?.toLowerCase().includes(q) ||
        row.description?.toLowerCase().includes(q) ||
        row.created_by_name?.toLowerCase().includes(q);
      const matchesCode = !codeFilter || row.code.toLowerCase().includes(codeFilter.toLowerCase());
      const matchesName = !nameFilter || row.name.toLowerCase().includes(nameFilter.toLowerCase());
      return matchesGlobal && matchesCode && matchesName;
    });
  }, [codeFilter, nameFilter, rows, search]);

  const latest = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0],
    [rows],
  );

  const openAdd = () => {
    setMode('add');
    setActive(null);
    setForm({ code: '', name: '', manager_name: '', operational_budget: '0.00', description: '' });
    setOpen(true);
  };

  const openView = (row: DepartmentDto) => {
    setMode('view');
    setActive(row);
    setForm({
      code: row.code,
      name: row.name,
      manager_name: row.manager_name || '',
      operational_budget: String(row.operational_budget || '0.00'),
      description: row.description || '',
    });
    setOpen(true);
  };

  const openEdit = (row: DepartmentDto) => {
    setMode('edit');
    setActive(row);
    setForm({
      code: row.code,
      name: row.name,
      manager_name: row.manager_name || '',
      operational_budget: String(row.operational_budget || '0.00'),
      description: row.description || '',
    });
    setOpen(true);
  };

  const remove = async (row: DepartmentDto) => {
    if (!window.confirm(t('departments.confirmDelete'))) return;
    try {
      await deleteDepartment(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const save = async () => {
    if (mode === 'view') {
      setOpen(false);
      return;
    }
    if (!form.name.trim()) {
      setError(t('departments.enterName'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (mode === 'add') {
        const created = await createDepartment({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          manager_name: form.manager_name.trim(),
          operational_budget: form.operational_budget || '0.00',
          description: form.description.trim(),
        });
        setRows((prev) => [created, ...prev]);
      } else if (active) {
        const updated = await updateDepartment(active.id, {
          name: form.name.trim(),
          manager_name: form.manager_name.trim(),
          operational_budget: form.operational_budget || '0.00',
          description: form.description.trim(),
        });
        setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ErpColumn<DepartmentDto>[]>(
    () => [
      {
        key: 'code',
        header: t('departments.columns.id'),
        render: (row) => <span className="font-mono text-xs font-black text-blue-700">{row.code}</span>,
        exportValue: (row) => row.code,
      },
      {
        key: 'name',
        header: t('departments.columns.name'),
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-slate-900">{row.name}</span>
          </div>
        ),
        exportValue: (row) => row.name,
      },
      {
        key: 'createdBy',
        header: t('departments.columns.createdBy'),
        render: (row) => (
          <UserCell name={row.created_by_name || '—'} avatarUrl={row.created_by_avatar_url} />
        ),
        exportValue: (row) => row.created_by_name,
      },
      {
        key: 'manager',
        header: 'المدير المسؤول',
        render: (row) => <span className="font-bold text-slate-700">{row.manager_name || '—'}</span>,
        exportValue: (row) => row.manager_name,
      },
      {
        key: 'budget',
        header: 'الميزانية',
        render: (row) => (
          <span className="font-mono text-xs font-black text-emerald-700">
            {formatMoney(row.operational_budget)} ر.س
          </span>
        ),
        exportValue: (row) => row.operational_budget,
      },
      {
        key: 'description',
        header: 'الوصف',
        render: (row) => (
          <span className="line-clamp-1 max-w-48 text-xs font-bold text-slate-500">
            {row.description || '—'}
          </span>
        ),
        exportValue: (row) => row.description,
      },
      {
        key: 'createdAt',
        header: t('departments.columns.createdAt'),
        render: (row) => formatDate(row.created_at, locale),
        exportValue: (row) => formatDate(row.created_at, locale),
      },
      {
        key: 'modifiedBy',
        header: t('departments.columns.modifiedBy'),
        render: (row) => (
          <UserCell name={row.updated_by_name || '—'} avatarUrl={row.updated_by_avatar_url} />
        ),
        exportValue: (row) => row.updated_by_name,
      },
      {
        key: 'modifiedAt',
        header: t('departments.columns.modifiedAt'),
        render: (row) => formatDate(row.updated_at, locale),
        exportValue: (row) => formatDate(row.updated_at, locale),
      },
    ],
    [locale, t],
  );

  return (
    <ErpCrudPage
      className="departments-reference"
      title={t('departments.title')}
      breadcrumbs={[
        { label: t('departments.breadcrumbHr') },
        { label: t('departments.breadcrumbEmployees') },
        { label: t('departments.title') },
      ]}
      description="شاشة CRUD موحدة لإدارة الإدارات: بحث، فلترة، أعمدة، تصدير، تكبير، وإجراءات منظمة."
      stats={
        <div className="grid gap-3 md:grid-cols-4">
          <DepartmentKpi
            label="إجمالي الإدارات"
            value={rows.length}
            icon={<Building2 className="h-5 w-5" />}
            tone="blue"
            hint="محدث لحظياً"
          />
          <DepartmentKpi
            label="عدد الموظفين"
            value="—"
            icon={<UsersRound className="h-5 w-5" />}
            tone="slate"
            hint="يربط لاحقاً بتوزيع الإدارات"
          />
          <DepartmentKpi
            label="النشطة"
            value={rows.filter((row) => row.is_active).length}
            icon={<Activity className="h-5 w-5" />}
            tone="emerald"
            hint="إدارات قابلة للاستخدام"
          />
          <DepartmentKpi
            label="آخر إضافة"
            value={latest?.name || '—'}
            icon={latest ? <TrendingUp className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
            tone="violet"
            hint={latest ? formatDate(latest.created_at, locale) : 'لا توجد إضافات'}
          />
        </div>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <ErpDataTable
        title="قائمة الإدارات"
        description="جدول حديث لإدارة الإدارات مع بحث، تصدير، تخصيص أعمدة، وإجراءات منظمة."
        rows={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        emptyMessage={t('departments.empty')}
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={openAdd}
        addLabel={t('departments.addNew')}
        onImport={() => window.alert('سيتم ربط استيراد الإدارات في خطوة لاحقة.')}
        onRowClick={openView}
        advancedFilters={
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={codeFilter}
              onChange={(event) => setCodeFilter(event.target.value)}
              placeholder={t('departments.columns.id')}
            />
            <Input
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder={t('departments.columns.name')}
            />
          </div>
        }
        renderRowActions={(row) => (
          <ErpRowActions
            onView={() => openView(row)}
            onEdit={() => openEdit(row)}
            onDelete={() => remove(row)}
          />
        )}
      />

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={
          mode === 'add'
            ? t('departments.addTitle')
            : mode === 'edit'
              ? t('departments.editTitle')
              : t('departments.viewTitle')
        }
        description={
          mode === 'add'
            ? t('departments.addSubtitle')
            : mode === 'edit'
              ? t('departments.editSubtitle')
              : t('departments.viewSubtitle')
        }
        onSave={save}
        saveLabel={mode === 'view' ? t('departments.cancel') : t('departments.save')}
        disabled={saving}
        width="wide"
        className="departments-drawer"
      >
        <div className="departments-drawer-layout">
          <section className="departments-form-card">
            <div className="departments-form-card-title">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <h3>بيانات الإدارة</h3>
                <p>أدخل كود واسم الإدارة، وسيظهر شكلها في الجدول بنفس التصميم.</p>
              </div>
            </div>

            <div className="departments-form-grid">
              <div className="departments-field">
                <label>{t('departments.deptCode')}</label>
                <Input
                  className="departments-input"
                  value={form.code}
                  disabled={mode !== 'add'}
                  placeholder={t('departments.enterCode')}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>
              <div className="departments-field">
                <label>{t('departments.deptName')}</label>
                <Input
                  className="departments-input"
                  value={form.name}
                  disabled={mode === 'view'}
                  placeholder={t('departments.enterName')}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="departments-field">
                <label>المدير المسؤول</label>
                <Input
                  className="departments-input"
                  value={form.manager_name}
                  disabled={mode === 'view'}
                  placeholder="أدخل اسم المدير المسؤول"
                  onChange={(event) => setForm((prev) => ({ ...prev, manager_name: event.target.value }))}
                />
              </div>
              <div className="departments-field">
                <label>الميزانية التشغيلية</label>
                <div className="departments-money-input">
                  <span>ر.س</span>
                  <Input
                    className="departments-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.operational_budget}
                    disabled={mode === 'view'}
                    onChange={(event) => setForm((prev) => ({ ...prev, operational_budget: event.target.value }))}
                  />
                </div>
              </div>
              <div className="departments-field departments-field-wide">
                <label>وصف الإدارة</label>
                <textarea
                  className="departments-textarea"
                  disabled={mode === 'view'}
                  value={form.description}
                  placeholder="وصف مختصر لطبيعة عمل الإدارة..."
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
            </div>
          </section>

          <aside className="departments-audit-card">
            <h3>{mode === 'add' ? 'معاينة قبل الحفظ' : t('departments.viewDetails')}</h3>
            <div className="departments-side-preview">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Building2 className="h-7 w-7" />
              </span>
              <div>
                <p>{form.code || 'Auto'}</p>
                <h4>{form.name || 'اسم الإدارة الجديدة'}</h4>
              </div>
            </div>
            <dl className="departments-detail-list">
              <div>
                <dt>كود الإدارة</dt>
                <dd>{form.code || 'Auto'}</dd>
              </div>
              <div>
                <dt>اسم الإدارة</dt>
                <dd>{form.name || '—'}</dd>
              </div>
              <div>
                <dt>المدير المسؤول</dt>
                <dd>{form.manager_name || '—'}</dd>
              </div>
              <div>
                <dt>الميزانية التشغيلية</dt>
                <dd>{formatMoney(form.operational_budget)} ر.س</dd>
              </div>
              <div>
                <dt>وصف الإدارة</dt>
                <dd>{form.description || '—'}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
              <p className="mb-2 text-xs font-black text-slate-500">المسؤول</p>
              <UserCell
                name={active?.updated_by_name || active?.created_by_name || 'المستخدم الحالي'}
                avatarUrl={active?.updated_by_avatar_url || active?.created_by_avatar_url}
              />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold text-slate-500">{t('departments.createdBy')}</dt>
                <dd className="font-bold text-slate-800">
                  {active ? (
                    <UserCell name={active.created_by_name || '—'} avatarUrl={active.created_by_avatar_url} />
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{t('departments.created')}</dt>
                <dd className="font-bold text-slate-800">{active ? formatDate(active.created_at, locale) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{t('departments.modifiedBy')}</dt>
                <dd className="font-bold text-slate-800">
                  {active ? (
                    <UserCell name={active.updated_by_name || '—'} avatarUrl={active.updated_by_avatar_url} />
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">{t('departments.columns.modifiedAt')}</dt>
                <dd className="font-bold text-slate-800">{active ? formatDate(active.updated_at, locale) : '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </ErpSideDrawer>
    </ErpCrudPage>
  );
};
