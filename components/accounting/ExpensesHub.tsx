import type { ReactNode } from 'react';

/** غلاف بسيط — المحتوى فقط بدون هيدر مسار المصروفات أو تبويبات الخطوات. */
export function ExpensesHub({
  children,
}: {
  activeTab?: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function emitExpensesRefresh() {
  window.dispatchEvent(new Event('expenses:refresh'));
}
