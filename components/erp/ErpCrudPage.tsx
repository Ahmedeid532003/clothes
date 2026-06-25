import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Crumb = {
  label: string;
  onClick?: () => void;
};

type Props = {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ErpCrudPage({ title, description, breadcrumbs = [], actions, stats, children, className }: Props) {
  return (
    <section className={cn('erp-crud-page', className)}>
      <header className="erp-crud-header">
        <div className="erp-crud-title-block">
          <h1>{title}</h1>
          {breadcrumbs.length > 0 ? (
            <nav className="erp-crud-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${index}`}>
                    {crumb.onClick && !isLast ? (
                      <button type="button" onClick={crumb.onClick}>
                        {crumb.label}
                      </button>
                    ) : (
                      <strong aria-current={isLast ? 'page' : undefined}>{crumb.label}</strong>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : null}
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="erp-crud-actions">{actions}</div> : null}
      </header>
      {stats ? <div className="erp-crud-stats">{stats}</div> : null}
      <div className="erp-crud-body">{children}</div>
    </section>
  );
}
