type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** قوائم ولوحات — نخزّنها في sessionStorage للعرض الفوري */
const PERSIST_FRAGMENTS = [
  '/organization/seasons/',
  '/organization/warehouses/',
  '/organization/branches/',
  '/inventory/sections/',
  '/inventory/brands/',
  '/inventory/classifications/',
  '/inventory/sizes/',
  '/inventory/colors/',
  '/inventory/supplier-types/',
  '/inventory/supplier-groups/',
  '/inventory/products/',
  '/inventory/composite-products/',
  '/inventory/stock-balances/',
  '/inventory/mgmt-dashboard/',
  '/dashboard/control-panel/',
];

const SESSION_STORE_KEY = 'mahaly_api_session_cache_v1';
const MAX_PERSIST_BYTES = 4_500_000;

export function cacheScope(): string {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('tenant_slug') ?? 'demo';
}

function sessionBlobKey() {
  return `${SESSION_STORE_KEY}:${cacheScope()}`;
}

function shouldPersist(key: string) {
  return PERSIST_FRAGMENTS.some((fragment) => key.includes(fragment));
}

function readSessionBlob(): Record<string, CacheEntry<unknown>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(sessionBlobKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CacheEntry<unknown>>;
    const now = Date.now();
    const valid: Record<string, CacheEntry<unknown>> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now) valid[key] = entry;
    }
    return valid;
  } catch {
    return {};
  }
}

function writeSessionBlob() {
  if (typeof window === 'undefined') return;
  try {
    const payload: Record<string, CacheEntry<unknown>> = {};
    for (const [key, entry] of store) {
      if (!shouldPersist(key)) continue;
      if (entry.expiresAt <= Date.now()) continue;
      payload[key] = entry;
    }
    const json = JSON.stringify(payload);
    if (json.length > MAX_PERSIST_BYTES) return;
    sessionStorage.setItem(sessionBlobKey(), json);
  } catch {
    /* quota */
  }
}

function hydrateFromSession() {
  const blob = readSessionBlob();
  for (const [key, entry] of Object.entries(blob)) {
    if (!store.has(key)) store.set(key, entry);
  }
}

if (typeof window !== 'undefined') {
  hydrateFromSession();
}

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    inflight.clear();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(sessionBlobKey());
    }
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.includes(prefix)) {
      store.delete(key);
      inflight.delete(key);
    }
  }
  writeSessionBlob();
}

function mergeListById<T extends { id: string }>(fetched: T[], current: T[]): T[] {
  const byId = new Map(fetched.map((row) => [row.id, row]));
  for (const row of current) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** قراءة فورية من الكاش (ذاكرة + session) — بدون انتظار شبكة */
export function peekCached<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) return hit.data as T;
  return hit.data as T;
}

function storeHit<T>(key: string, data: T, ttlMs: number) {
  const existing = store.get(key);
  const merged =
    Array.isArray(existing?.data) && Array.isArray(data)
      ? mergeListById(data as Array<{ id: string }>, existing.data as Array<{ id: string }>)
      : data;
  store.set(key, { data: merged, expiresAt: Date.now() + ttlMs });
  if (shouldPersist(key)) writeSessionBlob();
  return merged as T;
}

function revalidate<T>(key: string, fetcher: () => Promise<T>, ttlMs: number) {
  if (inflight.has(key)) return;
  const promise = fetcher()
    .then((data) => {
      const merged = storeHit(key, data, ttlMs);
      inflight.delete(key);
      return merged;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, promise);
}

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 120_000,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.data as T;
  }

  if (hit) {
    void revalidate(key, fetcher, ttlMs);
    return hit.data as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      const merged = storeHit(key, data, ttlMs);
      inflight.delete(key);
      return merged;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise as Promise<T>;
}

export function cacheKey(path: string) {
  return `GET:${path}:${cacheScope()}`;
}

export function patchCachedList<T>(
  pathFragment: string,
  updater: (list: T[]) => T[],
) {
  const scope = cacheScope();
  for (const [key, entry] of store) {
    if (!key.includes(pathFragment) || !key.includes(scope)) continue;
    if (!Array.isArray(entry.data)) continue;
    store.set(key, {
      data: updater(entry.data as T[]),
      expiresAt: entry.expiresAt,
    });
  }
  writeSessionBlob();
}

export function removeCachedListItem<T extends { id: string }>(
  pathFragment: string,
  id: string,
) {
  patchCachedList<T>(pathFragment, (list) => list.filter((row) => row.id !== id));
}

export function appendCachedListItem<T>(pathFragment: string, row: T) {
  const scope = cacheScope();
  let patched = false;
  for (const [key, entry] of store) {
    if (!key.includes(pathFragment) || !key.includes(scope)) continue;
    if (!Array.isArray(entry.data)) continue;
    store.set(key, {
      data: [...(entry.data as T[]), row],
      expiresAt: entry.expiresAt,
    });
    patched = true;
  }
  if (!patched) {
    store.set(cacheKey(pathFragment), {
      data: [row],
      expiresAt: Date.now() + 300_000,
    });
  }
  writeSessionBlob();
}

export function replaceCachedListItem<T extends { id: string }>(
  pathFragment: string,
  row: T,
) {
  patchCachedList<T>(pathFragment, (list) =>
    list.map((item) => (item.id === row.id ? row : item)),
  );
}
