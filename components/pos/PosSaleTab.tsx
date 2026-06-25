import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Pencil, Plus, Receipt, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosCustomerReview, fetchPosCustomerOpenDocs, type PosCartLine, type PosCustomerReviewRow } from '@/lib/api/pos';
import type { SalesQuotationDto } from '@/lib/api/sales';
import { customerReservationsApi, salesQuotationsApi } from '@/lib/api/sales';
import { scanOrdersApi } from '@/lib/api/scanOrders';
import type { InstallmentReceipt } from '@/lib/api/receivables';
import { canUseFeature } from '@/lib/permissions/access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadFromOrderButton } from '@/components/orders/LoadFromOrderButton';
import { LoadFromDocButton } from '@/components/orders/LoadFromDocButton';
import { PosLineEditDialog } from './PosLineEditDialog';
import { PosPaymentCanvas } from './PosPaymentCanvas';
import { PosInstallmentReceiptDetail } from './PosInstallmentReceiptDetail';
import { fmtPosAmount, applySellerToCartLine, lineDiscountAmount, lineGross, lineSubtotal, newLocalId, parsePosAmount, cartShortageLines, cartHasStockShortage, lineStockDeficit } from './pos-utils';
import { PosDeliveryPanel } from './PosDeliveryPanel';
import { PosDeliveryHub } from './PosDeliveryHub';
import { PosInvoiceActionCards } from './PosInvoiceActionCards';
import { PosStockShortageBanner } from './PosStockShortageBanner';
import { PosQuotationPreviewPage } from './PosQuotationPreviewPage';
import { PosStockTransferCanvas } from './PosStockTransferCanvas';
import { fetchStockBalances } from '@/lib/api/inventory';
import { loadAllCustomerDocumentsToCart, loadDraftDocToCart, loadScanOrderToCart } from './posCartLoaders';
import { PosSellerPrompt } from './PosSellerPrompt';
import {
  heldCartsForCustomer,
  writeHeldCarts,
  readHeldCarts,
} from './posCustomerDocs';
import { usePosSellerScan } from './usePosSellerScan';
import { PosShiftGate } from './PosShiftGate';
import type { usePosSession } from './usePosSession';

type Session = ReturnType<typeof usePosSession>;

type Props = {
  session: Session;
  onMessage?: (msg: string) => void;
};

export function PosSaleTab({ session, onMessage }: Props) {
  const { t } = useLanguage();
  const { user, activeBranchId, tenant, branches } = useAuth();
  const canEditLine = canUseFeature(user, 'pos-barcode', 'edit_line_price');

  const seller = usePosSellerScan(session);

  const [searchQ, setSearchQ] = useState('');
  const [customers, setCustomers] = useState<PosCustomerReviewRow[]>([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [phone, setPhone] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [deliveryFees, setDeliveryFees] = useState('0');
  const [editLine, setEditLine] = useState<PosCartLine | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payGateError, setPayGateError] = useState<string | null>(null);
  const [payCheckoutError, setPayCheckoutError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [loadedDocId, setLoadedDocId] = useState<string | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [customerDocsLoading, setCustomerDocsLoading] = useState(false);
  const customerDocsLoadSeq = useRef(0);
  const [receiptDetail, setReceiptDetail] = useState<InstallmentReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sellerCodeQ, setSellerCodeQ] = useState('');
  const [sellerCodeError, setSellerCodeError] = useState<string | null>(null);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [deliveryAgentId, setDeliveryAgentId] = useState('');
  const [deliveryHubOpen, setDeliveryHubOpen] = useState(false);
  const deliveryFeesRef = useRef<HTMLInputElement>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [quotationPrint, setQuotationPrint] = useState<SalesQuotationDto | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isCashCustomer = !customerId;

  const loadCustomers = useCallback(async (q?: string) => {
    setCustomersLoading(true);
    try {
      const rows = await fetchPosCustomerReview(q);
      setCustomers(rows);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(customerFilter), 280);
    return () => clearTimeout(timer);
  }, [customerFilter, loadCustomers]);

  useEffect(() => {
    if (!customerId) {
      setCustomerNotes('');
      setPhone('');
      return;
    }
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    const notes = String(c.notes || c.profile_data?.notes || '').trim();
    setCustomerNotes(notes);
    if (!phone) setPhone(c.phone || c.whatsapp || '');
  }, [customerId, customers, phone]);

  const selectedCustomer = useMemo(
    () => customers.find((x) => x.id === customerId),
    [customers, customerId],
  );

  const cartSummary = useMemo(() => {
    let grossTotal = 0;
    let lineDiscountTotal = 0;
    for (const line of session.cart) {
      grossTotal += lineGross(line.quantity, line.unit_price);
      lineDiscountTotal += lineDiscountAmount(
        line.quantity,
        line.unit_price,
        line.discount_percent,
        line.discount_amount,
      );
    }
    const invDisc = parseFloat(invoiceDiscount) || 0;
    const delivery = parseFloat(deliveryFees) || 0;
    const totalDiscount = lineDiscountTotal + invDisc;
    const netTotal = Math.max(grossTotal - totalDiscount + delivery, 0);
    return { grossTotal, lineDiscountTotal, totalDiscount, invDisc, delivery, netTotal };
  }, [session.cart, invoiceDiscount, deliveryFees]);

  const qtyTotal = useMemo(
    () => session.cart.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0),
    [session.cart],
  );

  useEffect(() => {
    if (!seller.sellerPromptOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [seller.sellerPromptOpen]);

  const applyDefaultSellerToCart = useCallback(() => {
    const s = seller.defaultSeller;
    if (!s) return;
    session.setCart((prev) =>
      prev.map((line) =>
        seller.allowMultipleSellers
          ? line.seller_id
            ? line
            : applySellerToCartLine(line, s)
          : applySellerToCartLine(line, s),
      ),
    );
  }, [seller.defaultSeller, seller.allowMultipleSellers, session]);

  useEffect(() => {
    if (!seller.defaultSeller) return;
    applyDefaultSellerToCart();
  }, [seller.defaultSellerId, applyDefaultSellerToCart, seller.defaultSeller]);

  const lookupInvoiceSeller = async () => {
    const code = sellerCodeQ.trim();
    if (!code) return;
    setSellerCodeError(null);
    try {
      await seller.resolveDefaultSellerByCode(code, t('pos.exchangeSellerNotFound'));
      setSellerCodeQ('');
      onMessage?.(t('pos.itemAdded'));
    } catch (e) {
      setSellerCodeError(e instanceof Error ? e.message : t('pos.exchangeSellerNotFound'));
    }
  };

  useEffect(() => {
    setPayGateError(null);
    setPayCheckoutError(null);
  }, [session.cart]);

  const validateCartBeforePay = useCallback((): string | null => {
    if (session.cart.length === 0) return t('pos.cartEmpty');
    if (seller.requireSeller) {
      const missing = session.cart
        .map((line, idx) => (!line.seller_id ? idx + 1 : null))
        .filter((n): n is number => n !== null);
      if (missing.length > 0) {
        return t('pos.sellerRequiredForPay', { lines: missing.join('، ') });
      }
      if (!seller.allowMultipleSellers) {
        const sellerIds = new Set(session.cart.map((l) => l.seller_id).filter(Boolean));
        if (sellerIds.size > 1) {
          return t('pos.singleSellerOnly');
        }
      }
    }
    return null;
  }, [seller.requireSeller, seller.allowMultipleSellers, session.cart, t]);

  const shortageLines = useMemo(() => cartShortageLines(session.cart), [session.cart]);
  const hasStockShortage = shortageLines.length > 0;

  const warnShortageLine = useCallback(
    (line: PosCartLine | undefined) => {
      if (!line || lineStockDeficit(line) <= 0) return;
      onMessage?.(
        t('pos.stockInsufficientWarning', {
          label: line.product_name || line.label,
          deficit: String(lineStockDeficit(line)),
        }),
      );
    },
    [onMessage, t],
  );

  const warnShortageFromCart = useCallback(
    (cart: PosCartLine[]) => {
      const last = cart[cart.length - 1];
      warnShortageLine(last);
    },
    [warnShortageLine],
  );

  const refreshCartStock = useCallback(async () => {
    const warehouseId = session.ctx?.warehouse.id;
    if (!warehouseId) return;
    try {
      const balances = await fetchStockBalances(warehouseId);
      const byVariant = Object.fromEntries(balances.map((b) => [b.variant, b.quantity]));
      session.setCart((prev) =>
        prev.map((line) => {
          if (!line.variant) return line;
          const qty = byVariant[line.variant];
          return qty !== undefined ? { ...line, available: qty } : line;
        }),
      );
    } catch {
      /* non-blocking */
    }
  }, [session]);

  const openPayment = useCallback(() => {
    session.setError(null);
    setPayGateError(null);
    setPayCheckoutError(null);
    const err = validateCartBeforePay();
    if (err) {
      setPayGateError(err);
      session.setError(err);
      return;
    }
    setPayOpen(true);
  }, [session, validateCartBeforePay]);

  const runSearch = async () => {
    if (seller.busy || seller.sellerPromptOpen) return;
    const q = searchQ.trim();
    const ok = await seller.submitProduct(q, t('pos.bundleOffer'), t('pos.notFound'));
    if (ok) {
      setSearchQ('');
      session.setCart((cart) => {
        warnShortageFromCart(cart);
        return cart;
      });
    }
  };

  const handleSellerConfirm = async (code: string) => {
    const ok = await seller.confirmSeller(code, t('pos.exchangeSellerNotFound'));
    if (ok) {
      setSearchQ('');
      session.setCart((cart) => {
        warnShortageFromCart(cart);
        return cart;
      });
      onMessage?.(t('pos.itemAdded'));
      searchRef.current?.focus();
    }
  };

  const handleLoadOrder = (order: Awaited<ReturnType<typeof scanOrdersApi.lookup>>) => {
    if (order.order_type !== 'sale') {
      session.setError(t('scanOrders.wrongOrderType'));
      return;
    }
    loadScanOrderToCart(session, order, seller.employees, t('pos.bundleOffer'));
    setLoadedOrderId(order.id);
    onMessage?.(`${t('scanOrders.loaded')} ${order.code} — ${order.employee_name}`);
  };

  const handleLoadQuotation = (doc: Awaited<ReturnType<typeof salesQuotationsApi.lookup>>) => {
    if (doc.status === 'converted') {
      session.setError(t('pos.docAlreadyConverted'));
      return;
    }
    session.clearCart();
    loadDraftDocToCart(session, doc, seller.employees);
    setLoadedDocId(doc.id);
    if (doc.customer) setCustomerId(doc.customer);
    if (doc.discount_amount) setInvoiceDiscount(doc.discount_amount);
    onMessage?.(`${t('pos.loadedQuotation')} ${doc.code}`);
  };

  const handleLoadReservation = (doc: Awaited<ReturnType<typeof customerReservationsApi.lookup>>) => {
    if (doc.status === 'converted') {
      session.setError(t('pos.docAlreadyConverted'));
      return;
    }
    session.clearCart();
    loadDraftDocToCart(session, doc, seller.employees);
    setLoadedDocId(doc.id);
    setCustomerId(doc.customer);
    if (doc.discount_amount) setInvoiceDiscount(doc.discount_amount);
    onMessage?.(`${t('pos.loadedReservation')} ${doc.code}`);
  };

  const loadCustomerDocuments = useCallback(
    async (id: string, options?: { manual?: boolean }) => {
      const seq = ++customerDocsLoadSeq.current;
      setCustomerDocsLoading(true);
      try {
        const data = await fetchPosCustomerOpenDocs(id);
        if (seq !== customerDocsLoadSeq.current) return;
        const result = loadAllCustomerDocumentsToCart(
          session,
          data,
          heldCartsForCustomer(id),
          seller.employees,
        );
        if (result.docCount === 0) {
          if (options?.manual) {
            onMessage?.(t('pos.customerDocsNothingToMerge'));
          }
          return;
        }
        setInvoiceDiscount(result.invoiceDiscount);
        setDeliveryFees(result.deliveryFees);
        setLoadedDocId(null);
        setLoadedOrderId(null);
        onMessage?.(
          t('pos.customerDocsMerged', {
            count: result.docCount,
            lines: result.lineCount,
          }),
        );
      } catch (e) {
        if (seq !== customerDocsLoadSeq.current) return;
        const msg = e instanceof Error ? e.message : 'Error';
        session.setError(msg);
        if (options?.manual) {
          onMessage?.(t('pos.customerDocsNothingToMerge'));
        }
      } finally {
        if (seq === customerDocsLoadSeq.current) {
          setCustomerDocsLoading(false);
        }
      }
    },
    [onMessage, seller.employees, session, t],
  );

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    setPhone('');
    setLoadedDocId(null);
    setLoadedOrderId(null);
    if (!id) return;
    void loadCustomerDocuments(id);
  };

  const buildReservationNotes = () => {
    const parts: string[] = [t('pos.reservationFromPos')];
    if (customerNotes.trim()) parts.push(`${t('pos.customerNotesLabel')}: ${customerNotes.trim()}`);
    if (!customerId) parts.push(t('pos.walkInCustomer'));
    if (phone.trim()) parts.push(`tel:${phone.trim()}`);
    return parts.join(' | ');
  };

  const cartToLines = () =>
    session.cart.map((line) => ({
      variant: line.variant,
      composite: line.composite,
      quantity: line.quantity,
      unit_price: line.unit_price,
      discount_percent: line.discount_percent,
    }));

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId),
    [activeBranchId, branches],
  );

  const quotationPrintMeta = useMemo(
    () => ({
      companyName: tenant?.name || 'Ma7alyErp',
      branchName: activeBranch?.name_ar || session.ctx?.branch.name_ar || '',
      userName: user?.full_name || user?.username,
      employeeCode: seller.defaultSeller?.employee_code,
      sellerName: seller.defaultSeller?.full_name,
      customerPhone: phone || selectedCustomer?.phone || selectedCustomer?.whatsapp || '',
      customerNotes: customerNotes.trim(),
      locale: 'ar' as const,
    }),
    [
      activeBranch,
      customerNotes,
      phone,
      selectedCustomer,
      seller.defaultSeller,
      session.ctx?.branch.name_ar,
      tenant?.name,
      user,
    ],
  );

  const saveQuotation = async () => {
    if (session.cart.length === 0) {
      session.setError(t('pos.cartEmpty'));
      return;
    }
    setDocSaving(true);
    session.setError(null);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      const doc = await salesQuotationsApi.create({
        customer: customerId || undefined,
        discount_amount: invoiceDiscount || '0',
        tax_percent: '0',
        valid_until: validUntil.toISOString().slice(0, 10),
        notes: [t('pos.quotationFromPos'), customerNotes.trim()].filter(Boolean).join(' | '),
        lines: cartToLines(),
      });
      onMessage?.(t('pos.quotationSavedHint', { code: doc.code }));
      setQuotationPrint({
        ...doc,
        branch_name: doc.branch_name || activeBranch?.name_ar,
        customer_name: doc.customer_name || selectedCustomer?.name_ar || null,
      });
      session.clearCart();
      setLoadedOrderId(null);
      setLoadedDocId(null);
    } catch (e) {
      session.setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setDocSaving(false);
    }
  };

  const saveReservation = async (deposit?: { amount: string; method: string }) => {
    if (session.cart.length === 0) {
      session.setError(t('pos.cartEmpty'));
      return;
    }
    setDocSaving(true);
    session.setError(null);
    try {
      const doc = await customerReservationsApi.create({
        customer: customerId || undefined,
        discount_amount: invoiceDiscount || '0',
        deposit_amount: deposit?.amount || '0',
        deposit_method: deposit?.method || 'cash',
        notes: buildReservationNotes(),
        lines: cartToLines(),
      });
      onMessage?.(t('pos.reservationSavedHint', { code: doc.code }));
      session.clearCart();
      setPayOpen(false);
      setLoadedOrderId(null);
      setLoadedDocId(null);
    } catch (e) {
      session.setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setDocSaving(false);
    }
  };

  const saveReservationFromPayment = (deposit: { amount: string; method: string }) => {
    void saveReservation(deposit);
  };

  const toggleDeliveryMode = () => {
    setIsDeliveryMode((v) => {
      const next = !v;
      if (next) {
        onMessage?.(t('pos.deliveryModeHint'));
        setTimeout(() => deliveryFeesRef.current?.focus(), 150);
      } else {
        setDeliveryFees('0');
        setDeliveryAgentId('');
      }
      return next;
    });
  };

  const startNewDeliverySale = () => {
    if (!isDeliveryMode) toggleDeliveryMode();
    else {
      onMessage?.(t('pos.deliveryModeHint'));
      setTimeout(() => deliveryFeesRef.current?.focus(), 150);
    }
  };

  const holdCart = () => {
    if (session.cart.length === 0) return;
    const c = customers.find((x) => x.id === customerId);
    const held = readHeldCarts();
    held.unshift({
      id: newLocalId('held'),
      label: c
        ? `${c.name_ar} — ${new Date().toLocaleTimeString()}`
        : `${new Date().toLocaleTimeString()} — ${session.cart.length}`,
      customerId: customerId || undefined,
      customerName: c?.name_ar,
      invoiceDiscount,
      deliveryFees,
      lines: session.cart,
    });
    writeHeldCarts(held);
    session.clearCart();
    setLoadedOrderId(null);
    setLoadedDocId(null);
    onMessage?.(t('pos.cartHeld'));
  };

  const resetInvoice = () => {
    session.clearCart();
    session.setError(null);
    setCustomerId('');
    setPhone('');
    setCustomerNotes('');
    setInvoiceDiscount('0');
    setDeliveryFees('0');
    setDeliveryAgentId('');
    setSearchQ('');
    setPayOpen(false);
    setPayGateError(null);
    setPayCheckoutError(null);
    setLoadedOrderId(null);
    setLoadedDocId(null);
    setIsDeliveryMode(false);
    setTransferOpen(false);
    seller.closeSellerPrompt();
    seller.clearDefaultSeller();
    setSellerCodeQ('');
    setSellerCodeError(null);
    searchRef.current?.focus();
  };

  const confirmPayment = async (payload: {
    payments: Array<{ payment_method: string; amount: string; reference?: string }>;
    paymentMethod: string;
    installmentPlanId?: string;
    downPaymentAmount?: string;
    numInstallments?: number;
  }) => {
    setPayCheckoutError(null);
    if (isCashCustomer) {
      const paid = payload.payments.reduce((s, p) => s + parsePosAmount(p.amount), 0);
      if (Math.abs(paid - cartSummary.netTotal) > 0.01) {
        const msg = t('pos.paymentNotComplete');
        setPayCheckoutError(msg);
        session.setError(msg);
        return;
      }
    } else {
      const paid = payload.payments.reduce((s, p) => s + parsePosAmount(p.amount), 0);
      const required = parsePosAmount(payload.downPaymentAmount || '0');
      if (Math.abs(paid - required) > 0.01) {
        const msg = t('pos.downPaymentNotComplete');
        setPayCheckoutError(msg);
        session.setError(msg);
        return;
      }
    }
    const sellerErr = validateCartBeforePay();
    if (sellerErr) {
      setPayCheckoutError(sellerErr);
      session.setError(sellerErr);
      return;
    }
    const sale = await session.checkout({
      customerId: customerId || undefined,
      discountAmount: invoiceDiscount,
      deliveryFees: isDeliveryMode ? deliveryFees : '0',
      isDelivery: isDeliveryMode,
      deliveryAgentId: isDeliveryMode ? deliveryAgentId || undefined : undefined,
      paymentMethod: payload.paymentMethod,
      payments: payload.payments,
      installmentPlanId: payload.installmentPlanId,
      downPaymentAmount: payload.downPaymentAmount,
      numInstallments: payload.numInstallments,
      notes: isDeliveryMode ? 'delivery-invoice' : undefined,
    });
    if (sale) {
      if (loadedOrderId) {
        try {
          await scanOrdersApi.markLoaded(loadedOrderId, 'pos-sale');
        } catch {
          /* non-blocking */
        }
      }
      if (customerId) {
        writeHeldCarts(readHeldCarts().filter((h) => h.customerId !== customerId));
      }
      setPayOpen(false);
      onMessage?.(`${t('pos.saleDone')} ${sale.code}`);
      if (sale.installment_receipt) {
        setReceiptDetail(sale.installment_receipt);
        setReceiptOpen(true);
      }
      resetInvoice();
    } else if (session.error) {
      setPayCheckoutError(session.error);
    }
  };

  const phoneOptions = useMemo(() => {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return [];
    const opts: string[] = [];
    if (c.phone) opts.push(c.phone);
    if (c.whatsapp && c.whatsapp !== c.phone) opts.push(c.whatsapp);
    return opts;
  }, [customerId, customers]);

  const sellerPicker = (
    <div className="w-full rounded-xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50 to-white p-3 space-y-2 shadow-sm">
      <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-emerald-900">
        <span>{t('pos.invoiceSeller')}</span>
        <button
          type="button"
          className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
          title={t('inventory.refresh')}
          onClick={() => void seller.loadEmployees()}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${seller.employeesLoading ? 'animate-spin' : ''}`} />
        </button>
      </label>
      <select
        className="h-10 w-full rounded-lg border border-emerald-300 bg-white px-2 text-sm font-bold shadow-sm"
        value={seller.defaultSellerId}
        onChange={(e) => seller.setDefaultSellerId(e.target.value)}
        disabled={seller.employeesLoading}
      >
        <option value="">
          {seller.employeesLoading ? t('pos.sellersLoading') : t('pos.selectSeller')}
        </option>
        {seller.employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.employee_code} — {e.full_name || e.username}
          </option>
        ))}
      </select>
      {seller.employees.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-28 overflow-y-auto">
          {seller.employees.map((e) => (
            <button
              key={e.id}
              type="button"
              title={e.full_name || e.username}
              className={`rounded-lg border px-2 py-2 text-[11px] font-bold transition text-start truncate ${
                seller.defaultSellerId === e.id
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100'
              }`}
              onClick={() => seller.setDefaultSellerId(e.id)}
            >
              <span className="block font-mono">{e.employee_code}</span>
              <span className={`block truncate text-[10px] ${seller.defaultSellerId === e.id ? 'text-emerald-100' : 'text-slate-600'}`}>
                {e.full_name || e.username}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-1">
        <Input
          className="h-9 flex-1 font-mono text-sm font-bold bg-white"
          placeholder={t('pos.sellerCodeHint')}
          value={sellerCodeQ}
          onChange={(e) => {
            setSellerCodeQ(e.target.value);
            setSellerCodeError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && lookupInvoiceSeller()}
        />
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 border-emerald-400 font-bold text-emerald-900 bg-white"
          disabled={!sellerCodeQ.trim()}
          onClick={lookupInvoiceSeller}
        >
          ✓
        </Button>
      </div>
      {seller.defaultSeller ? (
        <p className="text-xs font-bold text-emerald-900 text-center">
          ✓ {seller.defaultSeller.employee_code} — {seller.defaultSeller.full_name}
        </p>
      ) : null}
      {seller.employeesLoading ? (
        <p className="text-xs font-bold text-slate-500 text-center">{t('pos.sellersLoading')}</p>
      ) : null}
      {!seller.employeesLoading && seller.employees.length === 0 ? (
        <p className="text-xs font-bold text-amber-800 text-center leading-snug">
          {t('pos.sellersEmpty')}
        </p>
      ) : null}
      {seller.employeesError ? (
        <p className="text-xs font-bold text-red-700 text-center">{seller.employeesError}</p>
      ) : null}
      {sellerCodeError ? (
        <p className="text-xs font-bold text-red-700 text-center">{sellerCodeError}</p>
      ) : null}
      {session.cart.some((l) => !l.seller_id) && seller.defaultSeller ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full border-emerald-400 text-xs font-bold text-emerald-900 bg-white"
          onClick={applyDefaultSellerToCart}
        >
          {t('pos.applySellerToLines')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PosSellerPrompt
        open={seller.sellerPromptOpen}
        productLabel={seller.pendingLabel}
        employees={seller.employees}
        busy={seller.busy}
        error={seller.promptError}
        onConfirm={handleSellerConfirm}
        onCancel={seller.closeSellerPrompt}
      />
      <div className="shrink-0 px-4 pt-2">
        <PosShiftGate />
      </div>
      <div className="shrink-0 border-b bg-white px-4 py-3 space-y-2">
        {(seller.localError || session.error) ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {seller.localError || session.error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="relative min-w-[240px] flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="pos-sale-search"
                ref={searchRef}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !seller.busy && runSearch()}
                placeholder={t('pos.saleSearchPlaceholder')}
                className="h-11 ps-10 font-mono text-base"
                autoComplete="off"
                disabled={seller.busy || seller.sellerPromptOpen}
              />
            </div>
            <Button
              type="button"
              className="h-11 shrink-0 px-4 font-bold bg-[#4169E1] hover:bg-[#3451b2]"
              disabled={seller.busy || seller.sellerPromptOpen || !searchQ.trim()}
              onClick={runSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-w-[220px] flex-1 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs leading-relaxed text-amber-900 hidden lg:block">
            {customerNotes || t('pos.customerNotesHint')}
          </div>
        </div>
        {sellerPicker}
        <PosDeliveryPanel
          active={isDeliveryMode}
          fees={deliveryFees}
          onFeesChange={setDeliveryFees}
          onClose={() => {
            setIsDeliveryMode(false);
            setDeliveryFees('0');
            setDeliveryAgentId('');
          }}
          onPay={openPayment}
          payDisabled={session.cart.length === 0}
          paying={session.loading}
          grossTotal={Math.max(cartSummary.netTotal - (parseFloat(deliveryFees) || 0), 0)}
          netTotal={cartSummary.netTotal}
          inputRef={deliveryFeesRef}
          agents={seller.employees}
          agentId={deliveryAgentId}
          onAgentChange={setDeliveryAgentId}
        />
        <PosStockShortageBanner
          lines={shortageLines}
          onTransfer={() => setTransferOpen(true)}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <LoadFromOrderButton expectedType="sale" onLoaded={handleLoadOrder} />
          <LoadFromDocButton kind="quotation" onLoaded={handleLoadQuotation} />
          <LoadFromDocButton kind="reservation" onLoaded={handleLoadReservation} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-slate-500"
            onClick={() => seller.setSettingsOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5 me-1" />
            {t('pos.saleSettings')}
          </Button>
          {customerId && customerDocsLoading ? (
            <span className="font-medium text-blue-700">{t('pos.customerDocsLoading')}</span>
          ) : null}
          {(loadedOrderId || loadedDocId) ? (
            <span className="font-bold text-violet-700 flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              {t('pos.loadedSourceActive')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(270px,300px)_1fr]">
        {/* الشريط الجانبي — يمين في RTL */}
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-s bg-gradient-to-b from-slate-50 to-white p-3 shadow-[inset_1px_0_0_0_#e2e8f0]">
          <div className="space-y-2 shrink-0">
            <Input
              className="h-9 text-sm font-semibold bg-white"
              placeholder={t('pos.searchCustomer')}
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
            <div className="flex gap-1">
              <select
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold shadow-sm"
                value={customerId}
                onChange={(e) => onCustomerChange(e.target.value)}
              >
                <option value="">{t('pos.walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-slate-200 bg-white"
                title={t('pos.customerDocsReload')}
                disabled={!customerId || customerDocsLoading}
                onClick={() => customerId && loadCustomerDocuments(customerId, { manual: true })}
              >
                <Receipt className={`h-4 w-4 ${customerDocsLoading ? 'animate-pulse' : ''}`} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-slate-200 bg-white"
                title={t('pos.addCustomer')}
                onClick={() => onMessage?.(t('pos.addCustomerFromList'))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-1">
              <select
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm shadow-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!customerId}
              >
                <option value="">{t('pos.selectPhone')}</option>
                {phoneOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white" disabled={!customerId}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="mt-5 flex-1 min-h-0 overflow-y-auto space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-600 font-semibold">{t('pos.invoiceTotal')}</span>
              <span className="text-xl font-black tabular-nums text-slate-900">
                {fmtPosAmount(cartSummary.grossTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 font-semibold shrink-0">{t('pos.invoiceDiscount')}</span>
              <div className="flex items-center gap-1.5">
                {cartSummary.lineDiscountTotal > 0 ? (
                  <span className="text-sm font-bold tabular-nums text-orange-600">
                    {fmtPosAmount(cartSummary.lineDiscountTotal)}
                  </span>
                ) : null}
                <span className="text-slate-400">+</span>
                <Input
                  className="h-9 w-[72px] text-end font-black tabular-nums border-orange-200 bg-orange-50/50"
                  value={invoiceDiscount}
                  onChange={(e) => setInvoiceDiscount(e.target.value)}
                />
              </div>
            </div>
            <div
              className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition ${
                isDeliveryMode ? 'bg-orange-100 ring-2 ring-orange-300' : ''
              }`}
            >
              <span className={`font-semibold shrink-0 ${isDeliveryMode ? 'text-orange-900' : 'text-slate-600'}`}>
                {t('pos.deliveryFees')}
                {isDeliveryMode ? (
                  <span className="block text-[10px] font-bold text-orange-700">{t('pos.deliveryModeOn')}</span>
                ) : null}
              </span>
              <Input
                ref={deliveryFeesRef}
                className={`h-9 w-[88px] text-end font-black tabular-nums ${
                  isDeliveryMode ? 'border-orange-500 bg-white ring-2 ring-orange-300' : ''
                }`}
                value={deliveryFees}
                onChange={(e) => setDeliveryFees(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#4169E1] to-[#3451b2] px-4 py-5 text-center text-white shadow-lg mt-2">
              <p className="text-sm font-bold opacity-95">{t('pos.netInvoice')}</p>
              <p className="text-4xl font-black tabular-nums tracking-tight mt-1">
                {fmtPosAmount(cartSummary.netTotal)}
              </p>
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white/95 pt-3 mt-auto">
            {payGateError ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-xs font-bold text-red-700 text-center">
                {payGateError}
              </div>
            ) : null}
            <p className="text-center text-[10px] leading-snug text-slate-500 px-1">{t('pos.payHint')}</p>
            <Button
              className="h-12 w-full bg-[#4169E1] text-base font-black hover:bg-[#3451b2] shadow-md disabled:opacity-60"
              disabled={session.cart.length === 0}
              onClick={openPayment}
            >
              {session.loading ? t('inventory.loading') : t('pos.payButton')}
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full border-2 border-red-400 bg-red-50 text-red-700 font-black hover:bg-red-100"
              onClick={resetInvoice}
            >
              {t('pos.cancelSale')}
            </Button>
            {hasStockShortage ? (
              <Button
                className="h-11 w-full bg-emerald-600 font-black hover:bg-emerald-700 shadow-md"
                onClick={() => setTransferOpen(true)}
              >
                {t('pos.stockTransferBtn')}
              </Button>
            ) : null}
            <PosInvoiceActionCards
              onReserve={() => void saveReservation()}
              onQuotation={() => void saveQuotation()}
              onDelivery={() => setDeliveryHubOpen(true)}
              onHold={holdCart}
              disabled={session.cart.length === 0}
              docSaving={docSaving}
              deliveryActive={isDeliveryMode}
            />
          </div>
        </aside>

        <div className="min-h-0 overflow-auto bg-white">
          <table
            className="w-full text-sm min-w-[920px]"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            <thead className="sticky top-0 z-10 bg-gradient-to-l from-[#1d4ed8] to-[#2563eb] text-[11px] font-black text-white">
              <tr>
                <th className="w-10 px-2 py-3 text-center">#</th>
                <th className="px-3 py-3 text-start">{t('pos.colCode')}</th>
                <th className="px-3 py-3 text-start">{t('pos.colName')}</th>
                <th className="w-16 px-2 py-3 text-center">{t('pos.colQty')}</th>
                <th className="w-20 px-2 py-3 text-end">{t('pos.colPrice')}</th>
                <th className="w-16 px-2 py-3 text-end">{t('pos.colDiscount')}</th>
                <th className="w-20 px-2 py-3 text-end">{t('pos.colLineTotal')}</th>
                <th className="w-24 px-2 py-3 text-start">{t('pos.colSeller')}</th>
                <th className="w-16 px-2 py-3 text-center">{t('pos.colStock')}</th>
                <th className="w-20 px-2 py-3 text-center">{t('pos.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {session.cart.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-400 text-base">
                    {t('pos.cartEmpty')}
                  </td>
                </tr>
              ) : (
                session.cart.map((line, idx) => {
                  const discAmt = lineDiscountAmount(
                    line.quantity,
                    line.unit_price,
                    line.discount_percent,
                    line.discount_amount,
                  );
                  const lineTotal = lineSubtotal(
                    line.quantity,
                    line.unit_price,
                    line.discount_percent,
                    line.discount_amount,
                  );
                  return (
                  <tr
                    key={line.key}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 even:bg-slate-50/40 ${
                      lineStockDeficit(line) > 0 ? 'bg-red-50/80 ring-1 ring-inset ring-red-200' : ''
                    }`}
                  >
                    <td className="px-2 py-2.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-800">
                      {line.product_code || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      {line.product_name || line.label}
                    </td>
                    <td className="px-2 py-2.5 text-center font-black tabular-nums text-base">
                      {line.quantity}
                    </td>
                    <td className="px-2 py-2.5 text-end tabular-nums font-semibold">
                      {fmtPosAmount(parseFloat(line.unit_price) || 0)}
                    </td>
                    <td className="px-2 py-2.5 text-end tabular-nums font-bold text-orange-700">
                      {discAmt > 0 ? fmtPosAmount(discAmt) : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-end font-black tabular-nums text-base">
                      {fmtPosAmount(lineTotal)}
                    </td>
                    <td className="px-2 py-2.5 text-sm font-bold text-emerald-800">
                      {line.seller_name || '—'}
                    </td>
                    <td className={`px-2 py-2.5 text-center text-sm font-black ${lineStockDeficit(line) > 0 ? 'text-red-600' : 'text-blue-700'}`}>
                      {line.available}
                      {lineStockDeficit(line) > 0 ? (
                        <span className="block text-[10px] text-red-500">-{lineStockDeficit(line)}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex justify-center gap-1">
                        {canEditLine ? (
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4169E1] text-white hover:bg-[#3451b2] shadow-sm"
                            onClick={() => setEditLine(line)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#4169E1] text-white hover:bg-[#3451b2] shadow-sm"
                          onClick={() => session.removeLine(line.key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PosLineEditDialog
        line={editLine}
        canEditPrice={canEditLine}
        employees={seller.employees}
        onClose={() => setEditLine(null)}
        onSave={(patch) => {
          if (!editLine) return;
          const sellerPatch = patch.seller_id
            ? applySellerToCartLine(
                { ...editLine, ...patch },
                seller.employees.find((e) => e.id === patch.seller_id),
              )
            : patch;
          if (!seller.allowMultipleSellers && patch.seller_id) {
            const s = seller.employees.find((e) => e.id === patch.seller_id);
            session.setCart((prev) => prev.map((line) => applySellerToCartLine(line, s)));
          } else {
            session.updateLine(editLine.key, sellerPatch);
          }
          setEditLine(null);
        }}
      />

      <PosPaymentCanvas
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          setPayCheckoutError(null);
        }}
        netTotal={cartSummary.netTotal}
        itemCount={session.cart.length}
        qtyTotal={qtyTotal}
        isCashCustomer={isCashCustomer}
        customerBalance={parsePosAmount(selectedCustomer?.balance_due || '0')}
        saving={session.loading}
        checkoutError={payCheckoutError}
        docSaving={docSaving}
        onReserve={saveReservationFromPayment}
        onQuotation={() => {
          setPayOpen(false);
          void saveQuotation();
        }}
        onDelivery={() => {
          setPayOpen(false);
          setDeliveryHubOpen(true);
        }}
        onConfirm={confirmPayment}
      />

      <PosStockTransferCanvas
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        shortageLines={shortageLines}
        targetBranchId={activeBranchId || session.ctx?.branch.id || ''}
        onSaved={() => {
          void refreshCartStock();
          onMessage?.(t('pos.stockTransferDone'));
        }}
      />

      {quotationPrint ? (
        <PosQuotationPreviewPage
          quotation={quotationPrint}
          meta={quotationPrintMeta}
          onClose={() => setQuotationPrint(null)}
        />
      ) : null}

      <PosDeliveryHub
        open={deliveryHubOpen}
        onClose={() => setDeliveryHubOpen(false)}
        onNewDelivery={startNewDeliverySale}
      />

      <PosInstallmentReceiptDetail
        open={receiptOpen}
        receipt={receiptDetail}
        userName={user?.full_name || user?.username}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptDetail(null);
        }}
      />

      <Sheet open={seller.settingsOpen} onOpenChange={seller.setSettingsOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('pos.saleSettings')}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={seller.requireSeller}
                onChange={(e) => seller.setRequireSeller(e.target.checked)}
              />
              {t('pos.exchangeRequireSeller')}
            </label>
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">{t('pos.exchangeCommissionBasis')}</p>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm font-bold"
                value={seller.commissionBasis}
                onChange={(e) => seller.setCommissionBasis(e.target.value as 'seller' | 'product')}
              >
                <option value="seller">{t('pos.exchangeCommissionSeller')}</option>
                <option value="product">{t('pos.exchangeCommissionProduct')}</option>
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={seller.allowMultipleSellers}
                onChange={(e) => seller.setAllowMultipleSellers(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {t('pos.allowMultipleSellers')}
                <span className="block text-xs font-normal text-slate-500 mt-1">{t('pos.allowMultipleSellersHint')}</span>
              </span>
            </label>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => seller.setSettingsOpen(false)}>
              {t('inventory.cancel')}
            </Button>
            <Button
              onClick={async () => {
                await seller.saveSettings();
                onMessage?.(t('pos.exchangeSettingsSaved'));
              }}
            >
              {t('departments.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
