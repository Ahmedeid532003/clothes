import React from 'react';
import { Printer, TrendingDown, TrendingUp } from 'lucide-react';
import type { CommissionRow } from '@/lib/api/hr-payroll';
import type { PayrollSheetRow } from '@/lib/api/hr-payroll';
import { fmtEgp } from '@/components/hr/payroll-statements/payroll-statements-shared';

export type EmployeeCardState = {
  shiftRequired: string;
  shiftActual: string;
  basicSalary: string;
  salesBonus: string;
  salesAmount: string;
  commissionPercent: string;
  lateDeduction: string;
  adminDeduction: string;
  advanceTotal: string;
  inc1: string;
  inc2: string;
};

export function buildCardState(row: PayrollSheetRow, commission?: CommissionRow): EmployeeCardState {
  const deductions = Number(row.total_deductions || 0);
  const sales = Number(commission?.sales_amount || 0);
  const comm = Number(row.total_commissions || commission?.commission_amount || 0);
  const pct = sales > 0 ? String(Math.round((comm / sales) * 10000) / 100) : '0';

  return {
    shiftRequired: '300',
    shiftActual: deductions > 0 ? '290' : '300',
    basicSalary: String(Number(row.current_salary || row.basic_salary || 0) || ''),
    salesBonus: String(Number(row.total_bonuses || 0) || '0'),
    salesAmount: sales > 0 ? String(Math.round(sales)) : '0',
    commissionPercent: pct,
    lateDeduction: deductions > 0 ? String(Math.round(deductions * 0.7)) : '0',
    adminDeduction: deductions > 0 ? String(Math.round(deductions * 0.3)) : '0',
    advanceTotal: String(Number(row.advances_balance || 0) || '0'),
    inc1: '',
    inc2: '',
  };
}

export function cardTotals(state: EmployeeCardState, row: PayrollSheetRow) {
  const basic = Number(state.basicSalary || 0);
  const bonus = Number(state.salesBonus || 0);
  const sales = Number(state.salesAmount || 0);
  const pct = Number(state.commissionPercent || 0);
  const commissionNet =
    Number(row.total_commissions || 0) > 0
      ? Number(row.total_commissions)
      : Math.round((sales * pct) / 100);
  const inc1 = Number(state.inc1 || 0);
  const inc2 = Number(state.inc2 || 0);
  const grossDue = basic + bonus + commissionNet + inc1 + inc2;
  const late = Number(state.lateDeduction || 0);
  const admin = Number(state.adminDeduction || 0);
  const advance = Number(state.advanceTotal || 0);
  const totalDeducted = late + admin + advance;
  const net = Math.max(0, grossDue - totalDeducted);
  return { commissionNet, grossDue, totalDeducted, net };
}

function employeeInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0];
}

export function PayrollEmployeeCard({
  index,
  row,
  state,
  isRtl,
  onChange,
  onPrint,
}: {
  index: number;
  row: PayrollSheetRow;
  state: EmployeeCardState;
  isRtl: boolean;
  onChange: (patch: Partial<EmployeeCardState>) => void;
  onPrint?: () => void;
}) {
  const totals = cardTotals(state, row);

  return (
    <article className="pay-stmt-emp-card">
      <header className="pay-stmt-emp-head">
        <button type="button" className="pay-stmt-emp-print" aria-label="print" onClick={onPrint}>
          <Printer className="h-4 w-4" />
        </button>
        <span className="pay-stmt-emp-avatar">{employeeInitial(row.employee_name)}</span>
        <div className="pay-stmt-emp-head-text">
          <strong>{row.employee_name}</strong>
          <span className="pay-stmt-emp-seq">{index + 1}</span>
        </div>
      </header>

      <div className="pay-stmt-emp-hours">
        <label className="pay-stmt-emp-hour-box">
          <span>{isRtl ? 'ساعات الشفت المطلوبة' : 'Required shift hours'}</span>
          <input
            type="number"
            value={state.shiftRequired}
            onChange={(e) => onChange({ shiftRequired: e.target.value })}
          />
        </label>
        <label className="pay-stmt-emp-hour-box">
          <span>{isRtl ? 'ساعات الدوام الفعلية' : 'Actual working hours'}</span>
          <input
            type="number"
            value={state.shiftActual}
            onChange={(e) => onChange({ shiftActual: e.target.value })}
          />
        </label>
      </div>

      <div className="pay-stmt-emp-columns">
        <div className="pay-stmt-emp-col is-earnings">
          <div className="pay-stmt-emp-col-title">
            <TrendingUp className="h-4 w-4" />
            <span>{isRtl ? 'المستحقات' : 'Earnings'}</span>
          </div>

          <label className="pay-stmt-emp-field">
            <span>{isRtl ? 'الراتب الأساسي' : 'Basic salary'}</span>
            <input
              type="number"
              value={state.basicSalary}
              onChange={(e) => onChange({ basicSalary: e.target.value })}
            />
          </label>

          <label className="pay-stmt-emp-field">
            <span>{isRtl ? 'إضافي مبيعات/عمل' : 'Sales / work bonus'}</span>
            <input
              type="number"
              value={state.salesBonus}
              onChange={(e) => onChange({ salesBonus: e.target.value })}
            />
          </label>

          <div className="pay-stmt-emp-subbox">
            <strong>{isRtl ? 'المبيعات وعمولة %' : 'Sales & commission %'}</strong>
            <div className="pay-stmt-emp-subbox-row">
              <input
                type="number"
                value={state.salesAmount}
                onChange={(e) => onChange({ salesAmount: e.target.value })}
                placeholder={isRtl ? 'المبيعات' : 'Sales'}
              />
              <input
                type="number"
                value={state.commissionPercent}
                onChange={(e) => onChange({ commissionPercent: e.target.value })}
                placeholder="%"
              />
            </div>
            <div className="pay-stmt-emp-subbox-result">
              <span>{isRtl ? 'صافي العمولة' : 'Net commission'}</span>
              <em>{fmtEgp(totals.commissionNet)}</em>
            </div>
          </div>

          <div className="pay-stmt-emp-subbox is-incentives">
            <strong>{isRtl ? 'الحوافز التقديرية' : 'Discretionary incentives'}</strong>
            <div className="pay-stmt-emp-inc-row">
              <input
                type="text"
                value={state.inc1}
                onChange={(e) => onChange({ inc1: e.target.value })}
                placeholder="Inc 1"
              />
              <input
                type="text"
                value={state.inc2}
                onChange={(e) => onChange({ inc2: e.target.value })}
                placeholder="Inc 2"
              />
            </div>
          </div>
        </div>

        <div className="pay-stmt-emp-col is-deductions">
          <div className="pay-stmt-emp-col-title is-red">
            <TrendingDown className="h-4 w-4" />
            <span>{isRtl ? 'المستقطعات' : 'Deductions'}</span>
          </div>

          <label className="pay-stmt-emp-field">
            <span>{isRtl ? 'خصم التأخير التلقائي' : 'Auto lateness deduction'}</span>
            <input
              type="number"
              className="is-red-input"
              value={state.lateDeduction}
              onChange={(e) => onChange({ lateDeduction: e.target.value })}
            />
          </label>

          <label className="pay-stmt-emp-field">
            <span>{isRtl ? 'خصم مالي إداري' : 'Admin deduction'}</span>
            <input
              type="number"
              className="is-red-input"
              value={state.adminDeduction}
              onChange={(e) => onChange({ adminDeduction: e.target.value })}
            />
          </label>

          <label className="pay-stmt-emp-field is-advance">
            <span>{isRtl ? 'قيمة السلف الكلية' : 'Total advance value'}</span>
            <input
              type="number"
              value={state.advanceTotal}
              onChange={(e) => onChange({ advanceTotal: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="pay-stmt-emp-totals">
        <div className="pay-stmt-emp-total-box is-due">
          <span>{isRtl ? 'إجمالي المستحق' : 'Total due'}</span>
          <strong>{fmtEgp(totals.grossDue)}</strong>
        </div>
        <div className="pay-stmt-emp-total-box is-deducted">
          <span>{isRtl ? 'إجمالي المستقطع' : 'Total deducted'}</span>
          <strong>{fmtEgp(totals.totalDeducted)}</strong>
        </div>
      </div>

      <footer className="pay-stmt-emp-net">
        <span>{isRtl ? 'صافي دخل الموظف' : 'Net employee income'}</span>
        <strong>
          {fmtEgp(totals.net)} {isRtl ? 'ج.م' : 'EGP'}
        </strong>
      </footer>
    </article>
  );
}
