import React from 'react';

export function HrModuleLayout({
  activeTab,
  children,
}: {
  activeTab: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hr-module-shell space-y-6" data-hr-active-tab={activeTab}>
      <div className="hr-module-ambient" aria-hidden="true" />
      {children}
    </div>
  );
}
