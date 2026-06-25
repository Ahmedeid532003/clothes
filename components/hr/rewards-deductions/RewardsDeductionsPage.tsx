import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Gift,
  Pencil,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { employeeDataApi, type EmployeeDataRow } from '@/lib/api/employee-data';
import {
  bonusItemsApi,
  bonusesApi,
  deductionItemsApi,
  deductionsApi,
  type BonusRow,
  type DeductionRow,
} from '@/lib/api/hr-payroll';
import { AlertBanner } from '@/components/accounting/AccountingUi';
import { HrModuleLayout } from '@/components/hr/HrModuleLayout';
import { BonusFormModal, type BonusFormState } from '@/components/hr/rewards-deductions/BonusFormModal';
import {
  DeductionFormModal,
  type DeductionFormState,
} from '@/components/hr/rewards-deductions/DeductionFormModal';

function fmtMoney(value: string | number) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function rowDetail(row: BonusRow | DeductionRow) {
  const desc = 'description' in row ? row.description : '';
  const notes = row.notes || '';
  const item =
    'bonus_item_name' in row ? row.bonus_item_name : (row as DeductionRow).deduction_item_name;
  return desc || notes || item || '—';
}

function TxnTable({
  kind,
  rows,
  loading,
  emptyLabel,
  isRtl,
}: {
  kind: 'bonus' | 'deduction';
  rows: (BonusRow | DeductionRow)[];
  loading: boolean;
  emptyLabel: string;
  isRtl: boolean;
}) {
  const dateKey = kind === 'bonus' ? 'bonus_date' : 'deduction_date';

  return (
    <div className={`rd-txn-table-wrap is-${kind}`}>
      <div className={`rd-txn-table-head is-${kind}`}>
        <span className="rd-txn-table-head-icon">
          {kind === 'bonus' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </span>
        <strong>
          {kind === 'bonus'
            ? isRtl
              ? 'سجل المكافآت والحوافز الأخيرة'
              : 'Recent bonuses & incentives'
            : isRtl
              ? 'سجل الخصومات والخصوم التأديبية'
              : 'Recent deductions & penalties'}
        </strong>
        <span className={`rd-txn-count is-${kind}`}>{rows.length}</span>
      </div>
      <div className="rd-txn-table-scroll">
        <table className="rd-txn-table">
          <thead>
            <tr>
              <th>{isRtl ? 'الموظف' : 'Employee'}</th>
              <th>{isRtl ? 'القيمة' : 'Value'}</th>
              <th>{isRtl ? 'التفاصيل والسبب' : 'Details & reason'}</th>
              <th>{isRtl ? 'التاريخ' : 'Date'}</th>
              <th className="rd-txn-th-actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="rd-txn-empty">
                  ...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="rd-txn-empty">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="rd-txn-employee">
                      <strong>{row.employee_name}</strong>
                      <small>{row.employee_code}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`rd-txn-amount is-${kind}`}>
                      {kind === 'bonus' ? '+' : '-'}
                      {fmtMoney(row.amount)} EGP
                    </span>
                  </td>
                  <td>
                    <span className="rd-txn-detail">{rowDetail(row)}</span>
                  </td>
                  <td>
                    <span className="rd-txn-date">{String(row[dateKey as keyof typeof row] || '—')}</span>
                  </td>
                  <td>
                    <div className="rd-txn-row-actions">
                      <button type="button" className="rd-txn-action is-edit" aria-label="edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="rd-txn-action is-delete" aria-label="delete">
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
    </div>
  );
}

export function RewardsDeductionsPage() {
  const { t, isRtl } = useLanguage();
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeDataRow[]>([]);
  const [bonusItems, setBonusItems] = useState<Awaited<ReturnType<typeof bonusItemsApi.list>>>([]);
  const [deductionItems, setDeductionItems] = useState<Awaited<ReturnType<typeof deductionItemsApi.list>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [deductionOpen, setDeductionOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, d, emps, bi, di] = await Promise.all([
        bonusesApi.list(),
        deductionsApi.list(),
        employeeDataApi.list(),
        bonusItemsApi.list(),
        deductionItemsApi.list(),
      ]);
      setBonuses(b);
      setDeductions(d);
      setEmployees(emps.filter((e) => e.is_active));
      setBonusItems(bi.filter((x) => x.is_active));
      setDeductionItems(di.filter((x) => x.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setBonuses([]);
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalBonuses = useMemo(
    () => bonuses.reduce((s, r) => s + Number(r.amount || 0), 0),
    [bonuses],
  );
  const totalDeductions = useMemo(
    () => deductions.reduce((s, r) => s + Number(r.amount || 0), 0),
    [deductions],
  );

  const today = new Date().toISOString().slice(0, 10);

  const onBonusSubmit = async (form: BonusFormState) => {
    setSaving(true);
    setError(null);
    try {
      await bonusesApi.create({
        employee_id: form.employee_id,
        bonus_item_id: form.bonus_item_id || null,
        amount: form.amount,
        bonus_date: today,
        description: form.description,
        notes: form.description,
      });
      setBonusOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const onDeductionSubmit = async (form: DeductionFormState) => {
    setSaving(true);
    setError(null);
    try {
      await deductionsApi.create({
        employee_id: form.employee_id,
        deduction_item_id: form.deduction_item_id || null,
        amount: form.amount,
        deduction_date: today,
        description: form.description,
        notes: form.description,
      });
      setDeductionOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrModuleLayout activeTab="bonuses">
      <div className="rd-hub-page">
        <header className="rd-hub-topbar">
          <span className="rd-hub-topbar-badge">
            {isRtl ? 'بوابة الموارد البشرية والرواتب الذكية' : 'Smart HR & payroll portal'}
          </span>
          <h1>{isRtl ? 'منظومة إدارة الموظفين والهيكل الإداري' : 'Employee management system'}</h1>
        </header>

        {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

        <section className="rd-hub-intro-card">
          <div className="rd-hub-intro-main">
            <span className="rd-hub-intro-badge">
              {isRtl ? 'سجل المكافآت والخصومات الفوري' : 'Instant rewards & deductions log'}
            </span>
            <h2>
              <Gift className="h-5 w-5" />
              {isRtl ? 'تسجيل مكافآت وخصومات الموظفين' : 'Employee rewards & deductions'}
            </h2>
            <p>
              {isRtl
                ? 'أضف المكافآت والخصومات فوراً وتنعكس مباشرة على كشف الرواتب للشهر المفتوح دون الحاجة لخطوات إضافية.'
                : 'Add bonuses and deductions instantly; they reflect on the open payroll month.'}
            </p>
          </div>
          <div className="rd-hub-summary-cards">
            <div className="rd-hub-summary is-bonus">
              <span>{isRtl ? 'إجمالي المكافآت' : 'Total bonuses'}</span>
              <strong>{fmtMoney(totalBonuses)} {isRtl ? 'ج.م' : 'EGP'}</strong>
            </div>
            <div className="rd-hub-summary is-deduction">
              <span>{isRtl ? 'إجمالي الخصومات' : 'Total deductions'}</span>
              <strong>{fmtMoney(totalDeductions)} {isRtl ? 'ج.م' : 'EGP'}</strong>
            </div>
          </div>
        </section>

        <section className="rd-hub-actions-card">
          <div className="rd-hub-actions-text">
            <h3>{isRtl ? 'إجراءات مالية سريعة' : 'Quick financial actions'}</h3>
            <p>
              {isRtl
                ? 'قم بإضافة مكافأة جديدة لأي موظف أو تسجيل خصم مالي فوري.'
                : 'Add a new bonus or record an immediate deduction.'}
            </p>
          </div>
          <div className="rd-hub-actions-btns">
            <button type="button" className="rd-hub-btn is-bonus" onClick={() => setBonusOpen(true)}>
              <Trophy className="h-4 w-4" />
              {isRtl ? 'إضافة مكافأة' : 'Add bonus'}
            </button>
            <button type="button" className="rd-hub-btn is-deduction" onClick={() => setDeductionOpen(true)}>
              <AlertTriangle className="h-4 w-4" />
              {isRtl ? 'تسجيل خصم' : 'Record deduction'}
            </button>
          </div>
        </section>

        <section className="rd-hub-ledger-card">
          <header className="rd-hub-ledger-head">
            <div className="rd-hub-ledger-title">
              <FileText className="h-5 w-5" />
              <h3>{isRtl ? 'دفتر المعاملات والقيود الفردية النشطة' : 'Active transactions ledger'}</h3>
            </div>
            <span className="rd-hub-ledger-pill">
              {isRtl
                ? `المكافآت المسجلة: ${bonuses.length} • الخصومات المسجلة: ${deductions.length}`
                : `Bonuses: ${bonuses.length} • Deductions: ${deductions.length}`}
            </span>
          </header>
          <div className="rd-hub-tables-grid">
            <TxnTable
              kind="bonus"
              rows={bonuses}
              loading={loading}
              emptyLabel={t('hrPayroll.bonuses.empty')}
              isRtl={isRtl}
            />
            <TxnTable
              kind="deduction"
              rows={deductions}
              loading={loading}
              emptyLabel={t('hrPayroll.deductions.empty')}
              isRtl={isRtl}
            />
          </div>
        </section>

        <BonusFormModal
          open={bonusOpen}
          employees={employees}
          items={bonusItems}
          saving={saving}
          onClose={() => setBonusOpen(false)}
          onSubmit={onBonusSubmit}
        />
        <DeductionFormModal
          open={deductionOpen}
          employees={employees}
          items={deductionItems}
          saving={saving}
          onClose={() => setDeductionOpen(false)}
          onSubmit={onDeductionSubmit}
        />
      </div>
    </HrModuleLayout>
  );
}
