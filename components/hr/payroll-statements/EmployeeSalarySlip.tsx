import React, { forwardRef } from 'react';
import { monthLabel } from '@/components/hr/payroll-statements/payroll-statements-shared';

export type SalarySlipLine = {
  key: string;
  labelAr: string;
  labelEn: string;
  value: string;
  tone?: 'normal' | 'green' | 'red' | 'yellow' | 'net';
  empty?: boolean;
};

export type SalarySlipData = {
  employeeCode: string;
  employeeName: string;
  year: number;
  month: number;
  lines: SalarySlipLine[];
  generatedAt: Date;
};

function fmtMoney(value: string | number, emptyLabel: string) {
  const n = Number(value || 0);
  if (!value && value !== 0) return emptyLabel;
  if (!n) return emptyLabel;
  return `EGP ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtDeduction(value: string | number, emptyLabel: string) {
  const n = Number(value || 0);
  if (!n) return emptyLabel;
  return `EGP ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}-`;
}

export function buildSalarySlipLines(
  card: {
    shiftRequired: string;
    shiftActual: string;
    basicSalary: string;
    salesBonus: string;
    inc1: string;
    inc2: string;
    lateDeduction: string;
    adminDeduction: string;
    advanceTotal: string;
  },
  totals: { commissionNet: number; grossDue: number; totalDeducted: number; net: number },
  visible: Record<string, boolean>,
  emptyLabel: string,
): SalarySlipLine[] {
  const all: SalarySlipLine[] = [
    {
      key: 'shiftHours',
      labelAr: 'عدد ساعات الشفت',
      labelEn: 'Shift hours',
      value: card.shiftRequired || emptyLabel,
      empty: !Number(card.shiftRequired),
    },
    {
      key: 'actualHours',
      labelAr: 'ساعات العمل الفعليه',
      labelEn: 'Actual working hours',
      value: card.shiftActual || emptyLabel,
      empty: !Number(card.shiftActual),
    },
    {
      key: 'overtime',
      labelAr: 'اضافي',
      labelEn: 'Overtime',
      value: fmtMoney(card.salesBonus, emptyLabel),
      empty: !Number(card.salesBonus),
    },
    {
      key: 'commission',
      labelAr: 'صافي العموله',
      labelEn: 'Net commission',
      value: fmtMoney(totals.commissionNet, emptyLabel),
      tone: 'green',
      empty: !totals.commissionNet,
    },
    {
      key: 'inc1',
      labelAr: 'حافز 1',
      labelEn: 'Incentive 1',
      value: card.inc1?.trim() ? fmtMoney(card.inc1, emptyLabel) : emptyLabel,
      empty: !card.inc1?.trim(),
    },
    {
      key: 'inc2',
      labelAr: 'حافز 2',
      labelEn: 'Incentive 2',
      value: card.inc2?.trim() ? fmtMoney(card.inc2, emptyLabel) : emptyLabel,
      empty: !card.inc2?.trim(),
    },
    {
      key: 'grossDue',
      labelAr: 'اجمالي المستحق',
      labelEn: 'Total due',
      value: fmtMoney(totals.grossDue, emptyLabel),
      tone: 'yellow',
    },
    {
      key: 'lateDeduction',
      labelAr: 'خصم تاخيرات',
      labelEn: 'Lateness deduction',
      value: fmtDeduction(card.lateDeduction, emptyLabel),
      tone: 'red',
      empty: !Number(card.lateDeduction),
    },
    {
      key: 'adminDeduction',
      labelAr: 'خصم 2',
      labelEn: 'Deduction 2',
      value: fmtDeduction(card.adminDeduction, emptyLabel),
      tone: 'red',
      empty: !Number(card.adminDeduction),
    },
    {
      key: 'advances',
      labelAr: 'سلف',
      labelEn: 'Advances',
      value: fmtDeduction(card.advanceTotal, emptyLabel),
      tone: 'red',
      empty: !Number(card.advanceTotal),
    },
    {
      key: 'totalDeducted',
      labelAr: 'اجمالي المستقطع',
      labelEn: 'Total deducted',
      value: fmtMoney(totals.totalDeducted, emptyLabel),
      tone: 'yellow',
    },
    {
      key: 'net',
      labelAr: 'الصافي',
      labelEn: 'Net',
      value: fmtMoney(totals.net, emptyLabel),
      tone: 'net',
    },
  ];
  return all.filter((line) => visible[line.key] !== false);
}

export const DEFAULT_SLIP_VISIBLE: Record<string, boolean> = {
  shiftHours: true,
  actualHours: true,
  overtime: true,
  commission: true,
  inc1: true,
  inc2: true,
  grossDue: true,
  lateDeduction: true,
  adminDeduction: true,
  advances: true,
  totalDeducted: true,
  net: true,
};

function slipRowClass(tone?: SalarySlipLine['tone']) {
  if (!tone) return '';
  if (tone === 'red') return ' class="is-red"';
  if (tone === 'green') return ' class="is-green"';
  if (tone === 'yellow') return ' class="is-yellow"';
  if (tone === 'net') return ' class="is-net"';
  return '';
}

export function buildEmployeeSalarySlipHtml(
  data: SalarySlipData,
  basicSalary: string,
  paperSize: 'thermal' | 'a4',
  isRtl: boolean,
): string {
  const emptyLabel = isRtl ? 'فارغ' : 'Empty';
  const locale = isRtl ? 'ar' : 'en';
  const dir = isRtl ? 'rtl' : 'ltr';
  const ts = data.generatedAt.toLocaleString(isRtl ? 'ar-EG' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const width = paperSize === 'thermal' ? '80mm' : '210mm';

  const dynamicRows = data.lines
    .map((line) => {
      const label = isRtl ? line.labelAr : line.labelEn;
      const thClass = line.tone === 'red' ? ' class="is-red-label"' : '';
      const tdClass = line.empty ? ' class="is-empty"' : '';
      return `<tr${slipRowClass(line.tone)}><th${thClass}>${label}</th><td${tdClass}>${line.value}</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${isRtl ? 'بيان مفردات راتب موظف' : 'Employee salary statement'}</title>
  <style>
    @page { margin: 8mm; size: ${paperSize === 'thermal' ? '80mm auto' : 'A4'}; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 12px; color: #0f172a; background: #fff; }
    .doc { width: ${width}; max-width: 100%; margin: 0 auto; border: 2px dashed #cbd5e1; padding: 12px 10px; box-sizing: border-box; }
    .head { text-align: center; margin-bottom: 10px; }
    .head h3 { margin: 0 0 4px; font-size: 16px; font-weight: 800; }
    .head p { margin: 0; font-size: 13px; font-weight: 700; }
    .head small { display: block; margin-top: 4px; font-size: 11px; color: #64748b; direction: ltr; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
    th, td { border: 1px solid #111827; padding: 7px 6px; text-align: center; vertical-align: middle; font-weight: 700; }
    th { width: 52%; background: #fff; }
    td { width: 48%; direction: ltr; }
    td.is-empty { color: #94a3b8; font-style: italic; font-weight: 600; }
    tr.is-green td { color: #15803d; font-weight: 800; }
    tr.is-red td, tr.is-red th.is-red-label { color: #dc2626; font-weight: 800; }
    tr.is-yellow th, tr.is-yellow td { background: #fde047; font-weight: 800; }
    tr.is-net th, tr.is-net td { background: #15803d; color: #fff; font-weight: 800; }
    .foot { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <h3>${isRtl ? 'بيان مفردات راتب موظف' : 'Employee salary statement'}</h3>
      <p>${isRtl ? 'الشهر:' : 'Month:'} ${monthLabel(data.month, isRtl)} • ${isRtl ? 'العام:' : 'Year:'} ${data.year}</p>
      <small>${ts}</small>
    </div>
    <table>
      <tbody>
        <tr><th>${isRtl ? 'كود الموظف' : 'Employee code'}</th><td>${data.employeeCode}</td></tr>
        <tr><th>${isRtl ? 'اسم الموظف' : 'Employee name'}</th><td>${data.employeeName}</td></tr>
        <tr><th>${isRtl ? 'الراتب الاساسي' : 'Basic salary'}</th><td>${fmtMoney(basicSalary, emptyLabel)}</td></tr>
        ${dynamicRows}
      </tbody>
    </table>
    <div class="foot">${isRtl ? 'معتمد من نظام الإدارة المالية والرواتب الموحد.' : 'Certified by the unified financial & payroll management system.'}</div>
  </div>
  <script>window.onload = function(){ window.focus(); window.print(); };</script>
</body>
</html>`;
}

export function printEmployeeSalarySlip(
  data: SalarySlipData,
  basicSalary: string,
  paperSize: 'thermal' | 'a4',
  isRtl: boolean,
): boolean {
  const html = buildEmployeeSalarySlipHtml(data, basicSalary, paperSize, isRtl);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=520,height=760');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}

export const EmployeeSalarySlip = forwardRef<
  HTMLDivElement,
  {
    data: SalarySlipData;
    paperSize: 'thermal' | 'a4';
    isRtl: boolean;
    basicSalary: string;
  }
>(function EmployeeSalarySlip({ data, paperSize, isRtl, basicSalary }, ref) {
  const emptyLabel = isRtl ? 'فارغ' : 'Empty';
  const ts = data.generatedAt.toLocaleString(isRtl ? 'ar-EG' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      ref={ref}
      className={`pay-slip-doc pay-slip-print-target ${paperSize === 'thermal' ? 'is-thermal' : 'is-a4'}`}
    >
      <header className="pay-slip-doc-head">
        <h3>{isRtl ? 'بيان مفردات راتب موظف' : 'Employee salary statement'}</h3>
        <p>
          {isRtl ? 'الشهر:' : 'Month:'} {monthLabel(data.month, isRtl)} • {isRtl ? 'العام:' : 'Year:'}{' '}
          {data.year}
        </p>
        <small>{ts}</small>
      </header>

      <table className="pay-slip-table">
        <tbody>
          <tr>
            <th>{isRtl ? 'كود الموظف' : 'Employee code'}</th>
            <td>{data.employeeCode}</td>
          </tr>
          <tr>
            <th>{isRtl ? 'اسم الموظف' : 'Employee name'}</th>
            <td>{data.employeeName}</td>
          </tr>
          <tr>
            <th>{isRtl ? 'الراتب الاساسي' : 'Basic salary'}</th>
            <td>{fmtMoney(basicSalary, emptyLabel)}</td>
          </tr>
          {data.lines.map((line) => (
            <tr key={line.key} className={line.tone ? `is-${line.tone}` : undefined}>
              <th className={line.tone === 'red' ? 'is-red-label' : undefined}>
                {isRtl ? line.labelAr : line.labelEn}
              </th>
              <td className={line.empty ? 'is-empty-val' : undefined}>{line.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="pay-slip-doc-foot">
        <p>
          {isRtl
            ? 'معتمد من نظام الإدارة المالية والرواتب الموحد.'
            : 'Certified by the unified financial & payroll management system.'}
        </p>
      </footer>
    </div>
  );
});
