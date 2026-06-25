import { useCallback, useEffect, useState } from 'react';
import {
  createPosSale,
  fetchPosContext,
  fetchPosSales,
  searchPosProducts,
  type PosCartLine,
  type PosCompositeHit,
  type PosContext,
  type PosProductHit,
  type SaleDto,
} from '@/lib/api/pos';

export function usePosSession(activeBranchId: string | null) {
  const [ctx, setCtx] = useState<PosContext | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [quickPicks, setQuickPicks] = useState<PosProductHit[]>([]);
  const [sales, setSales] = useState<SaleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeBranchId) {
      setCtx(null);
      setQuickPicks([]);
      return;
    }
    setError(null);
    try {
      const [c, s, stock] = await Promise.all([
        fetchPosContext(),
        fetchPosSales(),
        searchPosProducts({ inStock: true }),
      ]);
      setCtx(c);
      setSales(s);
      setQuickPicks(stock.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [activeBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const addVariant = (
    product: PosProductHit,
    v: PosProductHit['variants'][0],
    sellerId?: string,
    sellerName?: string,
    qty = '1',
  ) => {
    const sellerKey = sellerId ? `:s${sellerId}` : '';
    const key = `v:${v.variant_id}${sellerKey}`;
    const sellerSuffix = sellerName ? ` [${sellerName}]` : '';
    const label = `${product.name_ar} — ${v.size_name}/${v.color_name}${sellerSuffix}`;
    const offerDisc = parseFloat(v.offer_discount_per_unit || '0') || 0;
    const salePrice = parseFloat(v.sale_price || v.unit_price) || 0;
    const discountPct =
      offerDisc > 0 && salePrice > 0
        ? String(((offerDisc / salePrice) * 100).toFixed(2))
        : v.discount_percent || '0';
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        const add = parseFloat(qty) || 1;
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: String((parseFloat(c.quantity) || 0) + add) } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          kind: 'variant' as const,
          variant: v.variant_id,
          label,
          product_code: product.code,
          product_name: product.name_ar,
          size_name: v.size_name,
          color_name: v.color_name,
          quantity: qty,
          unit_price: v.unit_price,
          discount_percent: discountPct,
          discount_amount: '0',
          offer_discount_per_unit: offerDisc > 0 ? String(offerDisc) : undefined,
          available: v.branch_quantity_available ?? v.quantity_available,
          seller_id: sellerId,
          seller_name: sellerName,
        },
      ];
    });
    setSuccess(null);
  };

  const addComposite = (
    bundle: PosCompositeHit,
    bundleLabel: string,
    sellerId?: string,
    sellerName?: string,
    qty = '1',
  ) => {
    const sellerKey = sellerId ? `:s${sellerId}` : '';
    const key = `c:${bundle.id}${sellerKey}`;
    const label = sellerName ? `${bundleLabel} [${sellerName}]` : bundleLabel;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        const add = parseFloat(qty) || 1;
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: String((parseFloat(c.quantity) || 0) + add) } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          kind: 'composite' as const,
          composite: bundle.id,
          label,
          product_code: bundle.code,
          product_name: bundle.name_ar,
          size_name: '',
          color_name: '',
          quantity: qty,
          unit_price: bundle.unit_price,
          discount_percent: '0',
          discount_amount: '0',
          available: bundle.max_sets_available,
          seller_id: sellerId,
          seller_name: sellerName,
        },
      ];
    });
    setSuccess(null);
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));

  const updateLine = (key: string, patch: Partial<PosCartLine>) =>
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const bumpQty = (key: string, delta: number) =>
    setCart((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const next = Math.max(1, (parseFloat(c.quantity) || 1) + delta);
        return { ...c, quantity: String(next) };
      }),
    );

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, line) => {
    const q = parseFloat(line.quantity) || 0;
    const p = parseFloat(line.unit_price) || 0;
    const d = parseFloat(line.discount_percent) || 0;
    const da = parseFloat(line.discount_amount || '0') || 0;
    return sum + Math.max(q * p * (1 - d / 100) - da, 0);
  }, 0);

  const offerDiscountsTotal = cart.reduce((sum, line) => {
    const q = parseFloat(line.quantity) || 0;
    const od = parseFloat(line.offer_discount_per_unit || '0') || 0;
    return sum + q * od;
  }, 0);

  const checkout = async (opts?: {
    paymentMethod?: string;
    customerId?: string;
    discountAmount?: string;
    deliveryFees?: string;
    isDelivery?: boolean;
    deliveryAgentId?: string;
    notes?: string;
    payments?: Array<{ payment_method: string; amount: string; reference?: string }>;
    installmentPlanId?: string;
    downPaymentAmount?: string;
    numInstallments?: number;
  }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const noteParts = [opts?.notes || ''];
      if (opts?.deliveryFees && parseFloat(opts.deliveryFees) > 0) {
        noteParts.push(`delivery:${opts.deliveryFees}`);
      }
      if (opts?.installmentPlanId) {
        noteParts.push(`plan:${opts.installmentPlanId}`);
      }
      const normalizedPayments = (opts?.payments || []).map((p) => ({
        payment_method: p.payment_method,
        amount: (parseFloat(p.amount) || 0).toFixed(2),
        reference: p.reference || '',
      }));
      const sale = await createPosSale({
        payment_method: opts?.paymentMethod || 'cash',
        customer: opts?.customerId || undefined,
        discount_amount: opts?.discountAmount || '0',
        is_delivery: Boolean(opts?.isDelivery),
        delivery_fee: opts?.deliveryFees || '0',
        delivery_agent: opts?.deliveryAgentId || undefined,
        notes: noteParts.filter(Boolean).join(' | '),
        payments: normalizedPayments.length ? normalizedPayments : undefined,
        installment_plan: opts?.installmentPlanId || undefined,
        down_payment_amount: opts?.downPaymentAmount || undefined,
        num_installments: opts?.numInstallments || undefined,
        lines: cart.map((l) => {
          if (l.kind === 'composite' && l.composite) {
            return {
              composite: l.composite,
              quantity: l.quantity,
              unit_price: l.unit_price,
              discount_percent: l.discount_percent,
              seller: l.seller_id,
            };
          }
          return {
            variant: l.variant,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            seller: l.seller_id,
          };
        }),
      });
      setSuccess(sale.code);
      setCart([]);
      await load();
      return sale;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runBarcode = async (barcode: string, bundleLabel: string) => {
    if (!barcode.trim()) return false;
    setLoading(true);
    setError(null);
    try {
      const results = await searchPosProducts({ barcode: barcode.trim() });
      if (results.composites.length === 1 && results.products.length === 0) {
        addComposite(results.composites[0], `${bundleLabel}: ${results.composites[0].name_ar}`);
        return true;
      }
      if (results.products.length === 1 && results.products[0].variants.length === 1 && results.composites.length === 0) {
        addVariant(results.products[0], results.products[0].variants[0]);
        return true;
      }
      if (results.products.length + results.composites.length > 0) {
        setError('MULTI_HIT');
        return false;
      }
      setError('NOT_FOUND');
      return false;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    ctx,
    cart,
    setCart,
    quickPicks,
    sales,
    error,
    setError,
    success,
    setSuccess,
    loading,
    setLoading,
    load,
    addVariant,
    addComposite,
    removeLine,
    updateLine,
    bumpQty,
    clearCart,
    cartTotal,
    offerDiscountsTotal,
    checkout,
    runBarcode,
  };
}
