/**
 * Host for original PurchasesTab screens only.
 * No internal Ma7aly sidebar/header — ERP sidebar handles navigation.
 * Does not modify PurchasesTab or any original purchase components.
 */
import React, { useEffect, useState } from 'react';
import {
  initialActivities,
  initialProducts,
  type Product,
  type RecentActivity,
} from './mockData';
import {
  PurchasesTab,
  type PurchaseInvoice,
  type PurchaseOrder,
  type PurchaseReturn,
} from './components/PurchasesTab';
import type { ShippingCompany } from './components/ShippingCompaniesTab';

export const PURCHASES_SUBMENUS = [
  { id: 'purchase-invoices', labelEn: 'Purchase Invoices', labelAr: 'فواتير المشتريات' },
  { id: 'purchase-returns', labelEn: 'Purchase Returns', labelAr: 'مرتد مشتريات' },
  { id: 'purchase-alerts', labelEn: 'Purchase Alerts', labelAr: 'تنبيهات لشراء منتجات' },
  { id: 'purchase-orders', labelEn: 'Purchase Orders', labelAr: 'اوامر شراء' },
  { id: 'shipping-companies', labelEn: 'Shipping Companies', labelAr: 'شركات الشحن' },
  { id: 'purchase-reports', labelEn: 'Purchase Reports', labelAr: 'تقارير المشتريات' },
] as const;

export type PurchasesSubTabId = (typeof PURCHASES_SUBMENUS)[number]['id'];

const initialShippingCompanies: ShippingCompany[] = [
  {
    id: 'SHIP-1',
    companyName: 'Aramex',
    officeNum1: '19992',
    officeNum2: '01000000001',
    repName: 'Ahmed Ali',
    repPhone: '01111111111',
  },
  {
    id: 'SHIP-2',
    companyName: 'Bosta',
    officeNum1: '19993',
    officeNum2: '01000000002',
    repName: 'Mohamed Hany',
    repPhone: '01111111112',
  },
];

const initialPurchaseReturns: PurchaseReturn[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `PR-${1001 + i}`,
  returnNo: `#PR-${1001 + i}`,
  supplierName: ['Giza Spinning & Weaving Co.', 'Al-Nasr Textiles', 'Misr Amriya', 'Orient Weavers', 'Nile Cotton'][
    i % 5
  ],
  returnDate: `2026-07-${String(18 - i > 0 ? 18 - i : 30 + (18 - i)).padStart(2, '0')}`,
  totalAmount: (i + 1) * 1500.5,
  paymentMethod: ['Cash', 'Credit Card', 'Bank Transfer'][i % 3],
  username: 'Hany Cashier',
  branch: ['Main Branch', 'Nasr City Store', 'Maadi Store'][i % 3],
  shippingCompany: ['urgent', 'mirage', 'rapido', 'barq_star'][i % 4],
  waybillNumber: `WB${20000 + i * 7}`,
}));

const initialPurchaseInvoices: PurchaseInvoice[] = [
  {
    invoiceNo: '#PINV-1001',
    supplierName: 'Giza Spinning & Weaving Co.',
    invoiceDate: '2026-06-04',
    dueDate: '2026-07-04',
    itemsCount: 150,
    totalAmount: 4500.0,
    paidAmount: 4500.0,
    remainingAmount: 0.0,
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'Paid',
    deliveryStatus: 'Pending',
    username: 'هاني',
    branch: 'فرع المسرح الروماني',
    items: [
      { productName: 'Classic Summer T-Shirt', qty: 100, costPrice: 12.0, total: 1200.0 },
      { productName: 'Elegant Evening Dress', qty: 50, costPrice: 45.0, total: 2250.0 },
    ],
    notes: 'Imported raw material and yarn fabrics.',
    refNo: 'REF-GIZA-9901',
  },
  {
    invoiceNo: '#PINV-1002',
    supplierName: 'Textile House Leather Exports',
    invoiceDate: '2026-06-01',
    dueDate: '2026-06-15',
    itemsCount: 80,
    totalAmount: 2800.0,
    paidAmount: 1800.0,
    remainingAmount: 1000.0,
    paymentMethod: 'Credit',
    paymentStatus: 'Partially Paid',
    deliveryStatus: 'Delivered',
    items: [
      { productName: 'Leather Casual Sneakers', qty: 50, costPrice: 30.0, total: 1500.0 },
      { productName: 'Slim Fit Denim Jeans', qty: 30, costPrice: 18.0, total: 540.0 },
    ],
    notes: 'Shipment delivered in good condition.',
    refNo: 'REF-TX-8820',
  },
  {
    invoiceNo: '#PINV-1003',
    supplierName: 'Elegant Dress Wholesalers',
    invoiceDate: '2026-05-25',
    dueDate: '2026-05-25',
    itemsCount: 25,
    totalAmount: 1250.0,
    paidAmount: 1250.0,
    remainingAmount: 0.0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    deliveryStatus: 'Delivered',
    items: [{ productName: 'Elegant Evening Dress', qty: 25, costPrice: 45.0, total: 1125.0 }],
    notes: 'Paid fully in Cash.',
    refNo: 'REF-EDW-0045',
  },
];

type Props = {
  initialSubTab?: string;
  lang?: 'en' | 'ar';
  onExit?: () => void;
  onSubTabChange?: (tab: string) => void;
};

function normalizeSubTab(tab?: string): PurchasesSubTabId {
  if (tab && PURCHASES_SUBMENUS.some((s) => s.id === tab)) {
    return tab as PurchasesSubTabId;
  }
  return 'purchase-invoices';
}

export default function PurchasesCanvasApp({
  initialSubTab,
  lang: langProp = 'ar',
  onSubTabChange,
}: Props) {
  const [lang, setLang] = useState<'en' | 'ar'>(langProp);
  const [activeSubTab, setActiveSubTab] = useState<string>(normalizeSubTab(initialSubTab));
  const [toast, setToast] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [treasury, setTreasury] = useState(8420.5);
  const [bankBalance, setBankBalance] = useState(15200);
  const [activities, setActivities] = useState<RecentActivity[]>(initialActivities);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(initialPurchaseInvoices);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(initialPurchaseReturns);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [shippingCompanies, setShippingCompanies] =
    useState<ShippingCompany[]>(initialShippingCompanies);

  useEffect(() => {
    setActiveSubTab(normalizeSubTab(initialSubTab));
  }, [initialSubTab]);

  useEffect(() => {
    setLang(langProp);
  }, [langProp]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const showStateToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const selectSubTab = (id: string) => {
    setActiveSubTab(id);
    onSubTabChange?.(id);
  };

  return (
    <div
      className="h-[100svh] w-full overflow-y-auto bg-slate-50 font-sans p-3 sm:p-5"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <PurchasesTab
        lang={lang}
        activeSubTab={activeSubTab}
        setActiveSubTab={selectSubTab}
        products={products}
        setProducts={setProducts}
        treasury={treasury}
        setTreasury={setTreasury}
        bankBalance={bankBalance}
        setBankBalance={setBankBalance}
        activities={activities}
        setActivities={setActivities}
        showStateToast={showStateToast}
        purchaseInvoices={purchaseInvoices}
        setPurchaseInvoices={setPurchaseInvoices}
        purchaseReturns={purchaseReturns}
        setPurchaseReturns={setPurchaseReturns}
        purchaseOrders={purchaseOrders}
        setPurchaseOrders={setPurchaseOrders}
        groups={[]}
        shippingCompanies={shippingCompanies}
        setShippingCompanies={setShippingCompanies}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-[#0a1945] px-4 py-2.5 text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
