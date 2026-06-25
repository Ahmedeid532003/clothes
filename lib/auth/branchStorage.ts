const KEY = 'active_branch_id';

export function getStoredBranchId(): string | null {
  return localStorage.getItem(KEY);
}

export function setStoredBranchId(id: string | null) {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}
