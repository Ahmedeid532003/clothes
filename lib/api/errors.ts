export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export function isTenantFrozenError(err: unknown): boolean {
  return err instanceof ApiRequestError && err.code === 'tenant_frozen';
}

export function isExpenseTypesNotMigratedError(err: unknown): boolean {
  return err instanceof ApiRequestError && err.code === 'expense_types_not_migrated';
}

export const TENANT_FROZEN_EVENT = 'tenant:frozen';

export function emitTenantFrozen(message: string) {
  window.dispatchEvent(
    new CustomEvent(TENANT_FROZEN_EVENT, { detail: { message } }),
  );
}
