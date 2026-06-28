import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Plus, UserPlus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchDepartments, type DepartmentDto } from '@/lib/api/departments';
import { fetchHrSections, type HrSectionDto } from '@/lib/api/hr-sections';
import { fetchWorkShifts, type WorkShiftDto } from '@/lib/api/work-shifts';
import { jobTitlesApi } from '@/lib/api/job-titles';
import { employeeGroupsApi } from '@/lib/api/employee-groups';
import { employeeDataApi, type EmployeeDataRow } from '@/lib/api/employee-data';
import { deactivateEmployee } from '@/lib/api/employees';
import { AlertBanner, fmtMoney } from '@/components/accounting/AccountingUi';
import { EmployeeDataListView } from '@/components/hr/employee-data/EmployeeDataListView';
import { EmployeeRegistrationModal } from '@/components/hr/employee-data/EmployeeRegistrationModal';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErpSideDrawer } from '@/components/erp/ErpSideDrawer';
import { EmployeeMediaPanel } from '@/components/hr/employee-data/EmployeeMediaPanel';
import { useAuth } from '@/lib/auth/AuthContext';
import { canViewPage } from '@/lib/permissions/access';

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  hire_date: string;
  department_id: string;
  hr_section_id: string;
  work_shift_id: string;
  job_title_id: string;
  employee_group_id: string;
  hire_salary: string;
  basic_salary: string;
  commission_mode: 'none' | 'percent' | 'per_thousand';
  commission_percent: string;
  commission_per_1000: string;
  notes: string;
  extra_data: Record<string, string | number | boolean>;
};

type ExtraField = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'email' | 'number' | 'select' | 'url';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'active', label: 'نشط' },
  { value: 'leave', label: 'إجازة' },
  { value: 'suspended', label: 'موقوف' },
  { value: 'resigned', label: 'مستقيل' },
  { value: 'terminated', label: 'منتهي الخدمة' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'دائم' },
  { value: 'temporary', label: 'مؤقت' },
  { value: 'contract', label: 'عقد' },
  { value: 'training', label: 'تدريب' },
];

const ATTENDANCE_TYPE_OPTIONS = [
  { value: 'full_time', label: 'كامل' },
  { value: 'part_time', label: 'جزئي' },
  { value: 'hourly', label: 'بالساعة' },
  { value: 'daily', label: 'يومية' },
];

const SALARY_CALC_OPTIONS = [
  { value: 'monthly', label: 'شهري' },
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'hourly', label: 'بالساعة' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank', label: 'بنك' },
  { value: 'wallet', label: 'محفظة إلكترونية' },
  { value: 'cheque', label: 'شيك' },
];

const COMMISSION_TYPE_OPTIONS = [
  { value: 'percent', label: 'نسبة' },
  { value: 'fixed', label: 'مبلغ ثابت' },
  { value: 'tiers', label: 'شرائح' },
];

const EMPLOYEE_EXTRA_SECTIONS: Array<{ title: string; fields: ExtraField[] }> = [
  {
    title: 'أولاً: بيانات الموظف الأساسية',
    fields: [
      { key: 'external_employee_code', label: 'كود الموظف الخارجي' },
      { key: 'employee_name_ar', label: 'اسم الموظف', required: true },
      { key: 'nick_name', label: 'اسم الشهرة' },
      { key: 'employee_status', label: 'الحالة', type: 'select', options: EMPLOYEE_STATUS_OPTIONS },
      { key: 'work_start_date', label: 'تاريخ مباشرة العمل', type: 'date' },
      { key: 'contract_end_date', label: 'تاريخ انتهاء العقد', type: 'date' },
      { key: 'employment_type', label: 'نوع التوظيف', type: 'select', options: EMPLOYMENT_TYPE_OPTIONS },
      { key: 'work_branch', label: 'فرع العمل' },
      { key: 'affiliate_company', label: 'الشركة التابعة' },
    ],
  },
  {
    title: 'ثانياً: البيانات الشخصية',
    fields: [
      { key: 'national_id', label: 'الرقم القومي', required: true },
      { key: 'id_issue_date', label: 'تاريخ إصدار البطاقة', type: 'date' },
      { key: 'id_expiry_date', label: 'تاريخ انتهاء البطاقة', type: 'date' },
      { key: 'id_issuer', label: 'جهة إصدار البطاقة' },
      { key: 'birth_date', label: 'تاريخ الميلاد', type: 'date' },
      { key: 'birth_place', label: 'محل الميلاد' },
      { key: 'nationality', label: 'الجنسية' },
      { key: 'gender', label: 'النوع', type: 'select', options: [{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }] },
      { key: 'marital_status', label: 'الحالة الاجتماعية' },
      { key: 'children_count', label: 'عدد الأبناء', type: 'number' },
      { key: 'religion', label: 'الديانة' },
      { key: 'military_status', label: 'الموقف من التجنيد' },
      { key: 'blood_type', label: 'فصيلة الدم' },
    ],
  },
  {
    title: 'ثالثاً: بيانات الاتصال',
    fields: [
      { key: 'primary_mobile', label: 'رقم الموبايل الأساسي' },
      { key: 'secondary_mobile', label: 'رقم موبايل احتياطي' },
      { key: 'whatsapp', label: 'رقم واتساب' },
      { key: 'personal_email', label: 'البريد الإلكتروني الشخصي', type: 'email' },
      { key: 'work_email', label: 'البريد الإلكتروني الوظيفي', type: 'email' },
      { key: 'home_phone', label: 'هاتف المنزل' },
    ],
  },
  {
    title: 'رابعاً: بيانات العنوان الحالي',
    fields: [
      { key: 'current_address', label: 'العنوان الحالي' },
      { key: 'current_country', label: 'الدولة' },
      { key: 'current_governorate', label: 'المحافظة' },
      { key: 'current_city', label: 'المدينة' },
      { key: 'current_area', label: 'المنطقة' },
      { key: 'current_street', label: 'الشارع' },
      { key: 'current_building_no', label: 'رقم العقار' },
      { key: 'current_floor', label: 'الدور' },
      { key: 'current_apartment', label: 'الشقة' },
      { key: 'current_postal_code', label: 'الرمز البريدي' },
      { key: 'current_gps', label: 'لوكيشن GPS' },
    ],
  },
  {
    title: 'العنوان الدائم',
    fields: [
      { key: 'permanent_address', label: 'العنوان الدائم' },
      { key: 'permanent_country', label: 'الدولة' },
      { key: 'permanent_governorate', label: 'المحافظة' },
      { key: 'permanent_city', label: 'المدينة' },
      { key: 'permanent_area', label: 'المنطقة' },
      { key: 'permanent_street', label: 'الشارع' },
      { key: 'permanent_building_no', label: 'رقم العقار' },
      { key: 'permanent_floor', label: 'الدور' },
      { key: 'permanent_apartment', label: 'الشقة' },
      { key: 'permanent_postal_code', label: 'الرمز البريدي' },
      { key: 'permanent_gps', label: 'لوكيشن GPS' },
    ],
  },
  {
    title: 'سادساً: بيانات الراتب',
    fields: [
      { key: 'last_increase_date', label: 'تاريخ آخر زيادة', type: 'date' },
      { key: 'salary_calculation_method', label: 'طريقة احتساب الراتب', type: 'select', options: SALARY_CALC_OPTIONS },
      { key: 'payment_method', label: 'طريقة الصرف', type: 'select', options: PAYMENT_METHOD_OPTIONS },
    ],
  },
  {
    title: 'سابعاً: بيانات البنك',
    fields: [
      { key: 'bank_name', label: 'اسم البنك' },
      { key: 'bank_account_holder', label: 'اسم صاحب الحساب' },
      { key: 'bank_account_no', label: 'رقم الحساب' },
      { key: 'iban', label: 'IBAN' },
      { key: 'swift_code', label: 'SWIFT Code' },
      { key: 'bank_branch', label: 'فرع البنك' },
    ],
  },
  {
    title: 'ثامناً: بيانات العمولات',
    fields: [
      { key: 'commission_type', label: 'نوع العمولة', type: 'select', options: COMMISSION_TYPE_OPTIONS },
      { key: 'commission_rate', label: 'نسبة العمولة', type: 'number' },
      { key: 'commission_amount', label: 'مبلغ العمولة', type: 'number' },
      { key: 'commission_min_sales', label: 'الحد الأدنى للمبيعات', type: 'number' },
      { key: 'commission_max_sales', label: 'الحد الأقصى للمبيعات', type: 'number' },
      { key: 'commission_start_date', label: 'تاريخ بدء العمولة', type: 'date' },
      { key: 'commission_end_date', label: 'تاريخ انتهاء العمولة', type: 'date' },
    ],
  },
  {
    title: 'تاسعاً: بيانات التأمينات',
    fields: [
      { key: 'insurance_no', label: 'رقم التأمين' },
      { key: 'insurance_start_date', label: 'تاريخ الاشتراك', type: 'date' },
      { key: 'insurance_salary', label: 'الراتب التأميني', type: 'number' },
      { key: 'employee_insurance_percent', label: 'نسبة الموظف', type: 'number' },
      { key: 'company_insurance_percent', label: 'نسبة الشركة', type: 'number' },
      { key: 'insurance_office', label: 'مكتب التأمينات' },
    ],
  },
];

function calcAge(birthDate: string | number | boolean | undefined) {
  if (!birthDate || typeof birthDate !== 'string') return '—';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '—';
}

export function EmployeeDataPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = !!user && (user.is_owner || canViewPage(user, 'create-users'));
  const [rows, setRows] = useState<EmployeeDataRow[]>([]);
  const [depts, setDepts] = useState<DepartmentDto[]>([]);
  const [sections, setSections] = useState<HrSectionDto[]>([]);
  const [shifts, setShifts] = useState<WorkShiftDto[]>([]);
  const [titles, setTitles] = useState<{ id: string; name: string; code: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<EmployeeDataRow | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: '',
    phone: '',
    email: '',
    hire_date: '',
    department_id: '',
    hr_section_id: '',
    work_shift_id: '',
    job_title_id: '',
    employee_group_id: '',
    hire_salary: '0',
    basic_salary: '0',
    commission_mode: 'none',
    commission_percent: '0',
    commission_per_1000: '0',
    notes: '',
    extra_data: {},
  });
  const [newAllowance, setNewAllowance] = useState({ name: '', amount: '' });
  const [newIncrease, setNewIncrease] = useState({ amount: '', effective_date: '', notes: '' });
  const [registerOpen, setRegisterOpen] = useState(false);

  const loadMeta = useCallback(async () => {
    const [d, sh, ti, gr] = await Promise.all([
      fetchDepartments(),
      fetchWorkShifts(),
      jobTitlesApi.list(),
      employeeGroupsApi.list(),
    ]);
    setDepts(d);
    setShifts(sh);
    setTitles(ti);
    setGroups(gr);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadMeta();
      setRows(await employeeDataApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [loadMeta]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.department_id) {
      setSections([]);
      return;
    }
    fetchHrSections(form.department_id).then(setSections).catch(() => setSections([]));
  }, [form.department_id]);

  const openEmployee = async (row: EmployeeDataRow) => {
    const full = await employeeDataApi.get(row.id);
    setDetail(full);
    setForm({
      full_name: full.full_name,
      phone: full.phone,
      email: full.email,
      hire_date: full.hire_date || '',
      department_id: full.department_id || '',
      hr_section_id: full.hr_section_id || '',
      work_shift_id: full.work_shift_id || '',
      job_title_id: full.job_title_id || '',
      employee_group_id: full.employee_group_id || '',
      hire_salary: full.hire_salary,
      basic_salary: full.basic_salary,
      commission_mode: full.commission_mode,
      commission_percent: full.commission_percent,
      commission_per_1000: full.commission_per_1000,
      notes: full.notes || '',
      extra_data: {
        ...(full.extra_data || {}),
        employee_name_ar: String((full.extra_data || {}).employee_name_ar || full.full_name || ''),
        primary_mobile: String((full.extra_data || {}).primary_mobile || full.phone || ''),
        work_email: String((full.extra_data || {}).work_email || full.email || ''),
      },
    });
    if (full.department_id) {
      fetchHrSections(full.department_id).then(setSections).catch(() => setSections([]));
    }
    setOpen(true);
  };

  const saveProfile = async () => {
    if (!detail) return;
    if (!form.full_name.trim()) {
      setError('اسم الموظف مطلوب.');
      return;
    }
    if (!String(form.extra_data.national_id || '').trim()) {
      setError('الرقم القومي مطلوب.');
      return;
    }
    const updated = await employeeDataApi.update(detail.id, form);
    setDetail(updated);
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  const addAllowance = async () => {
    if (!detail || !newAllowance.name.trim()) return;
    await employeeDataApi.addAllowance(detail.id, {
      name: newAllowance.name.trim(),
      amount: newAllowance.amount || 0,
    });
    setNewAllowance({ name: '', amount: '' });
    const refreshed = await employeeDataApi.get(detail.id);
    setDetail(refreshed);
    setRows((prev) => prev.map((r) => (r.id === refreshed.id ? { ...r, ...refreshed } : r)));
  };

  const addIncrease = async () => {
    if (!detail) return;
    await employeeDataApi.addIncrease(detail.id, newIncrease);
    setNewIncrease({ amount: '', effective_date: '', notes: '' });
    const refreshed = await employeeDataApi.get(detail.id);
    setDetail(refreshed);
    setRows((prev) => prev.map((r) => (r.id === refreshed.id ? { ...r, ...refreshed } : r)));
  };

  const extra = (key: string) => String(form.extra_data[key] ?? '');

  const setExtra = (key: string, value: string | number | boolean) => {
    setForm((f) => {
      const nextExtra = { ...f.extra_data, [key]: value };
      const next: FormState = { ...f, extra_data: nextExtra };
      if (key === 'employee_name_ar') next.full_name = String(value);
      if (key === 'primary_mobile') next.phone = String(value);
      if (key === 'work_email') next.email = String(value);
      return next;
    });
  };

  const copyCurrentAddress = () => {
    const currentToPermanent: Record<string, string> = {
      current_address: 'permanent_address',
      current_country: 'permanent_country',
      current_governorate: 'permanent_governorate',
      current_city: 'permanent_city',
      current_area: 'permanent_area',
      current_street: 'permanent_street',
      current_building_no: 'permanent_building_no',
      current_floor: 'permanent_floor',
      current_apartment: 'permanent_apartment',
      current_postal_code: 'permanent_postal_code',
      current_gps: 'permanent_gps',
    };
    setForm((f) => {
      const extraData = { ...f.extra_data };
      Object.entries(currentToPermanent).forEach(([from, to]) => {
        extraData[to] = String(extraData[from] ?? '');
      });
      return { ...f, extra_data: extraData };
    });
  };

  const renderExtraField = (field: ExtraField) => {
    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label className="text-xs font-bold text-slate-700">
            {field.label}
            {field.required ? <span className="text-red-600"> *</span> : null}
          </label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={extra(field.key)}
            onChange={(e) => setExtra(field.key, e.target.value)}
          >
            <option value="">—</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-xs font-bold text-slate-700">
          {field.label}
          {field.required ? <span className="text-red-600"> *</span> : null}
        </label>
        <Input
          type={field.type || 'text'}
          className="mt-1"
          value={extra(field.key)}
          onChange={(e) => setExtra(field.key, e.target.value)}
        />
      </div>
    );
  };

  const renderedEmployeeSections = useMemo(
    () =>
      EMPLOYEE_EXTRA_SECTIONS.map((section) => (
        <section key={section.title} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">{section.title}</h3>
            {section.title === 'العنوان الدائم' ? (
              <Button type="button" size="sm" variant="outline" onClick={copyCurrentAddress}>
                <Copy className="h-4 w-4" />
                نسخ العنوان الحالي إلى الدائم
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {section.fields.map(renderExtraField)}
            {section.title === 'ثانياً: البيانات الشخصية' ? (
              <div>
                <label className="text-xs font-bold text-slate-700">العمر (محسوب تلقائياً)</label>
                <div className="mt-1 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  {calcAge(form.extra_data.birth_date)}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )),
    [form.extra_data],
  );


  const handleMediaUpdated = (row: EmployeeDataRow) => {
    setDetail(row);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
  };

  const handleDelete = async (row: EmployeeDataRow) => {
    if (!confirm(t('departments.delete') + '?')) return;
    try {
      await deactivateEmployee(row.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <HrModuleLayout activeTab="employee-data">
      <div className="emp-data-page-wrap">
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <EmployeeDataListView
        rows={rows}
        loading={loading}
        onAdd={() => setRegisterOpen(true)}
        onView={openEmployee}
        onEdit={openEmployee}
        onDelete={handleDelete}
      />

      <EmployeeRegistrationModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={load}
      />

      <ErpSideDrawer
        open={open}
        onOpenChange={setOpen}
        title={detail ? `${detail.full_name} (${detail.employee_code})` : 'بيانات الموظف'}
        description="بيانات كاملة للموظف: أساسية، شخصية، اتصال، عنوان، وظيفة، وراتب."
        onSave={saveProfile}
        saveLabel={t('departments.save')}
        disabled={!detail}
        width="full"
      >
          {detail ? (
            <div className="space-y-6">
              <section className="rounded-xl border bg-blue-50/60 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">كود الموظف (Auto Number)</label>
                    <div className="mt-1 rounded-lg border bg-white px-3 py-2 font-mono text-sm font-bold text-blue-700">
                      {detail.employee_code}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">اسم المستخدم</label>
                    <div className="mt-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold text-slate-700">
                      {detail.username}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">الحالة الحالية</label>
                    <div className="mt-1 rounded-lg border bg-white px-3 py-2 text-sm font-bold text-emerald-700">
                      {detail.is_active ? 'نشط' : 'غير نشط'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">ملاحظة</label>
                    <div className="mt-1 rounded-lg border bg-white px-3 py-2 text-xs text-slate-600">
                      الإجباري: الاسم + الرقم القومي. باقي الحقول اختيارية.
                    </div>
                  </div>
                </div>
              </section>

              <EmployeeMediaPanel
                employeeId={detail.id}
                fullName={detail.full_name}
                photoUrl={detail.photo_url}
                hasIdCard={detail.has_id_card}
                idCardFilename={detail.id_card_filename}
                isAdmin={isAdmin}
                onUpdated={handleMediaUpdated}
              />

              {renderedEmployeeSections}

              <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">خامساً: البيانات الوظيفية</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    بيانات مرتبطة بإعدادات النظام، مع بيانات تنظيمية اختيارية للمدير والدرجة ومركز التكلفة.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.colName')}</label>
                    <Input
                      className="mt-1"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.hireDate')}</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={form.hire_date}
                      onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('nav.departments')}</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.department_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          department_id: e.target.value,
                          hr_section_id: '',
                        }))
                      }
                    >
                      <option value="">—</option>
                      {depts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('nav.hrSections')}</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.hr_section_id}
                      disabled={!form.department_id}
                      onChange={(e) => setForm((f) => ({ ...f, hr_section_id: e.target.value }))}
                    >
                      <option value="">—</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('jobTitles.title')}</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.job_title_id}
                      onChange={(e) => setForm((f) => ({ ...f, job_title_id: e.target.value }))}
                    >
                      <option value="">—</option>
                      {titles.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code} — {x.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('employeeGroups.title')}</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.employee_group_id}
                      onChange={(e) => setForm((f) => ({ ...f, employee_group_id: e.target.value }))}
                    >
                      <option value="">—</option>
                      {groups.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.code} — {x.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('nav.workShifts')}</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.work_shift_id}
                      onChange={(e) => setForm((f) => ({ ...f, work_shift_id: e.target.value }))}
                    >
                      <option value="">—</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">المدير المباشر</label>
                    <Input className="mt-1" value={extra('direct_manager')} onChange={(e) => setExtra('direct_manager', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">درجة الموظف</label>
                    <Input className="mt-1" value={extra('employee_grade')} onChange={(e) => setExtra('employee_grade', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">المستوى الوظيفي</label>
                    <Input className="mt-1" value={extra('job_level')} onChange={(e) => setExtra('job_level', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">مركز التكلفة</label>
                    <Input className="mt-1" value={extra('cost_center')} onChange={(e) => setExtra('cost_center', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">نوع الدوام</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={extra('attendance_type')}
                      onChange={(e) => setExtra('attendance_type', e.target.value)}
                    >
                      <option value="">—</option>
                      {ATTENDANCE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">ملخص الراتب الحالي</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.hireSalary')}</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={form.hire_salary}
                      onChange={(e) => setForm((f) => ({ ...f, hire_salary: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.basicSalary')}</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={form.basic_salary}
                      onChange={(e) => setForm((f) => ({ ...f, basic_salary: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <div>
                    <span className="text-slate-500">{t('employeeData.totalIncreases')}</span>
                    <p className="font-bold">{fmtMoney(detail.total_increases)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('employeeData.currentSalary')}</span>
                    <p className="font-bold text-emerald-700">{fmtMoney(detail.current_salary)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('employeeData.grossWithAllowances')}</span>
                    <p className="font-bold">{fmtMoney(detail.gross_with_allowances)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold">{t('employeeData.commissionMode')}</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.commission_mode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        commission_mode: e.target.value as FormState['commission_mode'],
                      }))
                    }
                  >
                    <option value="none">{t('employeeData.commNone')}</option>
                    <option value="percent">{t('employeeData.commPercent')}</option>
                    <option value="per_thousand">{t('employeeData.commPer1000')}</option>
                  </select>
                </div>
                {form.commission_mode === 'percent' ? (
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.commPercentVal')}</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={form.commission_percent}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, commission_percent: e.target.value }))
                      }
                    />
                  </div>
                ) : null}
                {form.commission_mode === 'per_thousand' ? (
                  <div>
                    <label className="text-xs font-bold">{t('employeeData.commPer1000Val')}</label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={form.commission_per_1000}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, commission_per_1000: e.target.value }))
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">{t('employeeData.commExample')}</p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">{t('employeeData.allowances')}</h3>
                <ul className="space-y-1 text-sm">
                  {(detail.allowances || []).filter((a) => a.is_active).map((a) => (
                    <li key={a.id} className="flex justify-between items-center border-b py-1">
                      <span>{a.name}</span>
                      <span className="font-bold tabular-nums">{fmtMoney(a.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder={t('employeeData.allowanceName')}
                    value={newAllowance.name}
                    onChange={(e) => setNewAllowance((x) => ({ ...x, name: e.target.value }))}
                    className="flex-1 min-w-[120px]"
                  />
                  <Input
                    type="number"
                    placeholder={t('employeeData.amount')}
                    value={newAllowance.amount}
                    onChange={(e) => setNewAllowance((x) => ({ ...x, amount: e.target.value }))}
                    className="w-28"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addAllowance}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </section>

              <section className="rounded-xl border p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">{t('employeeData.increases')}</h3>
                <ul className="space-y-1 text-sm">
                  {(detail.salary_increases || []).map((inc) => (
                    <li key={inc.id} className="flex justify-between border-b py-1">
                      <span>
                        {inc.effective_date} {inc.notes ? `— ${inc.notes}` : ''}
                      </span>
                      <span className="font-bold text-emerald-700">+{fmtMoney(inc.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    placeholder={t('employeeData.amount')}
                    value={newIncrease.amount}
                    onChange={(e) => setNewIncrease((x) => ({ ...x, amount: e.target.value }))}
                    className="w-28"
                  />
                  <Input
                    type="date"
                    value={newIncrease.effective_date}
                    onChange={(e) =>
                      setNewIncrease((x) => ({ ...x, effective_date: e.target.value }))
                    }
                    className="w-40"
                  />
                  <Input
                    placeholder={t('employeeData.notes')}
                    value={newIncrease.notes}
                    onChange={(e) => setNewIncrease((x) => ({ ...x, notes: e.target.value }))}
                    className="flex-1 min-w-[100px]"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addIncrease}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            </div>
          ) : null}
      </ErpSideDrawer>
      </div>
    </HrModuleLayout>
  );
}
