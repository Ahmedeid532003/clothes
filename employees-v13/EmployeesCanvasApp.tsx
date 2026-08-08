/**
 * Thin host for original EmployeesTab only.
 * Does not modify EmployeesTab or any copied V13 components/CSS.
 */
import React from 'react';
import { EmployeesTab } from './components/EmployeesTab';

export const EMPLOYEES_SUBTABS = [
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

export type EmployeesSubTabId = (typeof EMPLOYEES_SUBTABS)[number];

type Props = {
  lang: 'en' | 'ar';
  initialSubTab: string;
  onSubTabChange: (tab: string) => void;
};

export default function EmployeesCanvasApp({
  lang,
  initialSubTab,
  onSubTabChange,
}: Props) {
  const tab = (EMPLOYEES_SUBTABS as readonly string[]).includes(initialSubTab)
    ? initialSubTab
    : 'directory';

  return (
    <div
      data-employees-host
      className="h-full w-full max-w-full bg-slate-50 text-[#1e293b] font-sans antialiased"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div data-employees-host-inner>
        <EmployeesTab
          lang={lang}
          activeSubTab={tab}
          setActiveSubTab={onSubTabChange}
        />
      </div>
    </div>
  );
}
