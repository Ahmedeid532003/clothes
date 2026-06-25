import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchDepartments, type DepartmentDto } from '@/lib/api/departments';
import { fetchHrSections, type HrSectionDto } from '@/lib/api/hr-sections';
import { fetchWorkShifts, type WorkShiftDto } from '@/lib/api/work-shifts';
import { jobTitlesApi } from '@/lib/api/job-titles';
import { employeeGroupsApi } from '@/lib/api/employee-groups';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import {
  createEmployee,
  fetchEmployeeLimits,
  fetchPermissionsSchema,
  type PermissionsSchemaDto,
  type UserPermissions,
} from '@/lib/api/employees';
import { employeeDataApi } from '@/lib/api/employee-data';
import { buildEmptyPermissions } from '@/lib/permissions/defaults';
import { PermissionsEditor } from '@/components/hr/PermissionsEditor';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { fmtMoney } from '@/components/accounting/AccountingUi';
import { entityName } from '@/lib/entity-name';

type StepId = 'job' | 'salary' | 'insurance' | 'system';

type IncreaseLine = { name: string; amount: string };

export type RegistrationForm = {
  full_name: string;
  work_email: string;
  job_title: string;
  manager: string;
  hire_date: string;
  department_id: string;
  hr_section_id: string;
  employee_group_id: string;
  work_shift_id: string;
  branch_id: string;
  hire_salary: string;
  basic_salary: string;
  job_level: string;
  cost_center: string;
  attendance_nature: string;
  increases: IncreaseLine[];
  increase_name: string;
  increase_amount: string;
  commission_mode: 'none' | 'percent' | 'per_thousand';
  commission_percent: string;
  insurance_number: string;
  insurance_date: string;
  insurance_wage: string;
  employee_share: string;
  company_share: string;
  bank_name: string;
  beneficiary: string;
  account_number: string;
  swift: string;
  iban: string;
  bank_branch_name: string;
  uses_system: boolean;
  username: string;
  password: string;
  grant_all_permissions: boolean;
  create_treasury: boolean;
};

const EMPTY_FORM = (): RegistrationForm => ({
  full_name: '',
  work_email: '',
  job_title: '',
  manager: '',
  hire_date: '',
  department_id: '',
  hr_section_id: '',
  employee_group_id: '',
  work_shift_id: '',
  branch_id: '',
  hire_salary: '6000',
  basic_salary: '6000',
  job_level: '',
  cost_center: '',
  attendance_nature: 'full_time',
  increases: [],
  increase_name: '',
  increase_amount: '',
  commission_mode: 'none',
  commission_percent: '0',
  insurance_number: '',
  insurance_date: '',
  insurance_wage: '0',
  employee_share: '11',
  company_share: '18.75',
  bank_name: '',
  beneficiary: '',
  account_number: '',
  swift: '',
  iban: '',
  bank_branch_name: '',
  uses_system: true,
  username: '',
  password: '',
  grant_all_permissions: false,
  create_treasury: false,
});

const INCREASE_TEMPLATES = [
  { name: 'زيادة سنوية دورية', amount: '600' },
  { name: 'علاوة ترقية استثنائية', amount: '1500' },
  { name: 'بدل انتقال', amount: '400' },
  { name: 'حافز أداء', amount: '800' },
];

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`emp-reg-field ${className || ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputProps(className = 'emp-reg-input') {
  return { className };
}

export function EmployeeRegistrationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, isRtl } = useLanguage();
  const [step, setStep] = useState<StepId>('job');
  const [form, setForm] = useState<RegistrationForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depts, setDepts] = useState<DepartmentDto[]>([]);
  const [sections, setSections] = useState<HrSectionDto[]>([]);
  const [shifts, setShifts] = useState<WorkShiftDto[]>([]);
  const [titles, setTitles] = useState<{ id: string; name: string; code: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [schema, setSchema] = useState<PermissionsSchemaDto | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({ pages: {}, features: {}, actions: {} });

  const steps: { id: StepId; label: string }[] = useMemo(
    () => [
      { id: 'job', label: isRtl ? '١. البيانات الوظيفية' : '1. Job data' },
      { id: 'salary', label: isRtl ? '٢. الراتب الأساسي والزيادات' : '2. Salary & increases' },
      { id: 'insurance', label: isRtl ? '٣. التأمين الاجتماعي والحساب البنكي' : '3. Insurance & bank' },
      { id: 'system', label: isRtl ? '٤. استخدام النظام' : '4. System usage' },
    ],
    [isRtl],
  );

  const patch = (partial: Partial<RegistrationForm>) => setForm((f) => ({ ...f, ...partial }));

  const loadMeta = useCallback(async () => {
    const [d, sh, ti, gr, br, sch] = await Promise.all([
      fetchDepartments(),
      fetchWorkShifts(),
      jobTitlesApi.list(),
      employeeGroupsApi.list(),
      fetchBranches(),
      fetchPermissionsSchema(),
    ]);
    setDepts(d);
    setShifts(sh);
    setTitles(ti);
    setGroups(gr);
    setBranches(br.filter((b) => b.is_active));
    setSchema(sch);
    setPermissions(buildEmptyPermissions(sch.pages, sch.features));
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('job');
    setForm(EMPTY_FORM());
    setError(null);
    loadMeta().catch(() => undefined);
  }, [open, loadMeta]);

  useEffect(() => {
    if (!form.department_id) {
      setSections([]);
      return;
    }
    fetchHrSections(form.department_id).then(setSections).catch(() => setSections([]));
  }, [form.department_id]);

  const totalIncreases = form.increases.reduce((s, row) => s + Number(row.amount || 0), 0);
  const currentSalary = Number(form.basic_salary || 0) + totalIncreases;

  const addIncreaseLine = () => {
    if (!form.increase_name.trim()) return;
    patch({
      increases: [
        ...form.increases,
        {
          name: form.increase_name.trim(),
          amount: form.increase_amount || '0',
        },
      ],
      increase_name: '',
      increase_amount: '',
    });
  };

  const applyTemplate = (tpl: (typeof INCREASE_TEMPLATES)[0]) => {
    patch({
      increase_name: tpl.name,
      increase_amount: tpl.amount,
    });
  };

  const handleSubmit = async () => {
    const name = form.full_name.trim();
    if (!name) {
      setError(isRtl ? 'اسم الموظف مطلوب.' : 'Employee name is required.');
      setStep('job');
      return;
    }
    if (form.uses_system && (!form.username.trim() || !form.password.trim())) {
      setError(isRtl ? 'اسم المستخدم وكلمة المرور مطلوبان.' : 'Username and password are required.');
      setStep('system');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const limits = await fetchEmployeeLimits();
      if (!limits.can_add) {
        setError(isRtl ? 'تم الوصول لحد المستخدمين في الاشتراك.' : 'User limit reached.');
        return;
      }
      const created = await createEmployee({
        uses_system: form.uses_system,
        username: form.uses_system ? form.username.trim() : undefined,
        password: form.uses_system ? form.password : undefined,
        hire_date: form.hire_date || null,
        full_name: name,
        email: form.work_email.trim(),
        department_id: form.department_id || null,
        hr_section_id: form.hr_section_id || null,
        work_shift_id: form.work_shift_id || null,
        permissions: form.uses_system && !form.grant_all_permissions ? permissions : undefined,
        grant_all_permissions: form.uses_system && form.grant_all_permissions,
        default_branch_id: form.branch_id || null,
        branch_access_mode: form.branch_id ? 'selected' : 'all',
        allowed_branch_ids: form.branch_id ? [form.branch_id] : [],
      });

      await employeeDataApi.update(created.id, {
        full_name: name,
        email: form.work_email.trim(),
        hire_date: form.hire_date || '',
        department_id: form.department_id,
        hr_section_id: form.hr_section_id,
        work_shift_id: form.work_shift_id,
        job_title_id: titles.find((x) => x.name === form.job_title)?.id || '',
        employee_group_id: form.employee_group_id,
        hire_salary: form.hire_salary,
        basic_salary: form.basic_salary,
        commission_mode: form.commission_mode,
        commission_percent: form.commission_percent,
        extra_data: {
          employee_name_ar: name,
          employee_name_en: name,
          work_email: form.work_email,
          job_title_ar: form.job_title,
          job_title_en: form.job_title,
          manager_ar: form.manager,
          manager_en: form.manager,
          job_level: form.job_level,
          cost_center_en: form.cost_center,
          cost_center_ar: form.cost_center,
          attendance_nature: form.attendance_nature,
          insurance_number: form.insurance_number,
          insurance_date: form.insurance_date,
          insurance_wage: form.insurance_wage,
          employee_share: form.employee_share,
          company_share: form.company_share,
          bank_name_en: form.bank_name,
          bank_name_ar: form.bank_name,
          beneficiary_en: form.beneficiary,
          beneficiary_ar: form.beneficiary,
          account_number: form.account_number,
          swift: form.swift,
          iban: form.iban,
          bank_branch_name: form.bank_branch_name,
          work_branch: entityName(branches.find((b) => b.id === form.branch_id)),
          create_treasury: form.create_treasury,
        },
      });

      for (const inc of form.increases) {
        if (Number(inc.amount) > 0) {
          await employeeDataApi.addIncrease(created.id, {
            amount: inc.amount,
            effective_date: form.hire_date || new Date().toISOString().slice(0, 10),
            notes: inc.name,
          });
        }
      }

      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="emp-reg-overlay" role="dialog" aria-modal="true">
      <div className="emp-reg-modal">
        <header className="emp-reg-header">
          <button type="button" className="emp-reg-close" onClick={onClose} aria-label="close">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2>{isRtl ? 'صياغة عقد وتسجيل موظف جديد' : 'Draft contract & register employee'}</h2>
            <p>
              {isRtl
                ? 'حدد البيانات الوظيفية واللائحة المالية وبنود البنك الحسابية لتسجيلها في الملف'
                : 'Set job data, payroll rules, and bank details for the employee file'}
            </p>
          </div>
        </header>

        <nav className="emp-reg-tabs">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`emp-reg-tab ${step === s.id ? 'is-active' : ''}`}
              onClick={() => setStep(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="emp-reg-body">
          {error ? <p className="emp-reg-error">{error}</p> : null}

          {step === 'job' ? (
            <div className="emp-reg-panel">
              <h3>{isRtl ? 'البيانات الشخصية والتعيين الأساسي' : 'Personal & appointment data'}</h3>
              <div className="emp-reg-grid emp-reg-grid-3">
                <Field label={isRtl ? 'الاسم الكامل' : 'Full name'}>
                  <input {...inputProps()} value={form.full_name} onChange={(e) => patch({ full_name: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'البريد الوظيفي' : 'Work email'}>
                  <input {...inputProps()} type="email" value={form.work_email} onChange={(e) => patch({ work_email: e.target.value })} dir="ltr" />
                </Field>
                <Field label={isRtl ? 'المسمى الوظيفي' : 'Job title'}>
                  <input {...inputProps()} value={form.job_title} onChange={(e) => patch({ job_title: e.target.value })} list="emp-job-titles" />
                  <datalist id="emp-job-titles">{titles.map((x) => <option key={x.id} value={x.name} />)}</datalist>
                </Field>
                <Field label={isRtl ? 'المدير المباشر' : 'Manager'}>
                  <input {...inputProps()} value={form.manager} onChange={(e) => patch({ manager: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'تاريخ التعيين' : 'Hire date'}>
                  <input {...inputProps()} type="date" value={form.hire_date} onChange={(e) => patch({ hire_date: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'الإدارة' : 'Department'}>
                  <select className="emp-reg-input" value={form.department_id} onChange={(e) => patch({ department_id: e.target.value, hr_section_id: '' })}>
                    <option value="">—</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label={isRtl ? 'القسم الفرعي' : 'Section'}>
                  <select className="emp-reg-input" value={form.hr_section_id} onChange={(e) => patch({ hr_section_id: e.target.value })}>
                    <option value="">—</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label={isRtl ? 'مجموعة الطاقم / الشيفت' : 'Staff group'}>
                  <select className="emp-reg-input" value={form.employee_group_id} onChange={(e) => patch({ employee_group_id: e.target.value })}>
                    <option value="">—</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </Field>
                <Field label={isRtl ? 'الوردية اليومية' : 'Daily shift'}>
                  <select className="emp-reg-input emp-reg-input-highlight" value={form.work_shift_id} onChange={(e) => patch({ work_shift_id: e.target.value })}>
                    <option value="">—</option>
                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label={isRtl ? 'الفرع' : 'Branch'}>
                  <select className="emp-reg-input" value={form.branch_id} onChange={(e) => patch({ branch_id: e.target.value })}>
                    <option value="">—</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{entityName(b)}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          ) : null}

          {step === 'salary' ? (
            <div className="emp-reg-panel">
              <h3>{isRtl ? 'هيكل الراتب الأساسي والزيادات ومجموعة الكلفة' : 'Salary structure & cost group'}</h3>
              <div className="emp-reg-salary-cards">
                <div className="emp-reg-salary-card">
                  <span>{isRtl ? 'الراتب الأساسي عند التعيين' : 'Hire basic salary'}</span>
                  <input className="emp-reg-salary-input" value={form.hire_salary} onChange={(e) => patch({ hire_salary: e.target.value, basic_salary: e.target.value })} />
                </div>
                <div className="emp-reg-salary-card is-plus">
                  <span>{isRtl ? 'إجمالي الزيادات على الراتب الأساسي (+)' : 'Total increases (+)'}</span>
                  <strong>EGP {fmtMoney(totalIncreases)}+</strong>
                </div>
                <div className="emp-reg-salary-card is-equals">
                  <span>{isRtl ? 'الراتب الأساسي الحالي للموظف (=)' : 'Current basic salary (=)'}</span>
                  <strong>EGP {fmtMoney(currentSalary)}</strong>
                </div>
              </div>
              <div className="emp-reg-grid emp-reg-grid-4">
                <Field label={isRtl ? 'الدرجة الوظيفية للمسمى' : 'Job grade'}>
                  <input {...inputProps()} value={form.job_level} onChange={(e) => patch({ job_level: e.target.value })} placeholder="03 — أمين مخزن" />
                </Field>
                <Field label={isRtl ? 'مركز التكلفة' : 'Cost center'}>
                  <input {...inputProps()} value={form.cost_center} onChange={(e) => patch({ cost_center: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'طبيعة وموقع الدوام' : 'Attendance type'}>
                  <select className="emp-reg-input" value={form.attendance_nature} onChange={(e) => patch({ attendance_nature: e.target.value })}>
                    <option value="full_time">{isRtl ? 'دوام كامل (رسمي بمقر الشركة)' : 'Full time'}</option>
                    <option value="part_time">{isRtl ? 'دوام جزئي' : 'Part time'}</option>
                  </select>
                </Field>
              </div>

              <h4 className="emp-reg-subtitle">{isRtl ? 'بنود الزيادات الإضافية المقررة على الراتب الأساسي' : 'Scheduled salary increases'}</h4>
              {form.increases.length === 0 ? (
                <p className="emp-reg-muted">{isRtl ? 'لا توجد زيادات مضافة حالياً لملف هذا الموظف.' : 'No increases added yet.'}</p>
              ) : (
                <ul className="emp-reg-increase-list">
                  {form.increases.map((row, idx) => (
                    <li key={`${row.name}-${idx}`}>
                      <span>{row.name}</span>
                      <strong>+{fmtMoney(row.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}

              <div className="emp-reg-increase-form">
                <p className="emp-reg-form-label">{isRtl ? 'تسجيل وإعلاء بند زيادة جديد للراتب الأساسي' : 'Add new increase line'}</p>
                <div className="emp-reg-grid emp-reg-grid-4 emp-reg-grid-align-end">
                  <Field label={isRtl ? 'مسمى بند الزيادة' : 'Increase name'}>
                    <input {...inputProps()} value={form.increase_name} onChange={(e) => patch({ increase_name: e.target.value })} />
                  </Field>
                  <Field label={isRtl ? 'القيمة المالية (ج.م)' : 'Amount (EGP)'}>
                    <input {...inputProps()} value={form.increase_amount} onChange={(e) => patch({ increase_amount: e.target.value })} />
                  </Field>
                  <ErpAddButton onClick={addIncreaseLine}>{isRtl ? 'إضافة' : 'Add'}</ErpAddButton>
                </div>
                <div className="emp-reg-templates">
                  <span>{isRtl ? 'قوالب زيادات جاهزة:' : 'Templates:'}</span>
                  {INCREASE_TEMPLATES.map((tpl) => (
                    <button key={tpl.name} type="button" className="emp-reg-template-pill" onClick={() => applyTemplate(tpl)}>
                      {tpl.name} (+{tpl.amount})
                    </button>
                  ))}
                </div>
              </div>

              <h4 className="emp-reg-subtitle emp-reg-subtitle-accent">{isRtl ? 'خطة تفعيل المبيعات والعمولات للأداء' : 'Sales & commission plan'}</h4>
              <Field label={isRtl ? 'طريقة احتساب العمولة' : 'Commission mode'}>
                <select className="emp-reg-input" value={form.commission_mode} onChange={(e) => patch({ commission_mode: e.target.value as RegistrationForm['commission_mode'] })}>
                  <option value="none">{isRtl ? 'بدون عمولة حالياً' : 'No commission'}</option>
                  <option value="percent">{isRtl ? 'نسبة مئوية' : 'Percentage'}</option>
                  <option value="per_thousand">{isRtl ? 'مبلغ لكل 1000 مبيعات' : 'Per 1k sales'}</option>
                </select>
              </Field>
              {form.commission_mode === 'percent' ? (
                <Field label={isRtl ? 'نسبة العمولة %' : 'Commission %'}>
                  <input {...inputProps()} value={form.commission_percent} onChange={(e) => patch({ commission_percent: e.target.value })} />
                </Field>
              ) : null}
            </div>
          ) : null}

          {step === 'insurance' ? (
            <div className="emp-reg-panel">
              <h3>{isRtl ? 'اللوائح والاشتراكات التأمينية الحكومية' : 'Government insurance'}</h3>
              <div className="emp-reg-grid emp-reg-grid-3">
                <Field label={isRtl ? 'رقم تأمين الموظف' : 'Insurance number'}>
                  <input {...inputProps()} value={form.insurance_number} onChange={(e) => patch({ insurance_number: e.target.value })} placeholder="54129845" dir="ltr" />
                </Field>
                <Field label={isRtl ? 'تاريخ الاشتراك' : 'Subscription date'}>
                  <input {...inputProps()} type="date" value={form.insurance_date} onChange={(e) => patch({ insurance_date: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'الأجر التأميني الشهري' : 'Monthly insurance wage'}>
                  <input {...inputProps()} value={form.insurance_wage} onChange={(e) => patch({ insurance_wage: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'حصة الموظف (%)' : 'Employee share %'}>
                  <input {...inputProps()} value={form.employee_share} onChange={(e) => patch({ employee_share: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'حصة الشركة (%)' : 'Company share %'}>
                  <input {...inputProps()} value={form.company_share} onChange={(e) => patch({ company_share: e.target.value })} />
                </Field>
              </div>

              <h3 className="emp-reg-divider-title">{isRtl ? 'بيانات البنك والحساب التفصيلية للتحويل' : 'Bank account details'}</h3>
              <div className="emp-reg-grid emp-reg-grid-3">
                <Field label={isRtl ? 'اسم البنك' : 'Bank name'}>
                  <input {...inputProps()} value={form.bank_name} onChange={(e) => patch({ bank_name: e.target.value })} placeholder="CIB Bank Egypt" />
                </Field>
                <Field label={isRtl ? 'اسم المستفيد' : 'Beneficiary'}>
                  <input {...inputProps()} value={form.beneficiary} onChange={(e) => patch({ beneficiary: e.target.value })} />
                </Field>
                <Field label={isRtl ? 'رقم الحساب البنكي' : 'Account number'}>
                  <input {...inputProps()} value={form.account_number} onChange={(e) => patch({ account_number: e.target.value })} dir="ltr" />
                </Field>
                <Field label="SWIFT">
                  <input {...inputProps()} value={form.swift} onChange={(e) => patch({ swift: e.target.value })} dir="ltr" />
                </Field>
                <Field label="IBAN">
                  <input {...inputProps()} value={form.iban} onChange={(e) => patch({ iban: e.target.value })} dir="ltr" />
                </Field>
                <Field label={isRtl ? 'اسم الفرع المسجل' : 'Registered branch'}>
                  <input {...inputProps()} value={form.bank_branch_name} onChange={(e) => patch({ bank_branch_name: e.target.value })} />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 'system' ? (
            <div className="emp-reg-panel">
              <h3>{isRtl ? 'تهيئة صلاحيات واستخدام النظام للموظف' : 'System access & permissions'}</h3>
              <label className="emp-reg-check-card">
                <input type="checkbox" checked={form.uses_system} onChange={(e) => patch({ uses_system: e.target.checked })} />
                <span>{isRtl ? 'تمكين الموظف كمستخدم نشط للسيستم' : 'Enable as active system user'}</span>
              </label>
              {form.uses_system ? (
                <>
                  <div className="emp-reg-grid emp-reg-grid-2">
                    <Field label={isRtl ? 'اسم المستخدم' : 'Username'}>
                      <input {...inputProps()} value={form.username} onChange={(e) => patch({ username: e.target.value })} dir="ltr" placeholder="eg. sara_mahod" />
                    </Field>
                    <Field label={isRtl ? 'كلمة المرور المؤقتة' : 'Temporary password'}>
                      <input {...inputProps()} type="password" value={form.password} onChange={(e) => patch({ password: e.target.value })} />
                    </Field>
                  </div>
                  <label className="emp-reg-check-inline">
                    <input type="checkbox" checked={form.grant_all_permissions} onChange={(e) => patch({ grant_all_permissions: e.target.checked })} />
                    <span>{isRtl ? 'مجموعة الصلاحيات: المدير العام (أدمن)' : 'Grant admin permissions'}</span>
                  </label>
                  <label className="emp-reg-check-inline">
                    <input type="checkbox" checked={form.create_treasury} onChange={(e) => patch({ create_treasury: e.target.checked })} />
                    <span>{isRtl ? 'إنشاء وتخصيص خزينة/صندوق فرعي للموظف باسمه' : 'Create sub-treasury for employee'}</span>
                  </label>
                  {!form.grant_all_permissions && schema ? (
                    <div className="emp-reg-permissions">
                      <div className="emp-reg-permissions-head">
                        <strong>{isRtl ? 'جدول الصلاحيات المخصصة لشاشات النظام' : 'Screen permissions'}</strong>
                      </div>
                      <PermissionsEditor schema={schema} value={permissions} onChange={setPermissions} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="emp-reg-footer">
          <button type="button" className="emp-reg-btn-cancel" onClick={onClose} disabled={saving}>
            {isRtl ? 'إلغاء الأمر' : 'Cancel'}
          </button>
          <button type="button" className="emp-reg-btn-submit" onClick={handleSubmit} disabled={saving}>
            {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'اعتماد العقد وتسجيل الموظف' : 'Approve & register'}
          </button>
        </footer>
      </div>
    </div>
  );
}
