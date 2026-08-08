import { useCallback, useEffect, useState } from 'react';
import { cashShiftsApi } from '@/lib/api/accounting';
import { customersApi, fetchCustomerMeta } from '@/lib/api/customers';
import {
  createPosExchange,
  createPosSale,
  fetchPosCustomerReview,
  fetchPosSales,
  fetchPosSellers,
  searchPosProducts,
} from '@/lib/api/pos';
import { customerReservationsApi, salesQuotationsApi } from '@/lib/api/sales';
import { receivablesApi } from '@/lib/api/receivables';
import { scanOrdersApi } from '@/lib/api/scanOrders';
import { readHeldCarts } from '@/components/pos/posCustomerDocs';
import {
  customerRowToStudio,
  heldCartToLoadDoc,
  posHitsToStudioProducts,
  quotationToLoadDoc,
  reservationToLoadDoc,
  saleDtoToStudioTransaction,
  scanOrderToLoadDoc,
  sellersToAgents,
  type StudioSalesAgent,
} from './adapters';
import type { CartItem, Customer, PosLoadDocument, Product, Transaction } from './types';

export function useBarcodeStudioData(activeBranchId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesAgents, setSalesAgents] = useState<StudioSalesAgent[]>([]);
  const [pastTransactions, setPastTransactions] = useState<Transaction[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PosLoadDocument[]>([]);
  const [priceQuotes, setPriceQuotes] = useState<PosLoadDocument[]>([]);
  const [preBookings, setPreBookings] = useState<PosLoadDocument[]>([]);
  const [expectedBalance, setExpectedBalance] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!activeBranchId) {
      setProducts([]);
      setCustomers([]);
      setPendingOrders([]);
      setPriceQuotes([]);
      setPreBookings([]);
      setDataReady(true);
      return;
    }

    setError(null);
    try {
      let stock = await searchPosProducts({ catalog: true, limit: 500 });
      if (stock.products.length === 0) {
        stock = await searchPosProducts({ inStock: true, limit: 500 });
      }

      const [customerRows, sellers, sales, gate, scanOrders, quotations, reservations] =
        await Promise.all([
          fetchPosCustomerReview(),
          fetchPosSellers().catch(() => []),
          fetchPosSales().catch(() => []),
          cashShiftsApi.posGate().catch(() => null),
          scanOrdersApi.list({ order_type: 'sale' }).catch(() => []),
          salesQuotationsApi.list().catch(() => []),
          customerReservationsApi.list().catch(() => []),
        ]);

      const productList = posHitsToStudioProducts(stock.products);
      const customerList = customerRows.map(customerRowToStudio);

      if (productList.length === 0 && stock.products.length === 0) {
        console.warn('[barcode-pos] لا توجد منتجات من API — تحقق من الفرع والمخزن والأصناف النشطة');
      }

      setProducts(productList);
      setCustomers(customerList);
      setSalesAgents(sellersToAgents(sellers));
      setPastTransactions(
        sales.slice(0, 50).map((s) => saleDtoToStudioTransaction(s, productList, customerList)),
      );

      const pendingScan = scanOrders.filter(
        (o) => !o.loaded_into && o.status !== 'draft' && (o.line_count || 0) > 0,
      );
      const held = readHeldCarts().filter((h) => (h.lines?.length || 0) > 0);
      setPendingOrders([
        ...pendingScan.map(scanOrderToLoadDoc),
        ...held.map(heldCartToLoadDoc),
      ]);

      setPriceQuotes(
        quotations
          .filter((q) => q.status !== 'converted' && !q.converted_sale)
          .map(quotationToLoadDoc),
      );

      setPreBookings(
        reservations
          .filter((r) => r.status !== 'converted' && !r.converted_sale)
          .map(reservationToLoadDoc),
      );

      const bal = gate?.open_shift?.expected_balance;
      setExpectedBalance(bal ? parseFloat(bal) || 0 : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setDataReady(true);
    }
  }, [activeBranchId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshCustomers = useCallback(async (search?: string) => {
    const rows = await fetchPosCustomerReview(search);
    setCustomers(rows.map(customerRowToStudio));
  }, []);

  const updateCustomerList = useCallback((updated: Customer[]) => {
    setCustomers(updated);
  }, []);

  const updateProductsStock = useCallback((updated: Product[]) => {
    setProducts(updated);
  }, []);

  const lookupByBarcode = useCallback(async (code: string): Promise<Product | null> => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const res = await searchPosProducts({ barcode: trimmed });
    const found = posHitsToStudioProducts(res.products);
    if (found.length === 0) {
      const byQ = await searchPosProducts({ q: trimmed });
      const alt = posHitsToStudioProducts(byQ.products);
      if (alt.length === 0) return null;
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...alt.filter((p) => !ids.has(p.id))];
      });
      return alt[0];
    }
    setProducts((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...found.filter((p) => !ids.has(p.id))];
    });
    return found[0];
  }, []);

  const loadPendingOrderDetails = useCallback(async (docId: string): Promise<PosLoadDocument | null> => {
    const held = readHeldCarts().find((h) => h.label.slice(0, 24) === docId || h.id === docId);
    if (held) return heldCartToLoadDoc(held);

    try {
      const orders = await scanOrdersApi.list({ order_type: 'sale' });
      const match = orders.find((o) => o.code === docId);
      if (!match) return null;
      const full = await scanOrdersApi.get(match.id);
      return scanOrderToLoadDoc(full);
    } catch {
      return null;
    }
  }, []);

  const loadQuoteDetails = useCallback(async (code: string): Promise<PosLoadDocument | null> => {
    try {
      const full = await salesQuotationsApi.lookup(code);
      return quotationToLoadDoc(full);
    } catch {
      return null;
    }
  }, []);

  const loadReservationDetails = useCallback(async (code: string): Promise<PosLoadDocument | null> => {
    try {
      const full = await customerReservationsApi.lookup(code);
      return reservationToLoadDoc(full);
    } catch {
      return null;
    }
  }, []);

  const completeSale = useCallback(
    async (cart: CartItem[], customerCode: string, notes: string, sellerId?: string) => {
      const customer = customers.find((c) => c.code === customerCode);
      const sale = await createPosSale({
        payment_method: 'cash',
        customer: customer?.id || undefined,
        notes: notes || undefined,
        lines: cart.map((item) => {
          const lineTotal = item.product.price * item.quantity;
          const discPct =
            lineTotal > 0 ? Math.min(100, (item.discount / lineTotal) * 100) : 0;
          return {
            variant: item.product.variantId || item.product.id,
            quantity: String(item.quantity),
            unit_price: String(item.product.price),
            discount_percent: discPct.toFixed(2),
            seller: sellerId,
          };
        }),
      });
      const tx = saleDtoToStudioTransaction(sale, products, customers);
      setPastTransactions((prev) => [tx, ...prev]);
      await reload();
      return tx;
    },
    [customers, products, reload],
  );

  const completeExchange = useCallback(
    async (
      returned: CartItem[],
      exchanged: CartItem[],
      customerCode: string,
      discount: number,
      sellerId?: string,
    ) => {
      const customer = customers.find((c) => c.code === customerCode);
      const mapLine = (item: CartItem) => ({
        variant: item.product.variantId || item.product.id,
        quantity: String(item.quantity),
        unit_price: String(item.product.price),
        discount_percent: '0',
        seller: sellerId,
      });

      const result = await createPosExchange({
        customer: customer?.id || undefined,
        discount_amount: String(discount || 0),
        return_lines: returned.map(mapLine),
        new_lines: exchanged.map(mapLine),
      });

      const tx: Transaction = {
        id: result.sale_code || `EX-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'exchange',
        customerName: customer?.name || '—',
        customerCode,
        items: exchanged,
        returnedItems: returned,
        subtotal: parseFloat(result.new_total) || 0,
        discount,
        total: parseFloat(result.difference) || 0,
        paymentMethod: 'cash',
      };
      setPastTransactions((prev) => [tx, ...prev]);
      await reload();
      return tx;
    },
    [customers, reload],
  );

  const saveCustomerProfile = useCallback(
    async (customerCode: string, notes: string, groupLabel: string, spouse: string, guarantorsStr: string) => {
      const row = customers.find((c) => c.code === customerCode);
      if (!row?.id) return;

      const detail = await customersApi.get(row.id);
      const meta = await fetchCustomerMeta().catch(() => null);
      const groupMatch = meta?.groups?.find((g) => g.name_ar === groupLabel);

      await customersApi.update(row.id, {
        notes,
        customer_group: groupMatch?.id ?? detail.customer_group,
        profile_data: {
          ...detail.profile_data,
          spouse_name: spouse,
          guarantor_summary: guarantorsStr,
        },
      });
      await refreshCustomers();
    },
    [customers, refreshCustomers],
  );

  const loadCustomerInstallments = useCallback(async (customerId: string) => {
    const ov = await receivablesApi.installmentCollection(customerId, false);
    return ov.lines
      .filter((ln) => parseFloat(ln.balance) > 0)
      .map((ln) => ({
        id: ln.id,
        dueDate: ln.due_date,
        amount: parseFloat(ln.balance) || 0,
        status: 'unpaid' as const,
      }));
  }, []);

  const refreshCustomerInstallments = useCallback(
    async (customerId: string) => {
      try {
        const installments = await loadCustomerInstallments(customerId);
        setCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? { ...c, installments } : c)),
        );
      } catch {
        /* ignore */
      }
    },
    [loadCustomerInstallments],
  );

  const createCustomer = useCallback(
    async (name: string, phone: string) => {
      const meta = await fetchCustomerMeta().catch(() => null);
      const typeId = meta?.types?.[0]?.id;
      const groupId = meta?.groups?.[0]?.id;
      if (!typeId || !groupId) throw new Error('تعذر تحميل بيانات العملاء من النظام');

      const { code } = await customersApi.nextCode();
      await customersApi.create({
        code,
        name_ar: name,
        customer_type: typeId,
        customer_group: groupId,
        phone,
      });
      await refreshCustomers();
      return code;
    },
    [refreshCustomers],
  );

  return {
    products,
    customers,
    salesAgents,
    pastTransactions,
    pendingOrders,
    priceQuotes,
    preBookings,
    expectedBalance,
    dataReady,
    error,
    productCount: products.length,
    customerCount: customers.length,
    reload,
    refreshCustomers,
    updateCustomerList,
    updateProductsStock,
    lookupByBarcode,
    loadPendingOrderDetails,
    loadQuoteDetails,
    loadReservationDetails,
    completeSale,
    completeExchange,
    saveCustomerProfile,
    loadCustomerInstallments,
    refreshCustomerInstallments,
    createCustomer,
  };
}
