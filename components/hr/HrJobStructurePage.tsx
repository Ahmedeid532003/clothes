import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  Download,
  Layers3,
  Loader2,
  Maximize2,
  Minimize2,
  Gift,
  Palmtree,
  Pencil,
  Trash2,
  TrendingDown,
  UserRoundCheck,
} from 'lucide-react';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { canViewPage } from '@/lib/permissions/access';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
  type DepartmentDto,
} from '@/lib/api/departments';
import {
  createHrSection,
  deleteHrSection,
  fetchHrSections,
  updateHrSection,
  type HrSectionDto,
} from '@/lib/api/hr-sections';
import { jobTitlesApi, type JobTitleDto } from '@/lib/api/job-titles';
import { employeeGroupsApi, type EmployeeGroupDto } from '@/lib/api/employee-groups';
import { fetchEmployees, type EmployeeDto } from '@/lib/api/employees';
import {
  allowanceItemsApi,
  allowancesApi,
  deductionItemsApi,
  deductionsApi,
  leaveTypesApi,
  leavesApi,
  officialHolidaysApi,
  type OfficialHolidayRow,
} from '@/lib/api/hr-payroll';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { HrStructureField, HrStructureModal } from '@/components/hr/HrStructureModal';
import { exportJobStructureSectionPdf } from '@/lib/hr/job-structure-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type FinancialItem = {
  id: string;
  name: string;
  default_amount: string;
  kind: 'allowance' | 'deduction';
};

type DrawerKind =
  | 'department'
  | 'section'
  | 'group'
  | 'jobTitle'
  | 'holiday'
  | 'financial'
  | 'allowance'
  | 'deduction';

const GROUP_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
};

const COLOR_PICKER = [
  { id: 'blue', dot: 'bg-blue-500' },
  { id: 'sky', dot: 'bg-sky-500' },
  { id: 'violet', dot: 'bg-violet-500' },
  { id: 'pink', dot: 'bg-pink-500' },
] as const;

const JOB_LEVELS = ['A', 'B', 'C', 'D'] as const;

function fmtMoney(value: string | number) {
  return Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type StructureSectionId =
  | 'departments'
  | 'sections'
  | 'groups'
  | 'jobTitles'
  | 'holidays'
  | 'financial';

function StructureCircleBtn({
  isActive = false,
  onClick,
  ariaLabel,
  title,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`hr-structure-circle-btn ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      <span className="hr-structure-expand-btn-glow" aria-hidden />
      <span className="hr-structure-expand-btn-ring" aria-hidden />
      <span className="hr-structure-expand-btn-core">{children}</span>
    </button>
  );
}

function StructureCard({
  sectionId,
  title,
  count,
  description,
  onAdd,
  onSecondaryAdd,
  secondaryAddLabel,
  onDownload,
  canAdd,
  canSecondaryAdd,
  isFocused,
  isHidden,
  onToggleFocus,
  children,
}: {
  sectionId: StructureSectionId;
  title: string;
  count: number;
  description?: string;
  onAdd: () => void;
  onSecondaryAdd?: () => void;
  secondaryAddLabel?: string;
  onDownload?: () => void | Promise<void>;
  canAdd?: boolean;
  canSecondaryAdd?: boolean;
  isFocused: boolean;
  isHidden: boolean;
  onToggleFocus: (id: StructureSectionId) => void;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const cardRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!isFocused || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isFocused]);

  const handleDownload = async () => {
    if (!onDownload || downloading) return;
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  if (isHidden) return null;

  return (
    <article
      ref={cardRef}
      data-section={sectionId}
      className={`hr-structure-card ${isFocused ? 'is-focused' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
    >
      <header className="hr-structure-card-header">
        <div className="hr-structure-card-title-wrap">
          <StructureCircleBtn
            isActive={!isCollapsed}
            onClick={() => setIsCollapsed((v) => !v)}
            ariaLabel={isCollapsed ? t('hrJobStructure.expandSection') : t('hrJobStructure.collapseSection')}
            title={isCollapsed ? t('hrJobStructure.expandSection') : t('hrJobStructure.collapseSection')}
          >
            <ChevronDown className="hr-structure-expand-icon" strokeWidth={2.75} />
          </StructureCircleBtn>
          <h3>{title}</h3>
          <span className="hr-structure-count">{count}</span>
          {isFocused ? <span className="hr-structure-focused-badge">{t('hrJobStructure.focusedMode')}</span> : null}
        </div>
        <div className="hr-structure-card-actions">
          <StructureCircleBtn
            isActive={isFocused}
            onClick={() => onToggleFocus(sectionId)}
            ariaLabel={isFocused ? t('hrJobStructure.unfocusSection') : t('hrJobStructure.focusSection')}
            title={isFocused ? t('hrJobStructure.unfocusSection') : t('hrJobStructure.focusSection')}
          >
            {isFocused ? (
              <Minimize2 className="hr-structure-focus-icon" strokeWidth={2.5} />
            ) : (
              <Maximize2 className="hr-structure-focus-icon" strokeWidth={2.5} />
            )}
          </StructureCircleBtn>
          {onDownload ? (
            <button
              type="button"
              className={`hr-structure-download-btn ${downloading ? 'is-loading' : ''}`}
              onClick={handleDownload}
              disabled={downloading}
              aria-label={t('hrJobStructure.downloadPdf')}
              title={t('hrJobStructure.downloadPdf')}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          ) : null}
          {canAdd ? (
            <div className="hr-structure-action-stack">
              <ErpAddButton onClick={onAdd}>{t('hrJobStructure.add')}</ErpAddButton>
              {canSecondaryAdd && onSecondaryAdd ? (
                <ErpAddButton icon={UserRoundCheck} onClick={onSecondaryAdd}>
                  {secondaryAddLabel || t('hrJobStructure.assignLeave')}
                </ErpAddButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <div className="hr-structure-card-panel">
        <div className="hr-structure-card-panel-inner">
          {description ? <p className="hr-structure-card-desc">{description}</p> : null}
          <div className="hr-structure-card-body">{children}</div>
        </div>
      </div>
    </article>
  );
}

function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="hr-structure-item-actions">
      <button type="button" className="hr-structure-icon-btn hr-structure-icon-edit" onClick={onEdit} aria-label="edit">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" className="hr-structure-icon-btn hr-structure-icon-delete" onClick={onDelete} aria-label="delete">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function HrJobStructurePage() {
  const { t, isRtl } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [assignLeaveError, setAssignLeaveError] = useState<string | null>(null);
  const [assignFinancialOpen, setAssignFinancialOpen] = useState(false);
  const [assignFinancialKind, setAssignFinancialKind] = useState<'allowance' | 'deduction'>('allowance');
  const [assignFinancialError, setAssignFinancialError] = useState<string | null>(null);
  const [assignFinancialForm, setAssignFinancialForm] = useState({
    employee_id: '',
    item_id: '',
    amount: '',
    deduction_date: new Date().toISOString().slice(0, 10),
  });
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [sections, setSections] = useState<HrSectionDto[]>([]);
  const [groups, setGroups] = useState<EmployeeGroupDto[]>([]);
  const [titles, setTitles] = useState<JobTitleDto[]>([]);
  const [holidays, setHolidays] = useState<OfficialHolidayRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [financialItems, setFinancialItems] = useState<FinancialItem[]>([]);

  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', manager_name: '', code: '' });
  const [sectionForm, setSectionForm] = useState({ name: '', code: '', department_id: '' });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: 'blue' });
  const [titleForm, setTitleForm] = useState({ name: '', job_level: 'B', code: '' });
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    holiday_date: '',
    is_recurring: false,
    noFixedDate: true,
  });
  const [editingHolidayKind, setEditingHolidayKind] = useState<'leave_type' | 'holiday' | null>(null);
  const [assignLeaveOpen, setAssignLeaveOpen] = useState(false);
  const [assignLeaveForm, setAssignLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    unit: 'days' as 'days' | 'hours',
    quantity: '1',
    notes: '',
  });
  const [financialForm, setFinancialForm] = useState({ name: '', default_amount: '' });
  const [financialKind, setFinancialKind] = useState<'allowance' | 'deduction'>('allowance');

  const perms = useMemo(
    () => ({
      departments: canViewPage(user, 'departments'),
      sections: canViewPage(user, 'hr-sections'),
      groups: canViewPage(user, 'employee-groups'),
      titles: canViewPage(user, 'job-titles'),
      holidays: canViewPage(user, 'official-holidays') || canViewPage(user, 'leave-types'),
      assignLeaves: canViewPage(user, 'leaves'),
      assignFinancial: canViewPage(user, 'allowances') || canViewPage(user, 'deductions'),
      assignAllowances: canViewPage(user, 'allowances'),
      assignDeductions: canViewPage(user, 'deductions'),
      allowances: canViewPage(user, 'allowance-items'),
      deductions: canViewPage(user, 'deduction-items'),
    }),
    [user],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depts, sects, gr, ti, hol, lt, em, al, ded] = await Promise.all([
        perms.departments ? fetchDepartments().catch(() => []) : Promise.resolve([]),
        perms.sections ? fetchHrSections().catch(() => []) : Promise.resolve([]),
        perms.groups ? employeeGroupsApi.list().catch(() => []) : Promise.resolve([]),
        perms.titles ? jobTitlesApi.list().catch(() => []) : Promise.resolve([]),
        perms.holidays ? officialHolidaysApi.list().catch(() => []) : Promise.resolve([]),
        perms.holidays ? leaveTypesApi.list().catch(() => []) : Promise.resolve([]),
        perms.assignLeaves || perms.assignFinancial ? fetchEmployees().catch(() => []) : Promise.resolve([]),
        perms.allowances ? allowanceItemsApi.list().catch(() => []) : Promise.resolve([]),
        perms.deductions ? deductionItemsApi.list().catch(() => []) : Promise.resolve([]),
      ]);
      setDepartments(depts);
      setSections(sects);
      setGroups(gr);
      setTitles(ti);
      setHolidays(hol);
      setLeaveTypes(lt);
      setEmployees(em.filter((x) => x.is_active));
      setFinancialItems([
        ...al.map((row) => ({
          id: row.id,
          name: row.name,
          default_amount: String((row as { default_amount?: string }).default_amount || '0'),
          kind: 'allowance' as const,
        })),
        ...ded.map((row) => ({
          id: row.id,
          name: row.name,
          default_amount: String((row as { default_amount?: string }).default_amount || '0'),
          kind: 'deduction' as const,
        })),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [perms]);

  useEffect(() => {
    load();
  }, [load]);

  const openDrawer = (kind: DrawerKind, id?: string, holidayKind?: 'leave_type' | 'holiday') => {
    setEditingId(id || null);
    setDrawer(kind);
    setDrawerError(null);
    if (kind === 'department' && id) {
      const row = departments.find((d) => d.id === id);
      if (row) setDeptForm({ name: row.name, manager_name: row.manager_name || '', code: row.code });
    } else if (kind === 'department') {
      setDeptForm({ name: '', manager_name: '', code: '' });
    } else if (kind === 'section' && id) {
      const row = sections.find((s) => s.id === id);
      if (row) setSectionForm({ name: row.name, code: row.code, department_id: row.department_id });
    } else if (kind === 'section') {
      setSectionForm({ name: '', code: '', department_id: departments[0]?.id || '' });
    } else if (kind === 'group' && id) {
      const row = groups.find((g) => g.id === id);
      if (row) setGroupForm({ name: row.name, description: row.description || '', color: row.color || 'blue' });
    } else if (kind === 'group') {
      setGroupForm({ name: '', description: '', color: 'blue' });
    } else if (kind === 'jobTitle' && id) {
      const row = titles.find((x) => x.id === id);
      if (row) setTitleForm({ name: row.name, job_level: row.job_level || 'B', code: row.code });
    } else if (kind === 'jobTitle') {
      setTitleForm({ name: '', job_level: 'B', code: '' });
    } else if (kind === 'holiday' && id) {
      if (holidayKind === 'leave_type') {
        const row = leaveTypes.find((h) => h.id === id);
        if (row) {
          setEditingHolidayKind('leave_type');
          setHolidayForm({ name: row.name, holiday_date: '', is_recurring: false, noFixedDate: true });
        }
      } else {
        const row = holidays.find((h) => h.id === id);
        if (row) {
          setEditingHolidayKind('holiday');
          setHolidayForm({
            name: row.name,
            holiday_date: row.holiday_date || '',
            is_recurring: row.is_recurring,
            noFixedDate: false,
          });
        }
      }
    } else if (kind === 'holiday') {
      setEditingHolidayKind(null);
      setHolidayForm({ name: '', holiday_date: '', is_recurring: false, noFixedDate: true });
    } else if (kind === 'financial') {
      setFinancialKind('allowance');
      setFinancialForm({ name: '', default_amount: '' });
    } else if ((kind === 'allowance' || kind === 'deduction' || kind === 'financial') && id) {
      const rowKind = kind === 'deduction' ? 'deduction' : 'allowance';
      const row = financialItems.find((f) => f.id === id && f.kind === rowKind);
      if (row) {
        setFinancialKind(row.kind);
        setFinancialForm({ name: row.name, default_amount: row.default_amount });
      }
    } else if (kind === 'allowance' || kind === 'deduction') {
      setFinancialKind(kind);
      setFinancialForm({ name: '', default_amount: '' });
    }
  };

  const saveDrawer = async () => {
    setDrawerError(null);
    try {
      if (drawer === 'department') {
        if (!deptForm.name.trim()) {
          setDrawerError(t('hrJobStructure.errNameRequired'));
          return;
        }
        if (editingId) {
          await updateDepartment(editingId, {
            name: deptForm.name.trim(),
            manager_name: deptForm.manager_name.trim(),
          });
        } else {
          await createDepartment({
            name: deptForm.name.trim(),
            manager_name: deptForm.manager_name.trim(),
          });
        }
      } else if (drawer === 'section') {
        if (!sectionForm.name.trim() || !sectionForm.department_id) return;
        if (editingId) {
          await updateHrSection(editingId, { name: sectionForm.name.trim() });
        } else {
          await createHrSection({
            department_id: sectionForm.department_id,
            name: sectionForm.name.trim(),
          });
        }
      } else if (drawer === 'group') {
        if (!groupForm.name.trim()) return;
        if (editingId) {
          await employeeGroupsApi.update(editingId, groupForm);
        } else {
          await employeeGroupsApi.create(groupForm);
        }
      } else if (drawer === 'jobTitle') {
        if (!titleForm.name.trim()) return;
        if (editingId) {
          await jobTitlesApi.update(editingId, { name: titleForm.name.trim(), job_level: titleForm.job_level });
        } else {
          await jobTitlesApi.create({
            name: titleForm.name.trim(),
            job_level: titleForm.job_level,
          });
        }
      } else if (drawer === 'holiday') {
        const name = holidayForm.name.trim();
        if (!name) {
          setDrawerError(t('hrJobStructure.errNameRequired'));
          return;
        }
        let saved = false;
        if (holidayForm.noFixedDate) {
          const body = { name };
          if (editingId && editingHolidayKind === 'leave_type') {
            await leaveTypesApi.update(editingId, body);
            saved = true;
          } else if (!editingId) {
            await leaveTypesApi.create(body);
            saved = true;
          }
        } else {
          if (!holidayForm.holiday_date) {
            setDrawerError(t('hrJobStructure.errHolidayDateRequired'));
            return;
          }
          const body = {
            name,
            holiday_date: holidayForm.holiday_date,
            is_recurring: holidayForm.is_recurring,
          };
          if (editingId && editingHolidayKind === 'holiday') {
            await officialHolidaysApi.update(editingId, body);
            saved = true;
          } else if (!editingId) {
            await officialHolidaysApi.create(body);
            saved = true;
          }
        }
        if (!saved) {
          setDrawerError(t('hrJobStructure.errSaveFailed'));
          return;
        }
      } else if (drawer === 'financial' || drawer === 'allowance' || drawer === 'deduction') {
        if (!financialForm.name.trim()) return;
        const body = { name: financialForm.name.trim(), default_amount: financialForm.default_amount || '0' };
        const kind = drawer === 'financial' ? financialKind : drawer;
        if (editingId) {
          if (kind === 'allowance') await allowanceItemsApi.update(editingId, body);
          else await deductionItemsApi.update(editingId, body);
        } else if (kind === 'allowance') {
          await allowanceItemsApi.create(body);
        } else {
          await deductionItemsApi.create(body);
        }
      }
      setDrawer(null);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error';
      setDrawerError(message);
      setError(message);
    }
  };

  const drawerTitle = () => {
    if (!drawer) return '';
    const editing = Boolean(editingId);
    if (drawer === 'financial' && !editing) return t('hrJobStructure.modalAddFinancial');
    const map: Record<Exclude<DrawerKind, 'financial'>, [string, string]> = {
      department: [t('hrJobStructure.addDepartment'), t('hrJobStructure.editDepartment')],
      section: [t('hrJobStructure.addSection'), t('hrJobStructure.editSection')],
      group: [t('hrJobStructure.addGroup'), t('hrJobStructure.editGroup')],
      jobTitle: [t('hrJobStructure.addTitle'), t('hrJobStructure.editTitle')],
      holiday: [t('hrJobStructure.addHoliday'), t('hrJobStructure.editHoliday')],
      allowance: [t('hrJobStructure.addAllowance'), t('hrJobStructure.editAllowance')],
      deduction: [t('hrJobStructure.addDeduction'), t('hrJobStructure.editDeduction')],
    };
    const key = drawer === 'financial' ? 'allowance' : drawer;
    return editing ? map[key][1] : map[key][0];
  };

  const saveLabel = () => {
    if (drawer === 'holiday') return t('hrJobStructure.saveHoliday');
    if (drawer === 'financial' || drawer === 'allowance' || drawer === 'deduction') {
      return t('hrJobStructure.saveFinancial');
    }
    return t('hrJobStructure.saveData');
  };

  const jobLevelLabel = (level: string) => {
    const key = `hrJobStructure.jobLevel${level}` as 'hrJobStructure.jobLevelA';
    return t(key);
  };

  const colorLabel = (id: string) => {
    const key = `hrJobStructure.color${id.charAt(0).toUpperCase()}${id.slice(1)}` as 'hrJobStructure.colorBlue';
    return t(key);
  };

  const pdfCommon = () => ({
    isRtl,
    generatedLabel: t('hrJobStructure.pdfGeneratedAt'),
    emptyLabel: t('hrJobStructure.pdfEmpty'),
    portalTitle: t('hrJobStructure.portalTitle'),
  });

  const downloadDepartmentsPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'departments',
      title: t('hrJobStructure.mainDepartments'),
      subtitle: t('hrJobStructure.adminSectionDesc'),
      columns: [
        { key: 'name', label: t('hrJobStructure.fieldName') },
        { key: 'manager', label: t('hrJobStructure.fieldManager') },
      ],
      rows: departments.map((row) => ({
        name: row.name,
        manager: row.manager_name || '—',
      })),
    });
  };

  const downloadSectionsPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'sections',
      title: t('hrJobStructure.subDepartments'),
      columns: [
        { key: 'name', label: t('hrJobStructure.fieldName') },
        { key: 'department', label: t('hrJobStructure.fieldParentDept') },
      ],
      rows: sections.map((row) => ({
        name: row.name,
        department: row.department_name || '—',
      })),
    });
  };

  const downloadGroupsPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'groups',
      title: t('hrJobStructure.employeeGroups'),
      subtitle: t('hrJobStructure.employeeGroupsDesc'),
      columns: [{ key: 'name', label: t('hrJobStructure.fieldName') }],
      rows: groups.map((row) => ({ name: row.name })),
    });
  };

  const downloadTitlesPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'jobTitles',
      title: t('hrJobStructure.jobTitles'),
      columns: [
        { key: 'name', label: t('hrJobStructure.fieldName') },
        { key: 'level', label: t('hrJobStructure.fieldJobLevelFull') },
      ],
      rows: titles.map((row) => ({
        name: row.name,
        level: jobLevelLabel(row.job_level || 'B'),
      })),
    });
  };

  const holidayCatalog = useMemo(
    () => [
      ...leaveTypes.map((row) => ({ kind: 'leave_type' as const, ...row })),
      ...holidays.map((row) => ({ kind: 'holiday' as const, ...row })),
    ],
    [holidays, leaveTypes],
  );

  const openAssignLeave = () => {
    setAssignLeaveForm({
      employee_id: '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      unit: 'days',
      quantity: '1',
      notes: '',
    });
    setAssignLeaveError(null);
    setAssignLeaveOpen(true);
  };

  const saveAssignLeave = async () => {
    setAssignLeaveError(null);
    if (!assignLeaveForm.employee_id || !assignLeaveForm.leave_type_id) {
      setAssignLeaveError(t('hrJobStructure.errAssignLeaveRequired'));
      return;
    }
    try {
      await leavesApi.create(assignLeaveForm);
      setAssignLeaveOpen(false);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error';
      setAssignLeaveError(message);
      setError(message);
    }
  };

  const allowanceAssignItems = useMemo(
    () => financialItems.filter((row) => row.kind === 'allowance'),
    [financialItems],
  );
  const deductionAssignItems = useMemo(
    () => financialItems.filter((row) => row.kind === 'deduction'),
    [financialItems],
  );
  const assignFinancialItems =
    assignFinancialKind === 'allowance' ? allowanceAssignItems : deductionAssignItems;

  const openAssignFinancial = () => {
    const defaultKind = perms.assignAllowances
      ? 'allowance'
      : perms.assignDeductions
        ? 'deduction'
        : 'allowance';
    setAssignFinancialKind(defaultKind);
    setAssignFinancialForm({
      employee_id: '',
      item_id: '',
      amount: '',
      deduction_date: new Date().toISOString().slice(0, 10),
    });
    setAssignFinancialError(null);
    setAssignFinancialOpen(true);
  };

  const saveAssignFinancial = async () => {
    setAssignFinancialError(null);
    if (!assignFinancialForm.employee_id || !assignFinancialForm.item_id || !assignFinancialForm.amount) {
      setAssignFinancialError(t('hrJobStructure.errAssignFinancialRequired'));
      return;
    }
    try {
      if (assignFinancialKind === 'allowance') {
        await allowancesApi.create({
          employee_id: assignFinancialForm.employee_id,
          allowance_item_id: assignFinancialForm.item_id,
          amount: assignFinancialForm.amount,
        });
      } else {
        await deductionsApi.create({
          employee_id: assignFinancialForm.employee_id,
          deduction_item_id: assignFinancialForm.item_id,
          amount: assignFinancialForm.amount,
          deduction_date: assignFinancialForm.deduction_date,
        });
      }
      setAssignFinancialOpen(false);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error';
      setAssignFinancialError(message);
      setError(message);
    }
  };

  const downloadHolidaysPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'holidays',
      title: t('hrJobStructure.holidays'),
      subtitle: t('hrJobStructure.holidaysDesc'),
      columns: [
        { key: 'name', label: t('hrJobStructure.fieldName') },
        { key: 'date', label: t('hrJobStructure.fieldHolidayDay') },
      ],
      rows: [
        ...leaveTypes.map((row) => ({ name: row.name, date: t('hrJobStructure.leaveTypeBadge') })),
        ...holidays.map((row) => ({ name: row.name, date: row.holiday_date })),
      ],
    });
  };

  const downloadFinancialPdf = () => {
    exportJobStructureSectionPdf({
      ...pdfCommon(),
      section: 'financial',
      title: t('hrJobStructure.financialItems'),
      subtitle: t('hrJobStructure.financialItemsDesc'),
      columns: [
        { key: 'name', label: t('hrJobStructure.fieldName') },
        { key: 'amount', label: t('hrJobStructure.fieldAmountEgp') },
        { key: 'type', label: t('hrJobStructure.pdfType') },
      ],
      rows: financialItems.map((row) => ({
        name: row.name,
        amount: fmtMoney(row.default_amount),
        type:
          row.kind === 'allowance'
            ? t('hrJobStructure.allowanceBadge')
            : t('hrJobStructure.deductionBadge'),
      })),
    });
  };

  const drawerSubtitle = () => {
    if (!drawer || editingId) return undefined;
    return t('hrJobStructure.modalAddHint');
  };

  const activeFinancialDrawer =
    drawer === 'financial' || drawer === 'allowance' || drawer === 'deduction';

  const [focusedSection, setFocusedSection] = useState<StructureSectionId | null>(null);

  const toggleSectionFocus = (id: StructureSectionId) => {
    setFocusedSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!focusedSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedSection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedSection]);

  const sectionFocusProps = (id: StructureSectionId) => ({
    sectionId: id,
    isFocused: focusedSection === id,
    isHidden: focusedSection != null && focusedSection !== id,
    onToggleFocus: toggleSectionFocus,
  });

  return (
    <HrModuleLayout activeTab="hr-job-structure">
      <div className={`hr-job-structure-page space-y-6 ${focusedSection ? 'is-section-focused' : ''}`}>
        {focusedSection ? (
          <button
            type="button"
            className="hr-structure-focus-backdrop"
            onClick={() => setFocusedSection(null)}
            aria-label={t('hrJobStructure.unfocusSection')}
          />
        ) : null}

        <header className={`hr-job-structure-portal ${focusedSection ? 'is-compact' : ''}`}>
          <div className="hr-job-structure-portal-inner">
            <span className="hr-job-structure-portal-badge">{t('hrJobStructure.portalBadge')}</span>
            <h1>{t('hrJobStructure.portalTitle')}</h1>
          </div>
        </header>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <section className="hr-job-structure-block space-y-4">
          <div className="hr-job-structure-section-head">
            <span className="hr-job-structure-section-icon">
              <Layers3 className="h-5 w-5" />
            </span>
            <div>
              <h2>{t('hrJobStructure.adminSectionTitle')}</h2>
              <p>{t('hrJobStructure.adminSectionDesc')}</p>
            </div>
          </div>
          <div className="hr-structure-grid grid gap-4 lg:grid-cols-2">
            {perms.departments ? (
              <StructureCard
                {...sectionFocusProps('departments')}
                title={t('hrJobStructure.mainDepartments')}
                count={departments.length}
                onAdd={() => openDrawer('department')}
                onDownload={downloadDepartmentsPdf}
                canAdd
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : departments.length === 0 ? (
                  <p className="hr-structure-empty">{t('hrJobStructure.noDepartments')}</p>
                ) : (
                  departments.map((row) => (
                    <div key={row.id} className="hr-structure-item">
                      <div className="hr-structure-item-body">
                        <strong>{row.name}</strong>
                        <span>{t('hrJobStructure.managerLabel')}: {row.manager_name || '—'}</span>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer('department', row.id)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          await deleteDepartment(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
              </StructureCard>
            ) : null}

            {perms.sections ? (
              <StructureCard
                {...sectionFocusProps('sections')}
                title={t('hrJobStructure.subDepartments')}
                count={sections.length}
                onAdd={() => openDrawer('section')}
                onDownload={downloadSectionsPdf}
                canAdd
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : sections.length === 0 ? (
                  <p className="hr-structure-empty">{t('hrJobStructure.noSections')}</p>
                ) : (
                  sections.map((row) => (
                    <div key={row.id} className="hr-structure-item">
                      <div className="hr-structure-item-body">
                        <strong>{row.name}</strong>
                        <span className="hr-structure-parent-link">
                          {t('hrJobStructure.belongsTo')}: {row.department_name}
                        </span>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer('section', row.id)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          await deleteHrSection(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
              </StructureCard>
            ) : null}
          </div>
        </section>

        <section className="hr-job-structure-block space-y-4">
          <div className="hr-job-structure-section-head">
            <span className="hr-job-structure-section-icon">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <h2>{t('hrJobStructure.jobSectionTitle')}</h2>
            </div>
          </div>
          <div className="hr-structure-grid grid gap-4 lg:grid-cols-2">
            {perms.groups ? (
              <StructureCard
                {...sectionFocusProps('groups')}
                title={t('hrJobStructure.employeeGroups')}
                count={groups.length}
                description={t('hrJobStructure.employeeGroupsDesc')}
                onAdd={() => openDrawer('group')}
                onDownload={downloadGroupsPdf}
                canAdd
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : groups.length === 0 ? (
                  <p className="hr-structure-empty">{t('employeeGroups.empty')}</p>
                ) : (
                  groups.map((row) => (
                    <div key={row.id} className="hr-structure-item hr-structure-item-dot">
                      <div className="hr-structure-item-body">
                        <span className={`hr-structure-dot ${GROUP_COLORS[row.color || 'blue'] || GROUP_COLORS.blue}`} />
                        <strong>{row.name}</strong>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer('group', row.id)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          await employeeGroupsApi.remove(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
              </StructureCard>
            ) : null}

            {perms.titles ? (
              <StructureCard
                {...sectionFocusProps('jobTitles')}
                title={t('hrJobStructure.jobTitles')}
                count={titles.length}
                onAdd={() => openDrawer('jobTitle')}
                onDownload={downloadTitlesPdf}
                canAdd
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : titles.length === 0 ? (
                  <p className="hr-structure-empty">{t('jobTitles.empty')}</p>
                ) : (
                  titles.map((row) => (
                    <div key={row.id} className="hr-structure-item hr-structure-item-boxed">
                      <div className="hr-structure-item-body">
                        <strong>{row.name}</strong>
                        <span>{t('hrJobStructure.jobLevel')}: {row.job_level || 'B'}</span>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer('jobTitle', row.id)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          await jobTitlesApi.remove(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
              </StructureCard>
            ) : null}
          </div>
        </section>

        <section className="hr-job-structure-block space-y-4">
          <div className="hr-structure-grid grid gap-4 lg:grid-cols-2">
            {perms.holidays ? (
              <StructureCard
                {...sectionFocusProps('holidays')}
                title={t('hrJobStructure.holidays')}
                count={holidayCatalog.length}
                description={t('hrJobStructure.holidaysDesc')}
                onAdd={() => openDrawer('holiday')}
                onSecondaryAdd={openAssignLeave}
                secondaryAddLabel={t('hrJobStructure.assignLeave')}
                canSecondaryAdd={perms.assignLeaves}
                onDownload={downloadHolidaysPdf}
                canAdd
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : holidayCatalog.length === 0 ? (
                  <p className="hr-structure-empty">{t('hrJobStructure.noHolidays')}</p>
                ) : (
                  holidayCatalog.map((row) => (
                    <div key={`${row.kind}-${row.id}`} className="hr-structure-item">
                      <div className="hr-structure-item-body">
                        <span className="hr-structure-dot bg-emerald-500" />
                        <div>
                          <strong>{row.name}</strong>
                          <span>
                            {row.kind === 'leave_type'
                              ? t('hrJobStructure.leaveTypeBadge')
                              : row.holiday_date}
                            {row.kind === 'holiday' && row.is_recurring ? (
                              <em className="hr-structure-recurring-badge">{t('hrJobStructure.recurringYearly')}</em>
                            ) : null}
                          </span>
                        </div>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer('holiday', row.id, row.kind)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          if (row.kind === 'leave_type') await leaveTypesApi.remove(row.id);
                          else await officialHolidaysApi.remove(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
              </StructureCard>
            ) : null}

            {perms.allowances || perms.deductions ? (
              <StructureCard
                {...sectionFocusProps('financial')}
                title={t('hrJobStructure.financialItems')}
                count={financialItems.length}
                description={t('hrJobStructure.financialItemsDesc')}
                onAdd={() => openDrawer('financial')}
                onSecondaryAdd={openAssignFinancial}
                secondaryAddLabel={t('hrJobStructure.assignLeave')}
                canSecondaryAdd={perms.assignFinancial}
                onDownload={downloadFinancialPdf}
                canAdd={perms.allowances || perms.deductions}
              >
                {loading ? (
                  <p className="hr-structure-empty">{t('inventory.loading')}</p>
                ) : financialItems.length === 0 ? (
                  <p className="hr-structure-empty">{t('hrJobStructure.noFinancialItems')}</p>
                ) : (
                  financialItems.map((row) => (
                    <div key={`${row.kind}-${row.id}`} className="hr-structure-item hr-structure-item-boxed">
                      <div className="hr-structure-item-body">
                        <span className={`hr-structure-dot ${row.kind === 'allowance' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                          <strong>{row.name}</strong>
                          <div className="hr-structure-item-meta">
                            <span>EGP {fmtMoney(row.default_amount)}</span>
                            <span className={row.kind === 'allowance' ? 'hr-structure-badge-add' : 'hr-structure-badge-deduct'}>
                              {row.kind === 'allowance'
                                ? t('hrJobStructure.allowanceBadge')
                                : t('hrJobStructure.deductionBadge')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ItemActions
                        onEdit={() => openDrawer(row.kind === 'allowance' ? 'allowance' : 'deduction', row.id)}
                        onDelete={async () => {
                          if (!confirm(t('departments.delete') + '?')) return;
                          if (row.kind === 'allowance') await allowanceItemsApi.remove(row.id);
                          else await deductionItemsApi.remove(row.id);
                          load();
                        }}
                      />
                    </div>
                  ))
                )}
                {perms.deductions ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openDrawer('allowance')}>
                      + {t('hrJobStructure.addAllowance')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openDrawer('deduction')}>
                      + {t('hrJobStructure.addDeduction')}
                    </Button>
                  </div>
                ) : null}
              </StructureCard>
            ) : null}
          </div>
        </section>
      </div>

      <HrStructureModal
        open={drawer != null}
        title={drawerTitle()}
        subtitle={drawerSubtitle()}
        mode={editingId ? 'edit' : 'add'}
        onClose={() => setDrawer(null)}
        onSave={saveDrawer}
        saveLabel={saveLabel()}
        cancelLabel={t('hrJobStructure.cancel')}
      >
        {drawerError ? <p className="hr-structure-drawer-error">{drawerError}</p> : null}
        {drawer === 'department' ? (
          <>
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
            <HrStructureField label={t('hrJobStructure.fieldManager')}>
              <Input
                value={deptForm.manager_name}
                onChange={(e) => setDeptForm((f) => ({ ...f, manager_name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
          </>
        ) : null}

        {drawer === 'section' ? (
          <>
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={sectionForm.name}
                onChange={(e) => setSectionForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
            {!editingId ? (
              <HrStructureField label={t('hrJobStructure.fieldParentDept')}>
                <select
                  className="hr-structure-input hr-structure-select"
                  value={sectionForm.department_id}
                  onChange={(e) => setSectionForm((f) => ({ ...f, department_id: e.target.value }))}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </HrStructureField>
            ) : null}
          </>
        ) : null}

        {drawer === 'group' ? (
          <>
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
            <div className="hr-structure-field">
              <span>{t('hrJobStructure.fieldColorPick')}</span>
              <div className="hr-structure-color-grid">
                {COLOR_PICKER.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`hr-structure-color-card ${groupForm.color === opt.id ? 'is-active' : ''}`}
                    onClick={() => setGroupForm((f) => ({ ...f, color: opt.id }))}
                  >
                    <span className={`hr-structure-color-dot ${opt.dot}`} />
                    <small>{colorLabel(opt.id)}</small>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {drawer === 'jobTitle' ? (
          <>
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={titleForm.name}
                onChange={(e) => setTitleForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
            <HrStructureField label={t('hrJobStructure.fieldJobLevelFull')}>
              <select
                className="hr-structure-input hr-structure-select"
                value={titleForm.job_level}
                onChange={(e) => setTitleForm((f) => ({ ...f, job_level: e.target.value }))}
              >
                {JOB_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {jobLevelLabel(level)}
                  </option>
                ))}
              </select>
            </HrStructureField>
          </>
        ) : null}

        {drawer === 'holiday' ? (
          <>
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
                placeholder={isRtl ? 'مثال: مرضى أو اعتيادي' : 'e.g. sick or annual'}
              />
            </HrStructureField>
            <label className="hr-structure-checkbox">
              <input
                type="checkbox"
                checked={holidayForm.noFixedDate}
                onChange={(e) =>
                  setHolidayForm((f) => ({
                    ...f,
                    noFixedDate: e.target.checked,
                    holiday_date: e.target.checked ? '' : f.holiday_date,
                    is_recurring: e.target.checked ? false : f.is_recurring,
                  }))
                }
              />
              <span>
                <strong>{t('hrJobStructure.noFixedDate')}</strong>
                <small>{t('hrJobStructure.noFixedDateHint')}</small>
              </span>
            </label>
            {!holidayForm.noFixedDate ? (
              <>
                <HrStructureField label={t('hrJobStructure.fieldHolidayDay')}>
                  <Input
                    type="date"
                    value={holidayForm.holiday_date}
                    onChange={(e) => setHolidayForm((f) => ({ ...f, holiday_date: e.target.value }))}
                    className="hr-structure-input"
                  />
                </HrStructureField>
                <label className="hr-structure-checkbox">
                  <input
                    type="checkbox"
                    checked={holidayForm.is_recurring}
                    onChange={(e) => setHolidayForm((f) => ({ ...f, is_recurring: e.target.checked }))}
                  />
                  <span>
                    <strong>{t('hrJobStructure.recurringYearly')}</strong>
                    <small>{t('hrJobStructure.recurringYearlyHint')}</small>
                  </span>
                </label>
              </>
            ) : null}
          </>
        ) : null}

        {activeFinancialDrawer ? (
          <>
            {!editingId ? (
              <div className="hr-structure-field">
                <span>{t('hrJobStructure.financialType')}</span>
                <div className="hr-structure-type-grid">
                  <button
                    type="button"
                    className={`hr-structure-type-card is-allowance ${financialKind === 'allowance' ? 'is-active' : ''}`}
                    onClick={() => setFinancialKind('allowance')}
                  >
                    <strong>{t('hrJobStructure.allowanceCardTitle')}</strong>
                    <small>{t('hrJobStructure.allowanceCardSub')}</small>
                  </button>
                  <button
                    type="button"
                    className={`hr-structure-type-card is-deduction ${financialKind === 'deduction' ? 'is-active' : ''}`}
                    onClick={() => setFinancialKind('deduction')}
                  >
                    <strong>{t('hrJobStructure.deductionCardTitle')}</strong>
                    <small>{t('hrJobStructure.deductionCardSub')}</small>
                  </button>
                </div>
              </div>
            ) : null}
            <HrStructureField label={t('hrJobStructure.fieldName')}>
              <Input
                value={financialForm.name}
                onChange={(e) => setFinancialForm((f) => ({ ...f, name: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
            <HrStructureField label={t('hrJobStructure.fieldAmountEgp')}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={financialForm.default_amount}
                onChange={(e) => setFinancialForm((f) => ({ ...f, default_amount: e.target.value }))}
                className="hr-structure-input"
              />
            </HrStructureField>
          </>
        ) : null}
      </HrStructureModal>

      <Sheet open={assignLeaveOpen} onOpenChange={setAssignLeaveOpen}>
        <SheetContent
          side="center"
          className="erp-form-modal erp-form-modal--full erp-side-drawer hr-premium-drawer w-full border-0 p-0 flex flex-col"
        >
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>{t('hrJobStructure.assignLeaveTitle')}</SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">{t('hrJobStructure.assignLeaveDesc')}</p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <Palmtree className="h-6 w-6" />
              </span>
              <div>
                <h3>{t('hrJobStructure.assignLeaveTitle')}</h3>
                <p>{t('hrJobStructure.assignLeaveHint')}</p>
              </div>
            </div>
            {assignLeaveError ? <p className="hr-structure-drawer-error">{assignLeaveError}</p> : null}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span>{t('employeeData.colName')}</span>
                <select
                  className="hr-structure-input hr-structure-select w-full"
                  value={assignLeaveForm.employee_id}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} — {e.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>{t('hrPayroll.colItem')}</span>
                <select
                  className="hr-structure-input hr-structure-select w-full"
                  value={assignLeaveForm.leave_type_id}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, leave_type_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {leaveTypes.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.code} — {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>{t('hrPayroll.colDate')}</span>
                <Input
                  type="date"
                  className="hr-structure-input"
                  value={assignLeaveForm.start_date}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span>{t('hrJobStructure.fieldEndDate')}</span>
                <Input
                  type="date"
                  className="hr-structure-input"
                  value={assignLeaveForm.end_date}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span>{t('hrJobStructure.fieldCount')}</span>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="hr-structure-input"
                  value={assignLeaveForm.quantity}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span>{t('hrJobStructure.fieldCalcUnit')}</span>
                <select
                  className="hr-structure-input hr-structure-select w-full"
                  value={assignLeaveForm.unit}
                  onChange={(e) => setAssignLeaveForm((f) => ({ ...f, unit: e.target.value as 'days' | 'hours' }))}
                >
                  <option value="days">{t('hrPayroll.days')}</option>
                  <option value="hours">{t('hrPayroll.hours')}</option>
                </select>
              </label>
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button variant="outline" onClick={() => setAssignLeaveOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={() => void saveAssignLeave()} className="erp-add-save-action">
              {t('hrJobStructure.assignLeave')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={assignFinancialOpen} onOpenChange={setAssignFinancialOpen}>
        <SheetContent
          side="center"
          className="erp-form-modal erp-form-modal--full erp-side-drawer hr-premium-drawer w-full border-0 p-0 flex flex-col"
        >
          <SheetHeader className="erp-side-drawer-header">
            <SheetTitle>
              {assignFinancialKind === 'allowance'
                ? t('hrJobStructure.assignAllowanceTitle')
                : t('hrJobStructure.assignDeductionTitle')}
            </SheetTitle>
            <p className="text-sm font-bold text-blue-100/90">
              {assignFinancialKind === 'allowance'
                ? t('hrJobStructure.assignAllowanceDesc')
                : t('hrJobStructure.assignDeductionDesc')}
            </p>
          </SheetHeader>
          <div className="erp-side-drawer-body">
            <div className="hr-premium-form-intro">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl ${
                  assignFinancialKind === 'allowance' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {assignFinancialKind === 'allowance' ? (
                  <Gift className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
              </span>
              <div>
                <h3>
                  {assignFinancialKind === 'allowance'
                    ? t('hrJobStructure.assignAllowanceTitle')
                    : t('hrJobStructure.assignDeductionTitle')}
                </h3>
                <p>
                  {assignFinancialKind === 'allowance'
                    ? t('hrJobStructure.assignAllowanceHint')
                    : t('hrJobStructure.assignDeductionHint')}
                </p>
              </div>
            </div>
            {assignFinancialError ? <p className="hr-structure-drawer-error">{assignFinancialError}</p> : null}
            {perms.assignAllowances && perms.assignDeductions ? (
              <div className="hr-structure-field mb-5">
                <span>{t('hrJobStructure.assignFinancialType')}</span>
                <div className="hr-structure-type-grid">
                  <button
                    type="button"
                    className={`hr-structure-type-card is-allowance ${assignFinancialKind === 'allowance' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAssignFinancialKind('allowance');
                      setAssignFinancialForm((f) => ({ ...f, item_id: '' }));
                    }}
                  >
                    <strong>{t('hrJobStructure.allowanceCardTitle')}</strong>
                    <small>{t('hrJobStructure.assignAllowanceTitle')}</small>
                  </button>
                  <button
                    type="button"
                    className={`hr-structure-type-card is-deduction ${assignFinancialKind === 'deduction' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAssignFinancialKind('deduction');
                      setAssignFinancialForm((f) => ({ ...f, item_id: '' }));
                    }}
                  >
                    <strong>{t('hrJobStructure.deductionCardTitle')}</strong>
                    <small>{t('hrJobStructure.assignDeductionTitle')}</small>
                  </button>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span>{t('employeeData.colName')}</span>
                <select
                  className="hr-structure-input hr-structure-select w-full"
                  value={assignFinancialForm.employee_id}
                  onChange={(e) => setAssignFinancialForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} — {e.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>{t('hrPayroll.colItem')}</span>
                <select
                  className="hr-structure-input hr-structure-select w-full"
                  value={assignFinancialForm.item_id}
                  onChange={(e) => setAssignFinancialForm((f) => ({ ...f, item_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {assignFinancialItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span>{t('employeeData.amount')}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="hr-structure-input"
                  placeholder={t('employeeData.amount')}
                  value={assignFinancialForm.amount}
                  onChange={(e) => setAssignFinancialForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </label>
              {assignFinancialKind === 'deduction' ? (
                <label className="block space-y-1 md:col-span-2">
                  <span>{t('hrPayroll.colDate')}</span>
                  <Input
                    type="date"
                    className="hr-structure-input"
                    value={assignFinancialForm.deduction_date}
                    onChange={(e) => setAssignFinancialForm((f) => ({ ...f, deduction_date: e.target.value }))}
                  />
                </label>
              ) : null}
            </div>
          </div>
          <SheetFooter className="erp-side-drawer-footer">
            <Button variant="outline" onClick={() => setAssignFinancialOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button onClick={() => void saveAssignFinancial()} className="erp-add-save-action">
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HrModuleLayout>
  );
}
