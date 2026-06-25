import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchPosSellers,
  lookupPosSeller,
  searchPosProducts,
  type PosSellerDto,
} from '@/lib/api/pos';
import { fetchEmployees } from '@/lib/api/employees';
import { scanOrdersApi } from '@/lib/api/scanOrders';
import { fetchInventorySettings, updateInventorySettings } from '@/lib/api/inventory';
import {
  addPendingLine,
  resolveSearchToLine,
  resolveSellerCode,
  type PendingPosLine,
} from './posResolveLine';
import type { usePosSession } from './usePosSession';

type Session = ReturnType<typeof usePosSession>;

async function searchProduct(text: string) {
  const trimmed = text.trim();
  const byBarcode = await searchPosProducts({ barcode: trimmed });
  if (byBarcode.products.length > 0 || byBarcode.composites.length > 0) {
    return byBarcode;
  }
  return searchPosProducts({ q: trimmed });
}

export function usePosSellerScan(session: Session) {
  const [employees, setEmployees] = useState<PosSellerDto[]>([]);
  const [requireSeller, setRequireSeller] = useState(true);
  const [commissionBasis, setCommissionBasis] = useState<'seller' | 'product'>('seller');
  const [allowMultipleSellers, setAllowMultipleSellers] = useState(true);
  const [defaultSellerId, setDefaultSellerId] = useState('');
  const [sellerPromptOpen, setSellerPromptOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const pendingLineRef = useRef<PendingPosLine | null>(null);

  const defaultSeller = useMemo(
    () => employees.find((e) => e.id === defaultSellerId) ?? null,
    [defaultSellerId, employees],
  );

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeesError(null);
    try {
      const rows = await fetchPosSellers();
      if (rows.length) {
        setEmployees(rows);
        return;
      }
    } catch (e) {
      setEmployeesError(e instanceof Error ? e.message : 'Error');
    }
    try {
      const hrRows = await fetchEmployees();
      const mapped = hrRows
        .filter((e) => e.is_active)
        .map((e) => ({
          id: e.id,
          employee_code: e.employee_code || e.username,
          full_name: e.full_name || e.username,
          username: e.username,
        }));
      if (mapped.length) {
        setEmployees(mapped);
        setEmployeesError(null);
        return;
      }
    } catch {
      /* HR list may be restricted */
    }
    setEmployees([]);
  }, []);

  useEffect(() => {
    void loadEmployees().finally(() => setEmployeesLoading(false));
    fetchInventorySettings()
      .then((s) => {
        setRequireSeller(s.pos_require_seller_on_scan !== false);
        setCommissionBasis((s.pos_commission_basis as 'seller' | 'product') || 'seller');
        setAllowMultipleSellers(s.pos_allow_multiple_sellers !== false);
      })
      .catch(() => {});
  }, [loadEmployees]);

  const closeSellerPrompt = useCallback(() => {
    pendingLineRef.current = null;
    setSellerPromptOpen(false);
    setPendingLabel('');
    setPromptError(null);
  }, []);

  const submitProduct = useCallback(
    async (text: string, bundleLabel: string, notFoundMsg: string) => {
      const q = text.trim();
      if (!q) {
        setLocalError('أدخل باركود أو اسم الصنف');
        return false;
      }
      setBusy(true);
      setLocalError(null);
      session.setError(null);
      try {
        const results = await searchProduct(q);
        const line = resolveSearchToLine(results, bundleLabel);
        if (!line) {
          setLocalError(notFoundMsg);
          session.setError(notFoundMsg);
          return false;
        }

        if (requireSeller) {
          if (allowMultipleSellers || !defaultSeller) {
            pendingLineRef.current = line;
            setPendingLabel(line.displayLabel);
            setPromptError(null);
            setSellerPromptOpen(true);
            return true;
          }
          addPendingLine(session, line, defaultSeller);
          return true;
        }

        addPendingLine(session, line);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error';
        setLocalError(msg);
        session.setError(msg);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [requireSeller, allowMultipleSellers, defaultSeller, session],
  );

  const resolveDefaultSellerByCode = useCallback(
    async (code: string, sellerNotFoundMsg: string) => {
      const seller = await resolveSellerCode(
        code,
        employees,
        lookupPosSeller,
        scanOrdersApi.lookupEmployee,
      );
      if (!seller) throw new Error(sellerNotFoundMsg);
      setDefaultSellerId(seller.id);
      return seller;
    },
    [employees],
  );

  const clearDefaultSeller = useCallback(() => setDefaultSellerId(''), []);

  const confirmSeller = useCallback(
    async (code: string, sellerNotFoundMsg: string) => {
      const line = pendingLineRef.current;
      if (!line) {
        closeSellerPrompt();
        return false;
      }

      setBusy(true);
      setPromptError(null);
      try {
        const seller = await resolveSellerCode(
          code,
          employees,
          lookupPosSeller,
          scanOrdersApi.lookupEmployee,
        );
        if (!seller) {
          setPromptError(sellerNotFoundMsg);
          return false;
        }

        addPendingLine(session, line, seller);
        closeSellerPrompt();
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : sellerNotFoundMsg;
        setPromptError(msg);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [closeSellerPrompt, employees, session],
  );

  const saveSettings = useCallback(async () => {
    await updateInventorySettings({
      pos_require_seller_on_scan: requireSeller,
      pos_commission_basis: commissionBasis,
      pos_allow_multiple_sellers: allowMultipleSellers,
    });
    setSettingsOpen(false);
  }, [allowMultipleSellers, commissionBasis, requireSeller]);

  return {
    employees,
    employeesLoading,
    employeesError,
    loadEmployees,
    requireSeller,
    setRequireSeller,
    commissionBasis,
    setCommissionBasis,
    allowMultipleSellers,
    setAllowMultipleSellers,
    defaultSellerId,
    setDefaultSellerId,
    defaultSeller,
    resolveDefaultSellerByCode,
    clearDefaultSeller,
    sellerPromptOpen,
    pendingLabel,
    settingsOpen,
    setSettingsOpen,
    busy,
    promptError,
    localError,
    submitProduct,
    confirmSeller,
    closeSellerPrompt,
    saveSettings,
  };
}
