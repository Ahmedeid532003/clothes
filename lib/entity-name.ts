/** Unified display name for entities that may use `name`, `name_ar`, or `name_en`. */
export type EntityWithName = {
  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  code?: string | null;
};

export function entityName(entity: EntityWithName | null | undefined, fallback = '—'): string {
  if (!entity) return fallback;
  const value = (entity.name || entity.name_ar || entity.name_en || entity.code || '').trim();
  return value || fallback;
}
