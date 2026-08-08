/**
 * Host-only shell for original suppliers module.
 * Tab components under suppliers-v13 are verbatim zip copies — not modified.
 * When embed/hideChrome: content only (ERP icon rail stays outside) — same as products.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { initialProducts, type Product } from './mockData';
import { initialSuppliers } from './initialSuppliers';
import { SupplierCategoriesTab } from './components/SupplierCategoriesTab';
import {
  SupplierDataTab,
  type SupplierItem,
} from './components/SupplierDataTab';
import { SaleDiscountNoteTab } from './components/SaleDiscountNoteTab';
import { SupplierDiscountNoteTab } from './components/SupplierDiscountNoteTab';
import { SupplierPaymentNotesTab } from './components/SupplierPaymentNotesTab';
import { SupplierReportsTab } from './components/SupplierReportsTab';

export const SUPPLIERS_SUBMENUS = [
  {
    id: 'supplier-categories',
    labelEn: 'Supplier Classifications',
    labelAr: 'تصنيفات الموردين',
  },
  { id: 'supplier-data', labelEn: 'Supplier Data', labelAr: 'بيانات الموردين' },
  {
    id: 'sale-discount-note',
    labelEn: 'Sale Discount Note',
    labelAr: 'اشعار خصم اوكازيون',
  },
  {
    id: 'supplier-discount-note',
    labelEn: 'Discount Note from Supplier',
    labelAr: 'اشعار خصم من مورد',
  },
  {
    id: 'supplier-payments',
    labelEn: 'Supplier Payment Permits',
    labelAr: 'اذون دفع موردين',
  },
  {
    id: 'supplier-reports',
    labelEn: 'Supplier Reports',
    labelAr: 'تقارير الموردين',
  },
] as const;

export type SuppliersSubTabId = (typeof SUPPLIERS_SUBMENUS)[number]['id'];

const SUPPLIER_GROUPS = [
  { id: 'grp-1', nameAr: 'امانات', nameEn: 'Consignments' },
  { id: 'grp-2', nameAr: 'اجل ومرتجعات بمواعيد', nameEn: 'Credit & Returns with dates' },
  { id: 'grp-3', nameAr: 'نقدى', nameEn: 'Cash' },
  { id: 'grp-4', nameAr: 'اجل بدون مرتجعات', nameEn: 'Credit without returns' },
];

type Props = {
  lang: 'en' | 'ar';
  initialSubTab: string;
  onSubTabChange: (tab: string) => void;
  /** When true: no original App sidebar/header — ERP rail handles navigation (product pattern). */
  hideChrome?: boolean;
};

export default function SuppliersCanvasApp({
  lang,
  initialSubTab,
  onSubTabChange: _onSubTabChange,
  hideChrome = true,
}: Props) {
  const valid = useMemo(
    () => new Set<string>(SUPPLIERS_SUBMENUS.map((s) => s.id)),
    [],
  );
  const [activeSubTab, setActiveSubTab] = useState<string>(
    valid.has(initialSubTab) ? initialSubTab : 'supplier-data',
  );
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(
    initialSuppliers as unknown as SupplierItem[],
  );
  const [products] = useState<Product[]>(initialProducts);

  useEffect(() => {
    if (valid.has(initialSubTab) && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, valid, activeSubTab]);

  const content = (() => {
    switch (activeSubTab) {
      case 'supplier-categories':
        return <SupplierCategoriesTab lang={lang} />;
      case 'supplier-data':
        return (
          <SupplierDataTab
            lang={lang}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            groups={SUPPLIER_GROUPS}
          />
        );
      case 'sale-discount-note':
        return (
          <SaleDiscountNoteTab
            lang={lang}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            products={products}
            groups={SUPPLIER_GROUPS}
          />
        );
      case 'supplier-discount-note':
        return (
          <SupplierDiscountNoteTab
            lang={lang}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            products={products}
            groups={SUPPLIER_GROUPS}
          />
        );
      case 'supplier-payments':
        return (
          <SupplierPaymentNotesTab
            lang={lang}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            products={products}
            groups={SUPPLIER_GROUPS}
          />
        );
      case 'supplier-reports':
        return <SupplierReportsTab lang={lang} />;
      default:
        return (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-xs flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {lang === 'ar' ? 'وحدة إدارة الموردين' : 'Supplier Management Module'}
            </h3>
          </div>
        );
    }
  })();

  if (hideChrome) {
    return (
      <div
        className="h-full min-h-0 overflow-y-auto bg-slate-50 transition-all duration-300"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="p-3 sm:p-5 space-y-6 max-w-7xl w-full mx-auto">
          {content}
        </div>
      </div>
    );
  }

  // Non-embed fallback (standalone): content only — ERP always owns the rail
  return (
    <div
      className="h-full min-h-0 overflow-y-auto bg-slate-50"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="p-3 sm:p-5 space-y-6 max-w-7xl w-full mx-auto">{content}</div>
    </div>
  );
}
