import React, { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronRight, X, MoreVertical, Eye, Edit, Trash2, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchDepartments, type DepartmentDto } from '@/lib/api/departments';
import { fetchHrSections, type HrSectionDto } from '@/lib/api/hr-sections';
import { fetchWorkShifts, type WorkShiftDto } from '@/lib/api/work-shifts';
import {
  createEmployee,
  deactivateEmployee,
  fetchEmployeeLimits,
  fetchEmployees,
  fetchPermissionsSchema,
  updateEmployee,
  type EmployeeDto,
  type EmployeeLimitsDto,
  type PermissionsSchemaDto,
  type UserPermissions,
} from '@/lib/api/employees';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import type { BranchAccessMode } from '@/lib/api/auth';
import { buildEmptyPermissions, mergeWithSchema } from '@/lib/permissions/defaults';
import { PermissionsEditor } from '@/components/hr/PermissionsEditor';
import { BranchAccessEditor } from '@/components/hr/BranchAccessEditor';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type EmployeeRow = {
  uuid: string;
  code: string;
  username: string;
  fullName: string;
  departmentName: string;
  departmentId: string | null;
  hrSectionName: string;
  hrSectionId: string | null;
  workShiftName: string;
  workShiftId: string | null;
  hireDate: string | null;
  usesSystem: boolean;
  createdBy: string;
  createdAt: string;
  modifiedBy: string;
  modifiedAt: string;
  isOwner: boolean;
  permissions: UserPermissions;
  branchMode: BranchAccessMode;
  branchIds: string[];
  defaultBranchId: string;
};

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function mapEmployee(e: EmployeeDto, locale: string): EmployeeRow {
  return {
    uuid: e.id,
    code: e.employee_code,
    username: e.username,
    fullName: e.full_name || e.username,
    departmentName: e.department_name || '—',
    departmentId: e.department,
    hrSectionName: e.hr_section_name || '—',
    hrSectionId: e.hr_section,
    workShiftName: e.work_shift_name || '—',
    workShiftId: e.work_shift,
    hireDate: e.hire_date,
    usesSystem: e.uses_system,
    createdBy: e.created_by_name || '—',
    createdAt: formatDate(e.created_at, locale),
    modifiedBy: e.updated_by_name || '—',
    modifiedAt: formatDate(e.updated_at, locale),
    isOwner: e.is_owner,
    permissions: e.permissions,
    branchMode: e.branch_access_mode ?? 'all',
    branchIds:
      e.branch_access_mode === 'all'
        ? []
        : (e.allowed_branch_ids ?? (e.default_branch ? [e.default_branch] : [])),
    defaultBranchId: e.default_branch ?? '',
  };
}

function getBranchAccessDisplay(
  row: EmployeeRow,
  branches: BranchDto[],
  t: (key: string) => string,
): string {
  if (row.isOwner) return t('createUsers.branchAccessOwner');
  if (row.branchMode === 'all') return t('createUsers.branchMode.all');
  const names = row.branchIds
    .map((id) => {
      const b = branches.find((x) => x.id === id);
      return b?.name_ar || b?.name_en || b?.code;
    })
    .filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(' · ') : '—';
}

function branchPayload(
  grantAll: boolean,
  mode: BranchAccessMode,
  selectedIds: string[],
  defaultId: string,
) {
  if (grantAll) {
    return { branch_access_mode: 'all' as const };
  }
  return {
    branch_access_mode: mode,
    default_branch_id: defaultId || null,
    allowed_branch_ids: mode === 'all' ? [] : selectedIds,
  };
}

const emptyForm = () => ({
  usesSystem: false,
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  hireDate: '',
  departmentId: '',
  hrSectionId: '',
  workShiftId: '',
});

export const CreateUsersPage: React.FC = () => {
  const { t, locale, isRtl } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [hrSections, setHrSections] = useState<HrSectionDto[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShiftDto[]>([]);
  const [limits, setLimits] = useState<EmployeeLimitsDto | null>(null);
  const [schema, setSchema] = useState<PermissionsSchemaDto | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({ pages: {}, features: {}, actions: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [grantAll, setGrantAll] = useState(false);
  const [allBranches, setAllBranches] = useState<BranchDto[]>([]);
  const [branchMode, setBranchMode] = useState<BranchAccessMode>('all');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [defaultBranchId, setDefaultBranchId] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, deptData, limData, schemaData, branchData] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchEmployeeLimits(),
        fetchPermissionsSchema(),
        fetchBranches(),
      ]);
      setAllBranches(branchData.filter((b) => b.is_active));
      setEmployees(empData.map((e) => mapEmployee(e, locale)));
      setDepartments(deptData);
      setWorkShifts(await fetchWorkShifts());
      setLimits(limData);
      setSchema(schemaData);
      setPermissions(mergeWithSchema(undefined, schemaData.pages, schemaData.features));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!form.departmentId) {
      setHrSections([]);
      return;
    }
    fetchHrSections(form.departmentId)
      .then(setHrSections)
      .catch(() => setHrSections([]));
  }, [form.departmentId]);

  const filtered = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.code.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.fullName.toLowerCase().includes(q) ||
      e.departmentName.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    if (limits && !limits.can_add) {
      setError(t('createUsers.limitReached', { max: String(limits.max_users) }));
      return;
    }
    setDrawerMode('add');
    setSelected(null);
    setForm(emptyForm());
    setGrantAll(false);
    if (schema) {
      setPermissions(buildEmptyPermissions(schema.pages, schema.features));
    }
    setBranchMode('all');
    setSelectedBranchIds([]);
    setDefaultBranchId('');
    setIsDrawerOpen(true);
  };

  const openEdit = (row: EmployeeRow) => {
    setDrawerMode('edit');
    setSelected(row);
    setForm({
      usesSystem: row.usesSystem,
      username: row.username,
      password: '',
      fullName: row.fullName,
      email: '',
      phone: '',
      hireDate: row.hireDate ?? '',
      departmentId: row.departmentId ?? '',
      hrSectionId: row.hrSectionId ?? '',
      workShiftId: row.workShiftId ?? '',
    });
    if (schema) {
      setPermissions(mergeWithSchema(row.permissions, schema.pages, schema.features));
    }
    setGrantAll(false);
    setBranchMode(row.branchMode);
    setSelectedBranchIds(row.branchIds);
    setDefaultBranchId(row.defaultBranchId);
    setIsDrawerOpen(true);
    setActiveMenu(null);
  };

  const openView = (row: EmployeeRow) => {
    setDrawerMode('view');
    setSelected(row);
    setForm({
      usesSystem: row.usesSystem,
      username: row.username,
      password: '',
      fullName: row.fullName,
      email: '',
      phone: '',
      hireDate: row.hireDate ?? '',
      departmentId: row.departmentId ?? '',
      hrSectionId: row.hrSectionId ?? '',
      workShiftId: row.workShiftId ?? '',
    });
    if (schema) {
      setPermissions(mergeWithSchema(row.permissions, schema.pages, schema.features));
    }
    setBranchMode(row.branchMode);
    setSelectedBranchIds(row.branchIds);
    setDefaultBranchId(row.defaultBranchId);
    setIsDrawerOpen(true);
    setActiveMenu(null);
  };

  const handleDeactivate = async (uuid: string) => {
    try {
      await deactivateEmployee(uuid);
      setEmployees((prev) => prev.filter((e) => e.uuid !== uuid));
      const lim = await fetchEmployeeLimits();
      setLimits(lim);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
    setActiveMenu(null);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    if (form.usesSystem && (!form.username.trim() || (drawerMode === 'add' && !form.password.trim()))) return;
    setSaving(true);
    setError(null);
    try {
      if (drawerMode === 'add') {
        const created = await createEmployee({
          uses_system: form.usesSystem,
          username: form.usesSystem ? form.username.trim() : undefined,
          password: form.usesSystem ? form.password : undefined,
          hire_date: form.hireDate || null,
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          department_id: form.departmentId || null,
          hr_section_id: form.hrSectionId || null,
          work_shift_id: form.workShiftId || null,
          permissions: form.usesSystem && !grantAll ? permissions : undefined,
          grant_all_permissions: form.usesSystem && grantAll,
          ...(form.usesSystem ? branchPayload(grantAll, branchMode, selectedBranchIds, defaultBranchId) : {}),
        });
        setEmployees((prev) => [mapEmployee(created, locale), ...prev]);
      } else if (drawerMode === 'edit' && selected) {
        const updated = await updateEmployee(selected.uuid, {
          uses_system: form.usesSystem,
          hire_date: form.hireDate || null,
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          department_id: form.departmentId || null,
          hr_section_id: form.hrSectionId || null,
          work_shift_id: form.workShiftId || null,
          password: form.password || undefined,
          permissions: form.usesSystem && !selected.isOwner ? permissions : undefined,
          ...(form.usesSystem && !selected.isOwner
            ? branchPayload(false, branchMode, selectedBranchIds, defaultBranchId)
            : {}),
        });
        setEmployees((prev) =>
          prev.map((e) => (e.uuid === selected.uuid ? mapEmployee(updated, locale) : e)),
        );
      }
      const lim = await fetchEmployeeLimits();
      setLimits(lim);
      setIsDrawerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const readOnly = drawerMode === 'view' || selected?.isOwner;

  return (
    <div className="hr-create-users-page w-full pb-6 px-4 md:px-8 text-slate-900">
      <div className="sticky top-[56px] z-50 -mx-4 md:-mx-8 bg-white/90 backdrop-blur-xl">
        <div className="w-full px-4 md:px-8 pt-2 pb-2">
          <div className="hr-create-users-mini-hero mb-1">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
            <h1 className="text-2xl font-black text-slate-900">{t('createUsers.title')}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2.5">
              <span>{t('createUsers.breadcrumbHr')}</span>
              <ChevronRight size={10} className="rtl:rotate-180" />
              <span>{t('createUsers.breadcrumbEmployees')}</span>
              <ChevronRight size={10} className="rtl:rotate-180" />
              <span className="text-slate-900 font-medium">{t('createUsers.title')}</span>
            </div>
            </div>
          </div>

          {limits && (
            <p className="text-xs font-semibold text-slate-500 mt-2">
              {t('createUsers.usersCount', {
                current: String(limits.current_users),
                max: String(limits.max_users),
                plan: limits.plan_name,
              })}
            </p>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
            <ErpAddButton onClick={openAdd} disabled={!!limits && !limits.can_add}>
              {t('createUsers.addNew')}
            </ErpAddButton>
            <ErpSearchBar
              className="max-w-md flex-1"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('createUsers.searchPlaceholder')}
              showAdvanced={false}
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600 font-medium">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">{t('createUsers.loading')}</p>}

      {!loading && (
        <div className="hr-premium-table-card mt-4">
          <div className="hr-premium-table-header">
            <div>
              <h2>مستخدمو وملفات الموظفين</h2>
              <p>إدارة بيانات الموظف، الدخول للنظام، الفروع، والصلاحيات من نفس الشاشة.</p>
            </div>
            <span>{filtered.length} سجل</span>
          </div>
          <div className="overflow-x-auto">
          <table className="hr-premium-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="w-10 p-2" />
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.code')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.username')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.name')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.department')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.branches')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.createdBy')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.createdAt')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.modifiedBy')}</th>
                <th className="p-3 font-bold text-slate-700">{t('createUsers.columns.modifiedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.uuid}>
                  <td className="p-2 relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === row.uuid ? null : row.uuid)}
                      className="p-1 rounded-full hover:bg-slate-100"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeMenu === row.uuid && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                        <div className="absolute left-10 top-0 z-50 w-36 bg-white border border-slate-200 rounded-lg shadow-xl py-1">
                          <button type="button" onClick={() => openView(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                            <Eye size={16} className="text-blue-500" /> {t('createUsers.view')}
                          </button>
                          <button type="button" onClick={() => openEdit(row)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                            <Edit size={16} className="text-amber-500" /> {t('createUsers.edit')}
                          </button>
                          {!row.isOwner && (
                            <button type="button" onClick={() => handleDeactivate(row.uuid)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                              <Trash2 size={16} /> {t('createUsers.deactivate')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs font-black text-blue-700">{row.code}</td>
                  <td className="p-3 font-semibold text-slate-700">{row.username}</td>
                  <td className="p-3 font-extrabold text-slate-900">{row.fullName}</td>
                  <td className="p-3 text-slate-600">{row.departmentName}</td>
                  <td className="p-3 text-slate-600 max-w-[220px]">
                    <span
                      className="line-clamp-2"
                      title={getBranchAccessDisplay(row, allBranches, t)}
                    >
                      {getBranchAccessDisplay(row, allBranches, t)}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{row.createdBy}</td>
                  <td className="p-3 text-slate-500">{row.createdAt}</td>
                  <td className="p-3 text-slate-600">{row.modifiedBy}</td>
                  <td className="p-3 text-slate-500">{row.modifiedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length === 0 && (
            <div className="m-5 hr-premium-empty-state">{t('createUsers.noEmployees')}</div>
          )}
        </div>
      )}

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="center" className="erp-form-modal erp-side-drawer hr-premium-drawer erp-form-modal--full w-full flex flex-col p-0">
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>
              {drawerMode === 'add' && t('createUsers.addTitle')}
              {drawerMode === 'edit' && t('createUsers.editTitle')}
              {drawerMode === 'view' && t('createUsers.viewTitle')}
            </SheetTitle>
          </SheetHeader>

          <div className="erp-side-drawer-body flex-1 overflow-y-auto p-6 space-y-4">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <UsersRound className="h-6 w-6" />
              </span>
              <div>
              <p className="text-sm font-black text-slate-900">بيانات الموظف الأساسية</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                الموظف قد يكون ملف HR فقط، أو ملف HR + مستخدم للنظام حسب الاختيار.
              </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.fullName')}</label>
              <Input
                value={form.fullName}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">تاريخ التعيين</label>
              <Input
                type="date"
                value={form.hireDate}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="hr-premium-check-card">
              <label className="flex items-center justify-between gap-3 text-sm font-black text-slate-800">
                <span>هل الموظف سيستخدم النظام؟</span>
                <input
                  type="checkbox"
                  checked={form.usesSystem}
                  disabled={drawerMode !== 'add' && !form.usesSystem}
                  onChange={(e) => setForm((f) => ({ ...f, usesSystem: e.target.checked }))}
                />
              </label>
            </div>
            {form.usesSystem ? (
              <>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.username')}</label>
              <Input
                value={form.username}
                disabled={drawerMode !== 'add'}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="mt-1"
              />
            </div>
            {drawerMode !== 'view' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.password')}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={drawerMode === 'edit' ? t('createUsers.fields.passwordOptional') : ''}
                  className="mt-1"
                />
              </div>
            )}
              </>
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                سيتم إنشاء ملف موظف فقط بدون صلاحيات دخول للنظام. يمكن تحويله لاحقًا لمستخدم نظام من شاشة التعديل.
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.department')}</label>
              <select
                value={form.departmentId}
                disabled={readOnly}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    departmentId: e.target.value,
                    hrSectionId: '',
                  }))
                }
                className="mt-1 w-full h-11 rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="">{t('createUsers.fields.noDepartment')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.hrSection')}</label>
              <select
                value={form.hrSectionId}
                disabled={readOnly || !form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, hrSectionId: e.target.value }))}
                className="mt-1 w-full h-11 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-50"
              >
                <option value="">{t('createUsers.fields.noSection')}</option>
                {hrSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{t('createUsers.fields.workShift')}</label>
              <select
                value={form.workShiftId}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, workShiftId: e.target.value }))}
                className="mt-1 w-full h-11 rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="">{t('createUsers.fields.noShift')}</option>
                {workShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {form.usesSystem && !readOnly && drawerMode === 'add' && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={grantAll} onChange={(e) => setGrantAll(e.target.checked)} />
                {t('createUsers.grantAll')}
              </label>
            )}

            {form.usesSystem && !selected?.isOwner && !grantAll && allBranches.length > 0 && (
              <BranchAccessEditor
                branches={allBranches}
                mode={branchMode}
                onModeChange={setBranchMode}
                selectedBranchIds={selectedBranchIds}
                onSelectedChange={setSelectedBranchIds}
                defaultBranchId={defaultBranchId}
                onDefaultBranchChange={setDefaultBranchId}
                disabled={readOnly}
              />
            )}

            {form.usesSystem && schema && !grantAll && !selected?.isOwner && (
              <div className="hr-permissions-shell">
                <p className="text-sm font-bold text-slate-800 mb-3">
                  <ShieldCheck className="me-2 inline h-4 w-4 text-blue-700" />
                  {t('createUsers.permissionsTitle')}
                </p>
                <PermissionsEditor
                  schema={schema}
                  value={permissions}
                  onChange={setPermissions}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {drawerMode !== 'view' && !selected?.isOwner && (
            <SheetFooter className="erp-side-drawer-footer p-4 border-t flex gap-2">
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                {t('createUsers.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t('createUsers.saving') : t('createUsers.save')}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
