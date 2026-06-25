import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchPosCustomerReview, searchPosProducts, type PosCartLine } from '@/lib/api/pos';
import { canUseFeature } from '@/lib/permissions/access';
import { Button } from '@/components/ui/button';
import { PosCartPanel } from './PosCartPanel';
import { PosFullScreenShell } from './PosFullScreenShell';
import { PosInvoiceSellerPick } from './PosInvoiceSellerPick';
import { PosLineEditDialog } from './PosLineEditDialog';
import { PosProductTile } from './PosProductTile';
import { applySellerToCartLine, flattenGalleryItems } from './pos-utils';
import { usePosSession } from './usePosSession';
import { usePosSellerScan } from './usePosSellerScan';

type Props = {
  onClose: () => void;
};

export function PosGalleryPage({ onClose }: Props) {
  const { t } = useLanguage();
  const { user, activeBranchId, branches, setActiveBranchId } = useAuth();
  const session = usePosSession(activeBranchId);
  const seller = usePosSellerScan(session);
  const canEditLine = canUseFeature(user, 'pos', 'edit_line_price');

  const [searchQ, setSearchQ] = useState('');
  const [galleryItems, setGalleryItems] = useState(flattenGalleryItems(session.quickPicks));
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [payGateError, setPayGateError] = useState<string | null>(null);
  const [sellerCodeQ, setSellerCodeQ] = useState('');
  const [sellerCodeError, setSellerCodeError] = useState<string | null>(null);
  const [editLine, setEditLine] = useState<PosCartLine | null>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    fetchPosCustomerReview()
      .then((rows) => setCustomers(rows.map((c) => ({ id: c.id, name: c.name_ar }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setGalleryItems(flattenGalleryItems(session.quickPicks));
  }, [session.quickPicks]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQ.trim()) {
        setGalleryItems(flattenGalleryItems(session.quickPicks));
        return;
      }
      try {
        const res = await searchPosProducts({ q: searchQ.trim() });
        setGalleryItems(flattenGalleryItems(res.products));
      } catch {
        /* keep previous */
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQ, session.quickPicks]);

  const filteredItems = useMemo(() => galleryItems, [galleryItems]);

  const applyDefaultSellerToCart = useCallback(() => {
    const s = seller.defaultSeller;
    if (!s) return;
    session.setCart((prev) =>
      prev.map((line) => (line.seller_id ? line : applySellerToCartLine(line, s))),
    );
  }, [seller.defaultSeller, session]);

  useEffect(() => {
    if (!seller.defaultSeller) return;
    applyDefaultSellerToCart();
  }, [seller.defaultSellerId, applyDefaultSellerToCart, seller.defaultSeller]);

  useEffect(() => {
    setPayGateError(null);
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
    }
    return null;
  }, [seller.requireSeller, session.cart, t]);

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

  const handleAddVariant = (item: ReturnType<typeof flattenGalleryItems>[0]) => {
    session.setError(null);
    if (seller.defaultSeller) {
      session.addVariant(
        item.product,
        item.variant,
        seller.defaultSeller.id,
        seller.defaultSeller.full_name,
      );
      return;
    }
    if (seller.requireSeller) {
      const msg = t('pos.selectSeller');
      setPayGateError(msg);
      session.setError(msg);
      return;
    }
    session.addVariant(item.product, item.variant);
  };

  const handlePay = async () => {
    session.setError(null);
    setPayGateError(null);
    const err = validateCartBeforePay();
    if (err) {
      setPayGateError(err);
      session.setError(err);
      return;
    }
    await session.checkout({
      customerId: customerId || undefined,
      discountAmount: discount,
      paymentMethod: 'cash',
    });
  };

  const handleEditSave = (patch: Partial<PosCartLine>) => {
    if (!editLine) return;
    const sellerPatch = patch.seller_id
      ? applySellerToCartLine(
          { ...editLine, ...patch },
          seller.employees.find((e) => e.id === patch.seller_id),
        )
      : patch;
    session.updateLine(editLine.key, sellerPatch);
    setEditLine(null);
  };

  if (!activeBranchId || !activeBranch) {
    return (
      <PosFullScreenShell title={t('pos.galleryTitle')} onClose={onClose}>
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <p className="font-bold text-amber-900">{t('pos.selectBranch')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {branches.map((b) => (
                <Button key={b.id} onClick={() => setActiveBranchId(b.id)}>
                  {b.name_ar}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PosFullScreenShell>
    );
  }

  return (
    <PosFullScreenShell
      title={t('pos.galleryTitle')}
      branchName={activeBranch.name_ar}
      warehouseName={session.ctx?.warehouse.name_ar}
      onClose={onClose}
    >
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(320px,38%)_1fr]">
        <div className="min-h-0 border-e border-slate-200 shadow-lg">
          <PosCartPanel
            cart={session.cart}
            cartTotal={session.cartTotal}
            offerDiscountsTotal={session.offerDiscountsTotal}
            discount={discount}
            onDiscountChange={setDiscount}
            customers={customers}
            customerId={customerId}
            onCustomerChange={setCustomerId}
            searchQ={searchQ}
            onSearchQChange={setSearchQ}
            onRemove={session.removeLine}
            onUpdate={session.updateLine}
            onPay={() => void handlePay()}
            onReset={() => {
              session.clearCart();
              setDiscount('0');
              setPayGateError(null);
            }}
            paying={session.loading}
            showSeller
            payGateError={payGateError}
            onEditLine={setEditLine}
            sellerSection={
              <PosInvoiceSellerPick
                seller={seller}
                sellerCodeQ={sellerCodeQ}
                onSellerCodeQChange={setSellerCodeQ}
                sellerCodeError={sellerCodeError}
                onLookupCode={() => void lookupInvoiceSeller()}
                cart={session.cart}
                onApplyToLines={applyDefaultSellerToCart}
              />
            }
          />
        </div>

        <div className="flex min-h-0 flex-col bg-[#f8fafc]">
          {session.error && session.error !== 'MULTI_HIT' && session.error !== 'NOT_FOUND' ? (
            <p className="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{session.error}</p>
          ) : null}
          {session.success ? (
            <p className="shrink-0 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              {t('pos.saleDone')} {session.success}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {filteredItems.length === 0 ? (
              <p className="py-20 text-center text-slate-500">{t('pos.noStockHint')}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => (
                  <PosProductTile
                    key={item.key}
                    item={item}
                    onClick={() => handleAddVariant(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PosLineEditDialog
        line={editLine}
        canEditPrice={canEditLine}
        employees={seller.employees}
        onClose={() => setEditLine(null)}
        onSave={handleEditSave}
      />
    </PosFullScreenShell>
  );
}
