/**
 * Smart barcode POS — UI from AI Studio reference, data from Ma7alyErp API.
 */
import React, { useState } from 'react';
import { Laptop, Smartphone } from 'lucide-react';
import SellerDashboard from './components/SellerDashboard';
import CustomerPortal from './components/CustomerPortal';
import { useBarcodeStudioData } from './useBarcodeStudioData';
import type { CartItem, Transaction } from './types';

type Props = {
  activeBranchId: string | null;
  onClose?: () => void;
};

export function PosBarcodeStudioApp({ activeBranchId, onClose }: Props) {
  const [currentMode, setCurrentMode] = useState<'merchant' | 'customer'>('merchant');

  const data = useBarcodeStudioData(activeBranchId);

  const handleAddTransaction = (tx: Transaction) => {
    // Sales/exchanges already persisted via API in completeSale/completeExchange
    void tx;
  };

  return (
    <div className="min-h-full bg-slate-100 flex flex-col selection:bg-blue-100 selection:text-blue-900 font-sans relative" dir="rtl">
      {data.error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {data.error}
          <button
            type="button"
            className="ms-3 underline"
            onClick={() => void data.reload()}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      {data.dataReady && !data.error && data.productCount === 0 ? (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          لم يُحمَّل أي منتج من قاعدة البيانات. تأكد من اختيار الفرع الصحيح، وربط مخزن بالفرع، ووجود أصناف نشطة بمقاسات/ألوان.
        </div>
      ) : null}

      <main className="flex-grow">
        {currentMode === 'merchant' ? (
          <SellerDashboard
            products={data.products}
            onUpdateProductsStock={data.updateProductsStock}
            customers={data.customers}
            onUpdateCustomerList={data.updateCustomerList}
            onAddTransaction={handleAddTransaction}
            onClose={onClose}
            salesAgents={data.salesAgents}
            expectedBalance={data.expectedBalance}
            pastTransactions={data.pastTransactions}
            pendingOrders={data.pendingOrders}
            priceQuotes={data.priceQuotes}
            preBookings={data.preBookings}
            onCompleteSale={data.completeSale}
            onCompleteExchange={data.completeExchange}
            onSaveCustomerProfile={data.saveCustomerProfile}
            onReload={data.reload}
            onLookupBarcode={data.lookupByBarcode}
            onLoadPendingOrder={data.loadPendingOrderDetails}
            onLoadQuote={data.loadQuoteDetails}
            onLoadReservation={data.loadReservationDetails}
            onRefreshCustomerInstallments={data.refreshCustomerInstallments}
            onCreateCustomer={data.createCustomer}
          />
        ) : (
          <div className="space-y-4">
            <header className="bg-white border-b border-slate-200 py-3.5 px-4 shadow-xs text-right">
              <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
                <h1 className="text-sm font-bold text-slate-800">
                  بوابة الدفع الذاتي للزبون - امسح ملصق الملابس واشترِ
                </h1>
                <button
                  type="button"
                  onClick={() => setCurrentMode('merchant')}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Laptop size={13} />
                  <span>العودة لوحة الكاشير POS</span>
                </button>
              </div>
            </header>
            <CustomerPortal
              products={data.products}
              onAddTransaction={handleAddTransaction}
              onUpdateProductsStock={data.updateProductsStock}
            />
          </div>
        )}
      </main>

      <div className="fixed bottom-5 left-5 z-50">
        <button
          type="button"
          onClick={() => setCurrentMode(currentMode === 'merchant' ? 'customer' : 'merchant')}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700/80 transition-all text-[11px] font-extrabold cursor-pointer hover:scale-105 active:scale-95 shadow-slate-950/20"
          title={currentMode === 'merchant' ? 'شاشة الزبون' : 'لوحة الكاشير'}
        >
          {currentMode === 'merchant' ? (
            <>
              <Smartphone size={13} className="text-blue-400 shrink-0" />
              <span>شاشة المشتري 📱</span>
            </>
          ) : (
            <>
              <Laptop size={13} className="text-blue-400 shrink-0" />
              <span>لوحة الكاشير 💻</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
