export type NavSubItem = {
  id: string;
  tab: string;
};

export type NavItem = {
  id: string;
  items: NavSubItem[];
};

export const ANALYTICS_NAV = [
  { id: 'dashboard', tab: 'dashboard' },
  { id: 'home', tab: 'home' },
] as const;

export const HR_NAV: NavItem[] = [
  {
    id: 'employees',
    items: [
      { id: 'hrJobStructure', tab: 'hr-job-structure' },
      { id: 'workShifts', tab: 'work-shifts' },
      { id: 'employeeData', tab: 'employee-data' },
      { id: 'employeeReports', tab: 'employee-reports' },
      { id: 'attendance', tab: 'attendance' },
      { id: 'attendanceImport', tab: 'attendance-import' },
      { id: 'bonusItems', tab: 'bonus-items' },
      { id: 'bonuses', tab: 'bonuses' },
      { id: 'allowances', tab: 'allowances' },
      { id: 'leaveTypes', tab: 'leave-types' },
      { id: 'leaves', tab: 'leaves' },
      { id: 'employeeCommissions', tab: 'employee-commissions' },
      { id: 'payroll', tab: 'payroll' },
      { id: 'paymentAuthTypes', tab: 'payment-auth-types' },
      { id: 'payrollPayments', tab: 'payroll-payments' },
    ],
  },
];

/** عناصر إدارة المنتجات — تظهر داخل قسم قابل للطي (مثل الموردين). */
export const PRODUCT_MANAGEMENT_NAV: NavSubItem[] = [
  { id: 'warehouses', tab: 'warehouses' },
  { id: 'seasons', tab: 'seasons' },
  { id: 'stockTransfers', tab: 'stock-transfers' },
  { id: 'stockDisbursements', tab: 'stock-disbursements' },
  { id: 'stockAdditions', tab: 'stock-additions' },
  { id: 'stockScrap', tab: 'stock-scrap' },
  { id: 'stockBalances', tab: 'stock-balances' },
  { id: 'stockValuation', tab: 'stock-valuation' },
  { id: 'stockCount', tab: 'stock-count' },
  { id: 'products', tab: 'products' },
  { id: 'compositeProducts', tab: 'composite-products' },
  { id: 'productSections', tab: 'product-sections' },
  { id: 'brands', tab: 'brands' },
  { id: 'classifications', tab: 'classifications' },
  { id: 'sizes', tab: 'sizes' },
  { id: 'colors', tab: 'colors' },
  { id: 'priceAdjustments', tab: 'price-adjustments' },
  { id: 'barcodePrint', tab: 'barcode-print' },
];

/** إدارة المنتجات — مجموعة واحدة قابلة للطي في الشريط الجانبي */
export const PRODUCT_NAV: NavItem[] = [
  { id: 'productManagement', items: PRODUCT_MANAGEMENT_NAV },
];

/** @deprecated استخدم PRODUCT_NAV */
export const INVENTORY_NAV: NavItem[] = PRODUCT_NAV;

/** @deprecated use ERP_NAV */
export const ERP_PURCHASES_NAV: NavItem[] = [];

/** POS = plan branches only (switch via TeamSwitcher); no separate POS points. */
export const POS_NAV: NavItem[] = [
  {
    id: 'pos',
    items: [
      { id: 'posScreen', tab: 'pos' },
      { id: 'posBarcode', tab: 'pos-barcode' },
    ],
  },
];

export const ACCOUNTING_NAV: NavItem[] = [
  {
    id: 'accountingCore',
    items: [
      { id: 'chartOfAccounts', tab: 'chart-of-accounts' },
      { id: 'currencies', tab: 'currencies' },
      { id: 'assetDepreciation', tab: 'asset-depreciation' },
    ],
  },
  {
    id: 'financialReports',
    items: [
      { id: 'journalEntries', tab: 'journal-entries' },
      { id: 'trialBalance', tab: 'trial-balance' },
      { id: 'balanceSheet', tab: 'balance-sheet' },
      { id: 'incomeStatement', tab: 'income-statement' },
      { id: 'generalLedger', tab: 'general-ledger' },
    ],
  },
  {
    id: 'expenses',
    items: [
      { id: 'generalExpenses', tab: 'general-expenses' },
      { id: 'payrollAdvances', tab: 'payroll-advances' },
      { id: 'paymentCheques', tab: 'payment-cheques' },
      { id: 'cashShifts', tab: 'cash-shifts' },
      { id: 'shiftHandovers', tab: 'shift-handovers' },
      { id: 'treasuryMovements', tab: 'treasury-movements' },
      { id: 'pendingShifts', tab: 'pending-shifts' },
      { id: 'enterpriseCashBalances', tab: 'enterprise-cash-balances' },
    ],
  },
  {
    id: 'banking',
    items: [
      { id: 'banks', tab: 'banks' },
      { id: 'bankAccounts', tab: 'bank-accounts' },
      { id: 'cheques', tab: 'cheques' },
      { id: 'cardTransactions', tab: 'card-transactions' },
      { id: 'eWallets', tab: 'e-wallets' },
      { id: 'bankingStatements', tab: 'banking-statements' },
      { id: 'paymentMethodsDashboard', tab: 'payment-methods-dashboard' },
    ],
  },
];

export const CRM_NAV: NavItem[] = [
  {
    id: 'customers',
    items: [
      { id: 'customerDashboard', tab: 'customer-dashboard' },
      { id: 'customerTypes', tab: 'customer-types' },
      { id: 'customerGroups', tab: 'customer-groups' },
      { id: 'customersList', tab: 'customers' },
      { id: 'customerAccounts', tab: 'customer-accounts' },
      { id: 'customerArrears', tab: 'customer-arrears' },
      { id: 'customerInstallments', tab: 'customer-installments' },
      { id: 'installmentCollection', tab: 'installment-collection' },
      { id: 'installmentFollowUp', tab: 'installment-follow-up' },
      { id: 'customerConsignment', tab: 'customer-consignment' },
      { id: 'customerStockCount', tab: 'customer-stock-count' },
    ],
  },
];

export const ERP_NAV: NavItem[] = [
  {
    id: 'sales',
    items: [
      { id: 'scanOrders', tab: 'scan-orders' },
      { id: 'salesInvoices', tab: 'sales-invoices' },
      { id: 'salesReturns', tab: 'sales-returns' },
      { id: 'taxInvoices', tab: 'tax-invoices' },
      { id: 'salesQuotations', tab: 'sales-quotations' },
      { id: 'customerReservations', tab: 'customer-reservations' },
      { id: 'sellerPerformance', tab: 'seller-performance' },
    ],
  },
  {
    id: 'suppliers',
    items: [
      { id: 'supplierPayments', tab: 'supplier-payments' },
      { id: 'supplierTypes', tab: 'supplier-types' },
      { id: 'supplierGroups', tab: 'supplier-groups' },
      { id: 'suppliers', tab: 'suppliers' },
      { id: 'supplierWeeklyReports', tab: 'supplier-weekly-reports' },
      { id: 'generalItemMovement', tab: 'general-item-movement' },
      { id: 'supplierInventories', tab: 'supplier-inventories' },
      { id: 'supplierAccounts', tab: 'supplier-accounts' },
      { id: 'supplierDiscounts', tab: 'supplier-discounts' },
      { id: 'storeDiscounts', tab: 'store-discounts' },
    ],
  },
  {
    id: 'purchases',
    items: [
      { id: 'purchasesWorkspace', tab: 'purchase-invoices' },
      { id: 'purchaseReturnInvoices', tab: 'purchase-return-invoices' },
    ],
  },
];
