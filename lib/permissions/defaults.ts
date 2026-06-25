import type { UserPermissions } from '@/lib/api/employees';

export function buildEmptyPermissions(
  pages: { key: string }[],
  features: Record<string, { key: string }[]>,
): UserPermissions {
  const perms: UserPermissions = { pages: {}, features: {}, actions: {} };
  for (const p of pages) {
    perms.pages[p.key] = false;
    perms.features[p.key] = {};
    perms.actions[p.key] = { view: false, update: false, delete: false };
    for (const f of features[p.key] ?? []) {
      perms.features[p.key][f.key] = false;
    }
  }
  return perms;
}

export function buildFullPermissions(
  pages: { key: string }[],
  features: Record<string, { key: string }[]>,
): UserPermissions {
  const perms = buildEmptyPermissions(pages, features);
  for (const p of pages) {
    perms.pages[p.key] = true;
    for (const f of features[p.key] ?? []) {
      perms.features[p.key][f.key] = true;
    }
    perms.actions[p.key] = { view: true, update: true, delete: true };
  }
  return perms;
}

export function mergeWithSchema(
  stored: UserPermissions | undefined,
  pages: { key: string }[],
  features: Record<string, { key: string }[]>,
): UserPermissions {
  const base = buildEmptyPermissions(pages, features);
  if (!stored) return base;
  for (const key of Object.keys(base.pages)) {
    if (stored.pages[key] !== undefined) base.pages[key] = !!stored.pages[key];
  }
  for (const pageKey of Object.keys(base.features)) {
    for (const fk of Object.keys(base.features[pageKey])) {
      if (stored.features[pageKey]?.[fk] !== undefined) {
        base.features[pageKey][fk] = !!stored.features[pageKey][fk];
      }
    }
  }
  for (const pageKey of Object.keys(base.actions)) {
    for (const action of ['view', 'update', 'delete'] as const) {
      if (stored.actions[pageKey]?.[action] !== undefined) {
        base.actions[pageKey][action] = !!stored.actions[pageKey][action];
      }
    }
  }
  return base;
}
