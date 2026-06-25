import type { ActiveShiftUser, CashShiftDto } from '@/lib/api/accounting';

/** معرّف الوردية — يدعم id و shift_id */
export function shiftRowId(row: { id?: string; shift_id?: string } | null | undefined): string {
  if (!row) return '';
  return String(row.id || row.shift_id || '').trim();
}

export function safeMoneyStr(v: string | number | null | undefined): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

/** دمج my-open مع قائمة النشطين والجدول لضمان وجود id */
export function resolveMyOpenShift(
  myOpen: CashShiftDto | null,
  activeUsers: ActiveShiftUser[],
  rows: CashShiftDto[],
  userId: string | undefined,
): CashShiftDto | null {
  if (myOpen && shiftRowId(myOpen)) return myOpen;

  const mine = userId
    ? activeUsers.find((u) => u.employee_id === userId)
    : undefined;
  const rowMatch = userId
    ? rows.find((r) => r.status === 'open' && r.employee === userId)
    : undefined;

  if (rowMatch && shiftRowId(rowMatch)) return rowMatch;

  if (mine?.shift_id) {
    return {
      id: mine.shift_id,
      code: mine.shift_code,
      employee: mine.employee_id,
      employee_name: mine.employee_name,
      branch: '',
      branch_name: mine.branch_name,
      treasury: '',
      treasury_name: mine.treasury_name,
      status: 'open',
      opened_at: mine.opened_at,
      closed_at: null,
      opening_balance: mine.expected_balance,
      expected_balance: mine.expected_balance,
      actual_balance: null,
      difference: '0',
      notes: '',
      approved_at: null,
      handover_status: 'none',
    };
  }

  return myOpen && shiftRowId(myOpen) ? myOpen : null;
}
