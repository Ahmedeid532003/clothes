import type { AuthTenant } from '@/lib/api/auth';

/** Empty modules list = all modules enabled (legacy tenants). */
export function tenantHasModule(tenant: AuthTenant | null | undefined, code: string): boolean {
  if (!tenant?.modules?.length) return true;
  return tenant.modules.includes(code);
}

/** Customers module — explicit crm flag, or inventory (API lives under inventory). */
export function tenantHasCrm(tenant: AuthTenant | null | undefined): boolean {
  return tenantHasModule(tenant, 'crm') || tenantHasModule(tenant, 'inventory');
}
