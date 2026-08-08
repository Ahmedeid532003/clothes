import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutGrid,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  ShoppingBag,
  Smartphone,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosCustomerReview, fetchPosCustomerOpenDocs, type PosCartLine, type PosCustomerReviewRow } from '@/lib/api/pos';
import type { SalesQuotationDto } from '@/lib/api/sales';
import { customerReservationsApi, salesQuotationsApi } from '@/lib/api/sales';
import { scanOrdersApi } from '@/lib/api/scanOrders';
import type { InstallmentReceipt } from '@/lib/api/receivables';
import { canUseFeature } from '@/lib/permissions/access';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PosLineEditDialog } from './PosLineEditDialog';
import { PosPaymentCanvas } from './PosPaymentCanvas';
import { PosInstallmentReceiptDetail } from './PosInstallmentReceiptDetail';
import { fmtPosAmount, applySellerToCartLine, lineDiscountAmount, lineGross, lineSubtotal, newLocalId, parsePosAmount, cartShortageLines, cartHasStockShortage, lineStockDeficit, flattenGalleryItems } from './pos-utils';
import { PosDeliveryPanel } from './PosDeliveryPanel';
import { PosDeliveryHub } from './PosDeliveryHub';
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
import type { usePosSession } from './usePosSession';
import { PosPendingOrdersModal, usePendingOrdersCount } from './smart/PosPendingOrdersModal';
import { PosActiveQuotationsModal, useActiveQuotationsCount } from './smart/PosActiveQuotationsModal';
import { PosPreReservationsModal, usePreReservationsCount } from './smart/PosPreReservationsModal';
import type { HeldCartRow } from './posCustomerDocs';

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
  const [pendingOpen, setPendingOpen] = useState(false);
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const { count: pendingCount, refresh: refreshPending } = usePendingOrdersCount();
  const { count: quotesCount, refresh: refreshQuotes } = useActiveQuotationsCount();
  const { count: bookingsCount, refresh: refreshBookings } = usePreReservationsCount();
  const quickItems = useMemo(() => flattenGalleryItems(session.quickPicks).slice(0, 8), [session.quickPicks]);

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
    refreshPending();
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
    refreshQuotes();
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
    refreshBookings();
  };

  const handleLoadHeld = (held: HeldCartRow) => {
    session.clearCart();
    session.setCart(held.lines);
    if (held.customerId) setCustomerId(held.customerId);
    if (held.invoiceDiscount) setInvoiceDiscount(held.invoiceDiscount);
    if (held.deliveryFees) setDeliveryFees(held.deliveryFees);
    setLoadedOrderId(null);
    setLoadedDocId(null);
    onMessage?.(t('pos.cartHeld'));
    refreshPending();
  };

  const handleQuickAdd = (code: string) => {
    if (seller.busy || seller.sellerPromptOpen) return;
    void seller.submitProduct(code, t('pos.bundleOffer'), t('pos.notFound')).then((ok) => {
      if (ok) {
        session.setCart((cart) => {
          warnShortageFromCart(cart);
          return cart;
        });
        onMessage?.(t('pos.itemAdded'));
      }
    });
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

  const customerCode = selectedCustomer?.code || '';
  const phoneDisplay = phone || selectedCustomer?.phone || selectedCustomer?.whatsapp || t('pos.smart.anonymousCash');

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
      <div className="psc-search-row">
        {(seller.localError || session.error) ? (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {seller.localError || session.error}
          </div>
        ) : null}
        <div className="psc-search-bar">
          <div className="psc-search-input-wrap">
            <input
              id="pos-sale-search"
              ref={searchRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !seller.busy && runSearch()}
              placeholder={t('pos.smart.searchPlaceholder')}
              autoComplete="off"
              disabled={seller.busy || seller.sellerPromptOpen}
            />
          </div>
          <button type="button" className="psc-btn-search" disabled={seller.busy || !searchQ.trim()} onClick={runSearch}>
            {t('pos.smart.searchBtn')}
          </button>
          <button type="button" className="psc-btn-camera" onClick={runSearch} disabled={seller.busy}>
            <ScanLine className="h-4 w-4" />
            {t('pos.smart.cameraBtn')}
          </button>
        </div>
        <div className="psc-actions-row">
          <button type="button" className="psc-action-chip psc-action-chip--barcode" onClick={() => seller.setSettingsOpen(true)}>
            <QrCode className="h-3.5 w-3.5" />
            {t('pos.smart.barcodePanel')}
          </button>
          <div className="psc-action-chips">
            <button type="button" className="psc-action-chip psc-action-chip--order" onClick={() => setPendingOpen(true)}>
              <FileText className="h-3.5 w-3.5 text-sky-600" />
              {t('pos.smart.loadPending')}
              {pendingCount > 0 ? <span className="psc-chip-badge">{t('pos.smart.pendingBadge', { count: String(pendingCount) })}</span> : null}
            </button>
            <button type="button" className="psc-action-chip psc-action-chip--quote" onClick={() => setQuotesOpen(true)}>
              <FileText className="h-3.5 w-3.5 text-violet-600" />
              {t('pos.smart.pullQuote')}
              {quotesCount > 0 ? <span className="psc-chip-badge">{t('pos.smart.quotesBadge', { count: String(quotesCount) })}</span> : null}
            </button>
            <button type="button" className="psc-action-chip psc-action-chip--booking" onClick={() => setBookingsOpen(true)}>
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
              {t('pos.smart.loadBooking')}
              {bookingsCount > 0 ? <span className="psc-chip-badge">{t('pos.smart.bookingsBadge', { count: String(bookingsCount) })}</span> : null}
            </button>
          </div>
        </div>
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
        <PosStockShortageBanner lines={shortageLines} onTransfer={() => setTransferOpen(true)} />
      </div>

      <div className="psc-workspace">
        <div className="psc-main">
          <div className="psc-cart-card">
            <div className="psc-cart-table-wrap">
              {session.cart.length === 0 ? (
                <div className="psc-cart-empty">
                  <div className="psc-cart-empty-icon">🛍️</div>
                  <h3>{t('pos.smart.cartEmptyTitle')}</h3>
                  <p>{t('pos.smart.cartEmptyHint')}</p>
                </div>
              ) : (
                <table className="psc-cart-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('pos.smart.colClothingCode')}</th>
                      <th>{t('pos.smart.colClothingName')}</th>
                      <th>{t('pos.colQty')}</th>
                      <th>{t('pos.colPrice')}</th>
                      <th>{t('pos.smart.colCustomDiscount')}</th>
                      <th>{t('pos.colLineTotal')}</th>
                      <th>{t('pos.colSeller')}</th>
                      <th>{t('pos.smart.colWarehouse')}</th>
                      <th>{t('pos.colAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.cart.map((line, idx) => {
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
                        <tr key={line.key} className={lineStockDeficit(line) > 0 ? 'bg-red-50' : undefined}>
                          <td>{idx + 1}</td>
                          <td className="font-mono text-xs font-bold text-blue-800">{line.product_code || '—'}</td>
                          <td className="font-bold">{line.product_name || line.label}</td>
                          <td className="text-center font-black">{line.quantity}</td>
                          <td className="text-end tabular-nums">{fmtPosAmount(parseFloat(line.unit_price) || 0)}</td>
                          <td className="text-end tabular-nums text-orange-700">{discAmt > 0 ? fmtPosAmount(discAmt) : '—'}</td>
                          <td className="text-end font-black tabular-nums">{fmtPosAmount(lineTotal)}</td>
                          <td className="text-emerald-800">{line.seller_name || '—'}</td>
                          <td className="text-center">{line.available}</td>
                          <td>
                            <div className="flex justify-center gap-1">
                              {canEditLine ? (
                                <button type="button" className="rounded bg-blue-600 p-1.5 text-white" onClick={() => setEditLine(line)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              <button type="button" className="rounded bg-blue-600 p-1.5 text-white" onClick={() => session.removeLine(line.key)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <section className="psc-quick-section">
            <div className="psc-quick-head">
              <h3>
                <LayoutGrid className="inline h-4 w-4 me-1 text-blue-600" />
                {t('pos.smart.quickAccessTitle')}
              </h3>
              <span className="psc-stock-tag">
                <Zap className="h-3 w-3" />
                {t('pos.smart.stockAvailable')}
              </span>
            </div>
            <div className="psc-quick-grid">
              {quickItems.map((item) => {
                const qty = parseFloat(String(item.variant.quantity_available)) || 0;
                const low = qty > 0 && qty <= 3;
                const code = item.variant.barcode || item.product.code;
                return (
                  <button key={item.key} type="button" className="psc-quick-tile" onClick={() => handleQuickAdd(code)}>
                    <span className={`psc-stock-dot ${low ? 'psc-stock-dot--low' : 'psc-stock-dot--ok'}`} />
                    <span className="psc-tile-name">{item.product.name_ar}</span>
                    <div className="psc-tile-meta">
                      <span className="psc-tile-code">{item.product.code}</span>
                      <span className="psc-tile-price">{item.variant.unit_price} {t('dashboard.currency')}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="psc-sidebar">
          <div className="psc-total-card">
            <p>{t('pos.smart.totalDue')}</p>
            <strong>{fmtPosAmount(cartSummary.netTotal)} {t('dashboard.currency')}</strong>
          </div>

          <div className="psc-side-card">
            <h4><User className="h-4 w-4 text-blue-600" />{t('pos.smart.customerCredit')}</h4>
            {customerCode ? <span className="psc-customer-code">{customerCode}</span> : null}
            <div className="psc-customer-row">
              <select value={customerId} onChange={(e) => onCustomerChange(e.target.value)}>
                <option value="">{t('pos.walkInCustomer')}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
              <button type="button" className="psc-customer-add" onClick={() => onMessage?.(t('pos.addCustomerFromList'))} title={t('pos.addCustomer')}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <select className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)}>
              <option value="">{phoneDisplay}</option>
              {phoneOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="psc-side-card">
            <h4>{t('pos.smart.invoiceNotes')}</h4>
            <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder={t('pos.smart.notesPlaceholder')} />
          </div>

          <div className="psc-side-card">
            <h4><Zap className="h-4 w-4 text-amber-500" />{t('pos.smart.payMethods')}</h4>
            <div className="psc-pay-methods">
              <button type="button" className="psc-pay-method psc-pay-method--cash" onClick={openPayment}>
                <span className="psc-pay-icon"><Banknote className="h-4 w-4" /></span>
                <span>{t('pos.smart.payFawry')}</span>
              </button>
              <button type="button" className="psc-pay-method psc-pay-method--wallet" onClick={openPayment}>
                <span className="psc-pay-icon"><Smartphone className="h-4 w-4" /></span>
                <span>{t('pos.smart.payWallet')}</span>
              </button>
              <button type="button" className="psc-pay-method psc-pay-method--card" onClick={openPayment}>
                <span className="psc-pay-icon"><CreditCard className="h-4 w-4" /></span>
                <span>{t('pos.smart.payCard')}</span>
              </button>
            </div>
          </div>

          {payGateError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-2 py-2 text-xs font-bold text-red-700 text-center">{payGateError}</div>
          ) : null}

          <div className="psc-checkout-row">
            <button type="button" className="psc-btn-clear" onClick={resetInvoice} title={t('pos.cancelSale')}>
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" className="psc-btn-register" disabled={session.cart.length === 0 || session.loading} onClick={openPayment}>
              <CheckCircle2 className="h-4 w-4" />
              {session.loading ? t('inventory.loading') : t('pos.smart.registerInvoice')}
            </button>
          </div>

          {hasStockShortage ? (
            <Button className="w-full bg-emerald-600 font-black" onClick={() => setTransferOpen(true)}>{t('pos.stockTransferBtn')}</Button>
          ) : null}

          <button type="button" className="psc-util-card" disabled={session.cart.length === 0 || docSaving} onClick={() => void saveReservation()}>
            <span className="psc-util-icon"><QrCode className="h-4 w-4" /></span>
            <div><h5>{t('pos.smart.reserveGoods')}</h5><p>{t('pos.smart.reserveDesc')}</p></div>
          </button>
          <button type="button" className="psc-util-card" disabled={session.cart.length === 0 || docSaving} onClick={() => void saveQuotation()}>
            <span className="psc-util-icon"><FileText className="h-3.5 w-3.5" /></span>
            <div><h5>{t('pos.smart.priceQuote')}</h5><p>{t('pos.smart.quoteDesc')}</p></div>
          </button>

          <button type="button" className="psc-buyer-btn" onClick={() => onMessage?.(t('pos.smart.buyerScreen'))}>
            <Smartphone className="h-3 w-3" />
            {t('pos.smart.buyerScreen')}
          </button>
        </aside>
      </div>

      <PosPendingOrdersModal open={pendingOpen} onClose={() => setPendingOpen(false)} onLoadScanOrder={handleLoadOrder} onLoadHeld={handleLoadHeld} />
      <PosActiveQuotationsModal open={quotesOpen} onClose={() => setQuotesOpen(false)} onLoad={handleLoadQuotation} />
      <PosPreReservationsModal open={bookingsOpen} onClose={() => setBookingsOpen(false)} onLoad={handleLoadReservation} />

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
