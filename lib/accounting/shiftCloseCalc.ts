import type { CashierDailyReportDto, CashShiftDto } from '@/lib/api/accounting';

export type EditableShiftClose = {
  opening_balance: string;
  sales_total: string;
  sales_credit: string;
  sales_cash: string;
  customer_returns: string;
  down_payment_refunds: string;
  installment_collections: string;
  general_expenses_total: string;
  general_expenses_items: { name: string; amount: string }[];
  supplier_payments_total: string;
  supplier_payments_items: { name: string; amount: string }[];
  wages_total: string;
  wages_items: { name: string; amount: string }[];
};

export type ShiftCloseTotals = {
  total_cash_shift: string;
  net_cash: string;
  expected_drawer: string;
  difference: string;
};

export function num(v: string | number | null | undefined): number {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function moneyStr(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function sumItems(items: { amount: string }[]): number {
  return items.reduce((s, i) => s + num(i.amount), 0);
}

export function recalcShiftClose(
  state: EditableShiftClose,
  countedBalance?: string,
): ShiftCloseTotals {
  const opening = num(state.opening_balance);
  const cash = num(state.sales_cash);
  const returns = num(state.customer_returns);
  const dpRef = num(state.down_payment_refunds);
  const coll = num(state.installment_collections);
  const general = num(state.general_expenses_total);
  const supplier = num(state.supplier_payments_total);
  const wages = num(state.wages_total);

  const totalCashShift = cash - returns - dpRef + coll;
  const netCash = totalCashShift - general - supplier - wages;
  const expectedDrawer = opening + netCash;
  const counted = countedBalance !== undefined ? num(countedBalance) : expectedDrawer;
  const difference = counted - expectedDrawer;

  return {
    total_cash_shift: moneyStr(totalCashShift),
    net_cash: moneyStr(netCash),
    expected_drawer: moneyStr(expectedDrawer),
    difference: moneyStr(difference),
  };
}

export function editableFromReport(
  report: CashierDailyReportDto,
  shift?: CashShiftDto | null,
): EditableShiftClose {
  return {
    opening_balance: report.opening_balance ?? shift?.opening_balance ?? '0',
    sales_total: report.sales.total,
    sales_credit: report.sales.credit,
    sales_cash: report.sales.cash_and_down,
    customer_returns: report.adjustments.customer_returns,
    down_payment_refunds: report.adjustments.down_payment_refunds,
    installment_collections: report.adjustments.installment_collections,
    general_expenses_total: report.general_expenses.total,
    general_expenses_items: [...report.general_expenses.items],
    supplier_payments_total: report.supplier_payments.total,
    supplier_payments_items: [...report.supplier_payments.items],
    wages_total: report.wages.total,
    wages_items: [...report.wages.items],
  };
}

/** تقرير احتياطي من حركات الوردية إذا فشل API التقرير */
export function reportFromShiftDetail(shift: CashShiftDto): CashierDailyReportDto {
  const m = shift.movement_summary ?? {};
  const salesCash = m.sale ?? '0';
  const returns = m.return ?? '0';
  const collections = m.collection ?? '0';
  const expenses = m.expense ?? '0';
  const opening = shift.opening_balance ?? '0';
  const cash = num(salesCash);
  const ret = num(returns);
  const coll = num(collections);
  const exp = num(expenses);
  const totalCash = cash - ret + coll;
  const net = totalCash - exp;

  return {
    shift_id: shift.id,
    shift_code: shift.code,
    employee_name: shift.employee_name,
    branch_name: shift.branch_name,
    treasury_name: shift.treasury_name,
    opened_at: shift.opened_at,
    closed_at: shift.closed_at,
    opening_balance: opening,
    expected_balance: shift.expected_balance,
    sales: { total: salesCash, credit: '0', cash_and_down: salesCash },
    adjustments: {
      customer_returns: returns,
      down_payment_refunds: '0',
      installment_collections: collections,
    },
    total_cash_shift: moneyStr(totalCash),
    general_expenses: { total: expenses, items: [] },
    supplier_payments: { total: '0', items: [] },
    wages: { total: '0', items: [] },
    net_cash: moneyStr(net),
  };
}

export function editableToPrintReport(
  state: EditableShiftClose,
  totals: ShiftCloseTotals,
  meta: Pick<CashierDailyReportDto, 'shift_code' | 'employee_name' | 'shift_id' | 'branch_name' | 'treasury_name' | 'opened_at' | 'closed_at'>,
): CashierDailyReportDto {
  return {
    ...meta,
    shift_id: meta.shift_id ?? '',
    opening_balance: state.opening_balance,
    expected_balance: totals.expected_drawer,
    sales: {
      total: state.sales_total,
      credit: state.sales_credit,
      cash_and_down: state.sales_cash,
    },
    adjustments: {
      customer_returns: state.customer_returns,
      down_payment_refunds: state.down_payment_refunds,
      installment_collections: state.installment_collections,
    },
    total_cash_shift: totals.total_cash_shift,
    general_expenses: {
      total: state.general_expenses_total,
      items: state.general_expenses_items,
    },
    supplier_payments: {
      total: state.supplier_payments_total,
      items: state.supplier_payments_items,
    },
    wages: {
      total: state.wages_total,
      items: state.wages_items,
    },
    net_cash: totals.net_cash,
  };
}
