import type { ReactNode } from 'react';
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner';
import { useAuth } from '@/lib/auth/AuthContext';
import type { TenantSubscription } from '@/lib/api/auth';

type Props = {
  header: ReactNode;
  subscription: TenantSubscription | null | undefined;
  children: ReactNode;
  pageKey?: string;
  moduleContext?: {
    key: string;
    title: string;
    description: string;
    activePageLabel: string;
    relatedPages: { tab: string; label: string }[];
  };
};

/**
 * هيكل موحّد لكل شاشات المنشأة: هيدر ثابت + تنبيه اشتراك ثابت + محتوى.
 */
export function TenantAppLayout({ header, subscription, children, pageKey, moduleContext }: Props) {
  const { tenant, branches, activeBranchId } = useAuth();
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const organizationName = tenant?.name ?? 'Ma7aly ERP';
  const branchName = activeBranch
    ? activeBranch.name_ar || activeBranch.name_en || activeBranch.code
    : 'All Branches';

  return (
    <div className="app-tenant-shell flex min-h-0 min-w-0 flex-1 flex-col" data-module={moduleContext?.key ?? 'dashboard'}>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className="app-sticky-shell sticky top-0 z-[70] shrink-0">
        {header}
        <SubscriptionBanner subscription={subscription} sticky />
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        aria-label={moduleContext?.activePageLabel}
        className="app-content-scroll min-h-0 flex-1 overflow-visible"
      >
        <div className="app-content-container">
          <section
            key={pageKey ?? moduleContext?.activePageLabel}
            className="app-content-card app-page-transition"
            data-page={pageKey}
            data-module={moduleContext?.key}
            aria-label={moduleContext?.activePageLabel}
          >
            {children}
          </section>
        </div>
      </main>
      <footer className="dashboard-shell-footer">
        <div>
          <span>{organizationName}</span>
          <strong>{branchName}</strong>
        </div>
        <p>Ma7aly ERP · Enterprise workspace</p>
      </footer>
    </div>
  );
}
