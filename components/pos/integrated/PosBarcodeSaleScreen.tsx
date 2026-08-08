import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosCustomerReview } from '@/lib/api/pos';
import { PosIntegratedPaymentModal } from '../PosIntegratedPaymentModal';
import { PosIntegratedStandaloneScreen } from './PosIntegratedStandaloneScreen';
import { PosInvoiceSellerPick } from '../PosInvoiceSellerPick';
import { PosSellerPrompt } from '../PosSellerPrompt';
import { PosShiftGate } from '../PosShiftGate';
import { PosStockShortageBanner } from '../PosStockShortageBanner';
import { PosStockTransferCanvas } from '../PosStockTransferCanvas';
import { playPosSuccessSound } from '../pos-click-sound';
import { cartShortageLines } from '../pos-utils';
import { usePosSellerScan } from '../usePosSellerScan';
import type { usePosSession } from '../usePosSession';

type Session = ReturnType<typeof usePosSession>;

type Props = {
  session: Session;
};

export function PosBarcodeSaleScreen({ session }: Props) {
  const { t } = useLanguage();
  const { user, tenant, branches, activeBranchId } = useAuth();
  const seller = usePosSellerScan(session);

  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [payGateError, setPayGateError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sellerCodeQ, setSellerCodeQ] = useState('');
  const [sellerCodeError, setSellerCodeError] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const brandName = tenant?.name || t('pos.integrated.brandName');

  useEffect(() => {
    fetchPosCustomerReview()
      .then((rows) => setCustomers(rows.map((c) => ({ id: c.id, name: c.name_ar }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPayGateError(null);
  }, [session.cart]);

  const baseTotal = session.cartTotal;
  const discountAmount = (baseTotal * discountPct) / 100;
  const afterDiscount = Math.max(baseTotal - discountAmount, 0);
  const finalTotal = afterDiscount;

  const cartItemCount = useMemo(
    () => session.cart.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0),
    [session.cart],
  );

  const sellerDisplay = seller.defaultSeller?.full_name || user?.full_name || user?.username || '—';

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
        if (sellerIds.size > 1) return t('pos.singleSellerOnly');
      }
    }
    return null;
  }, [session.cart, seller.requireSeller, seller.allowMultipleSellers, t]);

  const lookupInvoiceSeller = async () => {
    const code = sellerCodeQ.trim();
    if (!code) return;
    setSellerCodeError(null);
    try {
      await seller.resolveDefaultSellerByCode(code, t('pos.exchangeSellerNotFound'));
      setSellerCodeQ('');
    } catch (e) {
      setSellerCodeError(e instanceof Error ? e.message : t('pos.exchangeSellerNotFound'));
    }
  };

  const applyDefaultSellerToCart = useCallback(() => {
    const s = seller.defaultSeller;
    if (!s) return;
    session.setCart((prev) =>
      prev.map((line) =>
        line.seller_id
          ? line
          : {
              ...line,
              seller_id: s.id,
              seller_name: s.full_name,
            },
      ),
    );
  }, [seller.defaultSeller, session]);

  useEffect(() => {
    if (seller.defaultSeller) applyDefaultSellerToCart();
  }, [seller.defaultSellerId, applyDefaultSellerToCart, seller.defaultSeller]);

  const handleScanProduct = useCallback(
    async (code: string) => {
      if (seller.busy || seller.sellerPromptOpen) return false;
      session.setError(null);
      const ok = await seller.submitProduct(code, t('pos.bundleOffer'), t('pos.notFound'));
      return ok;
    },
    [seller, session, t],
  );

  const handleSellerConfirm = async (code: string) => {
    await seller.confirmSeller(code, t('pos.exchangeSellerNotFound'));
  };

  const openPaymentModal = () => {
    session.setError(null);
    setPayGateError(null);
    const err = validateCartBeforePay();
    if (err) {
      setPayGateError(err);
      session.setError(err);
      return;
    }
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (payload: {
    paymentMethod: string;
    payments: Array<{ payment_method: string; amount: string; reference: string }>;
  }) => {
    const sale = await session.checkout({
      customerId: customerId || undefined,
      discountAmount: String(discountAmount.toFixed(2)),
      taxPercent: '0',
      paymentMethod: payload.paymentMethod === 'fawry' ? 'wallet' : payload.paymentMethod,
      payments: payload.payments.map((p) => ({
        ...p,
        payment_method: p.payment_method === 'fawry' ? 'wallet' : p.payment_method,
      })),
    });
    if (sale) {
      playPosSuccessSound();
      setPaymentOpen(false);
      setDiscountPct(0);
    }
  };

  const handleReset = () => {
    session.clearCart();
    setDiscountPct(0);
    setPayGateError(null);
    setCustomerId('');
  };

  const shortageLines = useMemo(() => cartShortageLines(session.cart), [session.cart]);
  const customerName = customers.find((c) => c.id === customerId)?.name || t('pos.walkInCustomer');

  return (
    <>
      <div className="pos-barcode-sale-wrap">
        <div className="pos-barcode-sale-shift">
          <PosShiftGate />
        </div>
        {shortageLines.length > 0 ? (
          <div className="pos-barcode-sale-banner">
            <PosStockShortageBanner lines={shortageLines} onTransfer={() => setTransferOpen(true)} />
          </div>
        ) : null}
        <div className="pos-barcode-sale-seller">
          <PosInvoiceSellerPick
            seller={seller}
            sellerCodeQ={sellerCodeQ}
            onSellerCodeQChange={setSellerCodeQ}
            sellerCodeError={sellerCodeError}
            onLookupCode={() => void lookupInvoiceSeller()}
            cart={session.cart}
            onApplyToLines={applyDefaultSellerToCart}
            variant="inline"
          />
        </div>
        <PosIntegratedStandaloneScreen
          session={session}
          accountSeller={{ id: seller.defaultSeller?.id, full_name: sellerDisplay }}
          customerId={customerId}
          customers={customers}
          onCustomerChange={setCustomerId}
          discountPct={discountPct}
          onDiscountChange={setDiscountPct}
          afterDiscount={afterDiscount}
          finalTotal={finalTotal}
          cartItemCount={cartItemCount}
          payGateError={payGateError || (session.error && session.error !== 'MULTI_HIT' && session.error !== 'NOT_FOUND' ? session.error : null)}
          onPay={openPaymentModal}
          onReset={handleReset}
          onScanProduct={handleScanProduct}
        />
      </div>

      <PosSellerPrompt
        open={seller.sellerPromptOpen}
        productLabel={seller.pendingLabel}
        employees={seller.employees}
        busy={seller.busy}
        error={seller.promptError}
        onConfirm={(code) => void handleSellerConfirm(code)}
        onCancel={seller.closeSellerPrompt}
      />

      <PosIntegratedPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onConfirm={(payload) => void handlePaymentConfirm(payload)}
        saving={session.loading}
        cart={session.cart}
        subtotal={baseTotal}
        discountAmount={discountAmount}
        finalTotal={finalTotal}
        customerName={customerName}
        cashierName={user?.full_name || user?.username || '—'}
        storeName={brandName}
        branchName={activeBranch?.name_ar}
      />

      <PosStockTransferCanvas
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        shortageLines={shortageLines}
        targetBranchId={activeBranchId || session.ctx?.branch.id || ''}
        onSaved={() => {
          setTransferOpen(false);
          void session.load();
        }}
      />
    </>
  );
}
