/** ERP HR tabs ↔ mozafen EmployeesTab sub-menus */

export const EMPLOYEES_CANVAS_SUBTABS = [
  'org',
  'directory',
  'shifts',
  'attendance',
  'bonus',
  'deduct',
  'commissions',
  'payroll',
  'disbursals',
  'reports',
] as const;

export type EmployeesCanvasSubTab = (typeof EMPLOYEES_CANVAS_SUBTABS)[number];

const ERP_TO_SUB: Record<string, EmployeesCanvasSubTab> = {
  'hr-job-structure': 'org',
  departments: 'org',
  'hr-sections': 'org',
  'job-titles': 'org',
  'employee-groups': 'org',
  'work-shifts': 'shifts',
  'employee-data': 'directory',
  'create-users': 'directory',
  attendance: 'attendance',
  'attendance-import': 'attendance',
  bonuses: 'bonus',
  deductions: 'deduct',
  'deduction-items': 'deduct',
  'allowance-items': 'bonus',
  'employee-commissions': 'commissions',
  payroll: 'payroll',
  'payroll-payments': 'payroll',
  'payment-auth-types': 'disbursals',
  'employee-reports': 'reports',
};

export function isEmployeesCanvasRoute(tab: string): boolean {
  return tab in ERP_TO_SUB;
}

export function employeesTabToSubTab(tab: string): EmployeesCanvasSubTab {
  return ERP_TO_SUB[tab] ?? 'directory';
}

export function employeesSubTabToErpTab(sub: string): string {
  switch (sub) {
    case 'org':
      return 'hr-job-structure';
    case 'shifts':
      return 'work-shifts';
    case 'directory':
      return 'employee-data';
    case 'attendance':
      return 'attendance';
    case 'bonus':
      return 'bonuses';
    case 'deduct':
      return 'deductions';
    case 'commissions':
      return 'employee-commissions';
    case 'payroll':
      return 'payroll';
    case 'disbursals':
      return 'payment-auth-types';
    case 'reports':
      return 'employee-reports';
    default:
      return 'employee-data';
  }
}
