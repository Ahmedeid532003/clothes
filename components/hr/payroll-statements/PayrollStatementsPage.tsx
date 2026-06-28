import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers3,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchBranches, type BranchDto } from '@/lib/api/branches';
import {
  payrollApi,
  payrollStatementsApi,
  type PayrollSheetRow,
  type PayrollStatementRow,
} from '@/lib/api/hr-payroll';
import { entityName } from '@/lib/entity-name';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import {
  CreatePayrollStatementModal,
  type CreatePayrollStatementForm,
} from '@/components/hr/payroll-statements/CreatePayrollStatementModal';
import { PayrollSheetFillView } from '@/components/hr/payroll-statements/PayrollSheetFillView';
import { PrintEmployeeSalaryModal } from '@/components/hr/payroll-statements/PrintEmployeeSalaryModal';
import {
  fmtEgp,
  monthLabel,
} from '@/components/hr/payroll-statements/payroll-statements-shared';

type SheetDetail = {
  statement: PayrollStatementRow;
  rows: PayrollSheetRow[];
  totals: Record<string, string>;
  draftForm?: CreatePayrollStatementForm;
};

export function PayrollStatementsPage() {
  const { t, isRtl } = useLanguage();
  const [rows, setRows] = useState<PayrollStatementRow[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printSeed, setPrintSeed] = useState<{ employeeId?: string; year?: number; month?: number }>({});
  const [sheetDetail, setSheetDetail] = useState<SheetDetail | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, br] = await Promise.all([
        payrollStatementsApi.list(query),
        fetchBranches(),
      ]);
      setRows(list);
      setBranches(br.filter((b) => b.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 200);
    return () => clearTimeout(timer);
  }, [refresh]);

  const approvedCount = useMemo(
    () => rows.filter((r) => r.status === 'approved').length,
    [rows],
  );

  const openStatement = async (id: string) => {
    setError(null);
    try {
      const data = await payrollStatementsApi.get(id);
      setSheetDetail({
        statement: data,
        rows: data.sheet?.rows || [],
        totals: data.sheet?.totals || {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const openSheetPreview = async (form: CreatePayrollStatementForm) => {
    const branch = branches.find((b) => b.id === form.branch_id);
    const sheet = await payrollApi.sheet(form.period_year, form.period_month, form.branch_id);
    setSheetDetail({
      statement: {
        id: '',
        code: isRtl ? 'مسودة' : 'DRAFT',
        period_year: form.period_year,
        period_month: form.period_month,
        total_amount: sheet.totals?.net_salary || '0',
        status: 'draft',
        branch_id: form.branch_id,
        branch_name: branch ? entityName(branch) : '',
        created_by_id: null,
        created_by_name: null,
        created_at: null,
      },
      rows: sheet.rows || [],
      totals: sheet.totals || {},
      draftForm: form,
    });
  };

  const onCreate = async (form: CreatePayrollStatementForm) => {
    setSaving(true);
    setError(null);
    try {
      setCreateOpen(false);
      await openSheetPreview(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = async () => {
    if (!sheetDetail?.draftForm) return;
    setSaving(true);
    setError(null);
    try {
      await payrollStatementsApi.create(sheetDetail.draftForm);
      await refresh();
      setSheetDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(isRtl ? 'حذف كشف الرواتب؟' : 'Delete payroll statement?')) return;
    try {
      await payrollStatementsApi.remove(id);
      if (sheetDetail?.statement.id === id) setSheetDetail(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  if (sheetDetail) {
    return (
      <div className="pay-stmt-page">
        <header className="pay-stmt-topbar">
          <span className="pay-stmt-topbar-badge">
            {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
          </span>
          <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
        </header>

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <PayrollSheetFillView
          statement={sheetDetail.statement}
          rows={sheetDetail.rows}
          isDraft={Boolean(sheetDetail.draftForm)}
          saving={saving}
          onBack={() => setSheetDetail(null)}
          onSaveDraft={sheetDetail.draftForm ? onSaveDraft : undefined}
          onPrintEmployee={(employeeId) => {
            setPrintSeed({
              employeeId,
              year: sheetDetail.statement.period_year,
              month: sheetDetail.statement.period_month,
            });
            setPrintOpen(true);
          }}
        />

        <PrintEmployeeSalaryModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          initialEmployeeId={printSeed.employeeId}
          initialYear={printSeed.year}
          initialMonth={printSeed.month}
        />
      </div>
    );
  }

  return (
    <div className="pay-stmt-page">
      <header className="pay-stmt-topbar">
        <span className="pay-stmt-topbar-badge">
          {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
        </span>
        <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
      </header>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <section className="pay-stmt-main-card">
        <div className="pay-stmt-action-bar">
          <div className="pay-stmt-action-title">
            <span className="pay-stmt-action-icon">
              <Layers3 className="h-5 w-5" />
            </span>
            <h2>{isRtl ? 'كشوف الرواتب المعتمدة' : 'Approved payroll statements'}</h2>
          </div>
          <ErpSearchBar
            className="pay-stmt-search-bar"
            value={query}
            onChange={setQuery}
            placeholder={isRtl ? 'البحث بكود الكشف، اسم الكشف، الفرع' : 'Search by code, name, branch...'}
            showAdvanced={false}
          />
          <div className="pay-stmt-action-btns">
            <ErpAddButton onClick={() => setCreateOpen(true)}>
              {isRtl ? 'إنشاء كشف جديد' : 'Create statement'}
            </ErpAddButton>
            <button type="button" className="pay-stmt-print-emp-btn" onClick={() => { setPrintSeed({}); setPrintOpen(true); }}>
              <Printer className="h-4 w-4" />
              {isRtl ? 'طباعة راتب موظف' : 'Print employee salary'}
            </button>
          </div>
        </div>

        <div className="pay-stmt-table-head">
          <h3>{isRtl ? 'سجلات كشوفات الرواتب' : 'Payroll statement records'}</h3>
          <span className="pay-stmt-records-pill">
            {approvedCount} {isRtl ? 'سجل معتمد' : 'approved records'}
          </span>
        </div>

        <div className="pay-stmt-table-scroll">
          <table className="pay-stmt-table">
            <thead>
              <tr>
                <th>{isRtl ? 'كود الكشف' : 'Statement code'}</th>
                <th>{isRtl ? 'راتب شهر / الشهر' : 'Month'}</th>
                <th>{isRtl ? 'عام' : 'Year'}</th>
                <th>{isRtl ? 'الفرع' : 'Branch'}</th>
                <th>{isRtl ? 'إجمالي الكشف' : 'Total'}</th>
                <th>{isRtl ? 'منشئ الكشف' : 'Creator'}</th>
                <th>{isRtl ? 'تاريخ الإنشاء' : 'Created'}</th>
                <th className="pay-stmt-th-actions">{isRtl ? 'خيارات الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="pay-stmt-empty">
                    {t('inventory.loading')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="pay-stmt-empty">
                    {t('hrPayroll.sheet.title')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="pay-stmt-code">{row.code}</td>
                    <td>{monthLabel(row.period_month, isRtl)}</td>
                    <td className="pay-stmt-year">{row.period_year}</td>
                    <td>
                      <span className="pay-stmt-branch-pill">{row.branch_name || '—'}</span>
                    </td>
                    <td>
                      <span className="pay-stmt-total">{fmtEgp(row.total_amount)} EGP</span>
                    </td>
                    <td>{row.created_by_name || '—'}</td>
                    <td className="pay-stmt-date">{row.created_at || '—'}</td>
                    <td>
                      <div className="pay-stmt-row-actions">
                        <button type="button" className="pay-stmt-action is-print">
                          <Printer className="h-3.5 w-3.5" />
                          {isRtl ? 'طباعة' : 'Print'}
                        </button>
                        <button
                          type="button"
                          className="pay-stmt-action is-edit"
                          onClick={() => openStatement(row.id)}
                          aria-label="edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="pay-stmt-action is-delete"
                          onClick={() => onDelete(row.id)}
                          aria-label="delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreatePayrollStatementModal
        open={createOpen}
        branches={branches}
        saving={saving}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
      />

      <PrintEmployeeSalaryModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        initialEmployeeId={printSeed.employeeId}
        initialYear={printSeed.year}
        initialMonth={printSeed.month}
      />
    </div>
  );
}
