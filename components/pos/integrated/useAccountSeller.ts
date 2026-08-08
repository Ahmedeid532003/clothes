import { useMemo } from 'react';
import type { AuthUser } from '@/lib/api/auth';

/** البائع = المستخدم المسجّل — لا حاجة لاختيار بائع منفصل */
export function useAccountSeller(user: AuthUser | null) {
  return useMemo(
    () => ({
      id: user?.id || undefined,
      full_name: user?.full_name || user?.username || '',
      username: user?.username || '',
    }),
    [user],
  );
}

export function sellerLineKey(variantId: string, sellerId?: string) {
  return sellerId ? `v:${variantId}:s${sellerId}` : `v:${variantId}`;
}
