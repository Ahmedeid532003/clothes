import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, RotateCcw, ClipboardList, Bell } from 'lucide-react';
import { Product, RecentActivity } from '../mockData';
import { PurchaseInvoicesTab, PurchaseInvoice } from './PurchaseInvoicesTab';
import { PurchaseReturnsTab, PurchaseReturn } from './PurchaseReturnsTab';
import { PurchaseOrdersTab, PurchaseOrder } from './PurchaseOrdersTab';
import { PurchaseAlertsTab } from './PurchaseAlertsTab';
import { ShippingCompaniesTab, ShippingCompany } from './ShippingCompaniesTab';
import { PurchaseReportsTab } from './PurchaseReportsTab';

interface PurchasesTabProps {
  lang: 'en' | 'ar';
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  treasury: number;
  setTreasury: React.Dispatch<React.SetStateAction<number>>;
  bankBalance: number;
  setBankBalance: React.Dispatch<React.SetStateAction<number>>;
  activities: RecentActivity[];
  setActivities: React.Dispatch<React.SetStateAction<RecentActivity[]>>;
  showStateToast: (msg: string) => void;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  purchaseReturns: PurchaseReturn[];
  setPurchaseReturns: React.Dispatch<React.SetStateAction<PurchaseReturn[]>>;
  purchaseOrders?: PurchaseOrder[];
  setPurchaseOrders?: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  groups?: any[];
  shippingCompanies?: ShippingCompany[];
  setShippingCompanies?: React.Dispatch<React.SetStateAction<ShippingCompany[]>>;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = (props) => {
  const { lang, activeSubTab = 'purchase-invoices' } = props;

  // Render content based on activeSubTab
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        {(activeSubTab === 'purchase-invoices' || activeSubTab === '') && (
          <PurchaseInvoicesTab {...props} />
        )}
        
        {activeSubTab === 'purchase-returns' && (
          <PurchaseReturnsTab {...props} />
        )}

        {activeSubTab === 'purchase-orders' && (
          <PurchaseOrdersTab
              lang={lang}
              products={props.products}
              purchaseOrders={props.purchaseOrders || []}
              setPurchaseOrders={props.setPurchaseOrders || (() => {})}
              groups={props.groups || []}
           />
        )}

        {activeSubTab === 'purchase-alerts' && (
          <PurchaseAlertsTab
              lang={lang}
              products={props.products}
              purchaseOrders={props.purchaseOrders || []}
              setPurchaseOrders={props.setPurchaseOrders || (() => {})}
           />
        )}

        {activeSubTab === 'shipping-companies' && (
          <ShippingCompaniesTab
              lang={lang}
              shippingCompanies={props.shippingCompanies || []}
              setShippingCompanies={props.setShippingCompanies || (() => {})}
           />
        )}

        {activeSubTab === 'purchase-reports' && (
          <PurchaseReportsTab lang={lang} products={props.products} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export type { PurchaseItem, PurchaseInvoice } from './PurchaseInvoicesTab';
export type { PurchaseReturn } from './PurchaseReturnsTab';
export type { PurchaseOrder } from './PurchaseOrdersTab';
