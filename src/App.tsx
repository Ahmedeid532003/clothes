import React, { useEffect, useMemo, useState } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardHome } from "@/components/dashboard/Home";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { DashboardMain } from "@/components/dashboard/DashboardMain";
import { HrDepartmentsPage } from "@/components/hr/HrDepartmentsPage";
import { HrJobStructurePage } from "@/components/hr/HrJobStructurePage";
import { HrSectionsPage } from "@/components/hr/HrSectionsPage";
import { WorkShiftsPage } from "@/components/hr/WorkShiftsPage";
import { JobTitlesPage } from "@/components/hr/JobTitlesPage";
import { EmployeeGroupsPage } from "@/components/hr/EmployeeGroupsPage";
import { EmployeeDataPage } from "@/components/hr/EmployeeDataPage";
import { DeductionItemsPage } from "@/components/hr/DeductionItemsPage";
import { RewardsDeductionsPage } from "@/components/hr/rewards-deductions/RewardsDeductionsPage";
import { AllowanceItemsPage } from "@/components/hr/AllowanceItemsPage";
import { OfficialHolidaysPage } from "@/components/hr/OfficialHolidaysPage";
import { AttendancePage } from "@/components/hr/AttendancePage";
import { CommissionsPage } from "@/components/hr/CommissionsPage";
import { EmployeeReportsPage } from "@/components/hr/EmployeeReportsPage";
import { PayrollSheetPage } from "@/components/hr/PayrollSheetPage";
import { PurchaseInvoicesPage } from "@/components/purchases/PurchaseInvoicesPage";
import { PosGalleryPage } from "@/components/pos/PosGalleryPage";
import { PosBarcodePage } from "@/components/pos/PosBarcodePage";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { ThemeModeControls } from "@/components/theme-mode-controls";
import { TenantAppLayout } from "@/components/layout/TenantAppLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { entityName } from "@/lib/entity-name";
import { canViewPage, firstAllowedTab } from "@/lib/permissions/access";
import { ACCOUNTING_NAV, ANALYTICS_NAV, CRM_NAV, ERP_NAV, HR_NAV, POS_NAV, PRODUCT_MANAGEMENT_NAV } from "@/lib/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  Star,
  UserCircle,
} from "lucide-react";
import { CustomerTypesPage } from "@/components/customers/CustomerTypesPage";
import { CustomerGroupsPage } from "@/components/customers/CustomerGroupsPage";
import { CustomersPage } from "@/components/customers/CustomersPage";
import { CustomerCrmDashboardPage } from "@/components/customers/CustomerCrmDashboardPage";
import { CustomerArrearsPage } from "@/components/customers/CustomerArrearsPage";
import { CustomerAccountStatementPage } from "@/components/customers/CustomerAccountStatementPage";
import { InstallmentsHubPage } from "@/components/customers/InstallmentsHubPage";
import { ConsignmentHubPage } from "@/components/customers/ConsignmentHubPage";
import { CustomerStockCountPage } from "@/components/customers/CustomerStockCountPage";
import { GeneralExpensesPage } from "@/components/accounting/GeneralExpensesPage";
import { PayrollAdvancesPage } from "@/components/accounting/PayrollAdvancesPage";
import { PaymentChequesTrackingPage } from "@/components/accounting/PaymentChequesTrackingPage";
import { CashShiftsPage } from "@/components/accounting/CashShiftsPage";
import { EnterpriseCashBalancesPage } from "@/components/accounting/EnterpriseCashBalancesPage";
import { ShiftHandoversPage } from "@/components/accounting/ShiftHandoversPage";
import { TreasuryMovementsPage } from "@/components/accounting/TreasuryMovementsPage";
import { PendingShiftsPage } from "@/components/accounting/PendingShiftsPage";
import { ChartOfAccountsPage } from "@/components/accounting/ChartOfAccountsPage";
import { CurrenciesPage } from "@/components/accounting/CurrenciesPage";
import { AssetDepreciationPage } from "@/components/accounting/AssetDepreciationPage";
import { ExpensesHub } from "@/components/accounting/ExpensesHub";
import { BanksPage } from "@/components/banking/BanksPage";
import { BankAccountsPage } from "@/components/banking/BankAccountsPage";
import { ChequesPage } from "@/components/banking/ChequesPage";
import { CardTransactionsPage } from "@/components/banking/CardTransactionsPage";
import { EWalletsPage } from "@/components/banking/EWalletsPage";
import { BankingStatementsPage } from "@/components/banking/BankingStatementsPage";
import { PaymentMethodsDashboardPage } from "@/components/banking/PaymentMethodsDashboardPage";
import { JournalEntriesPage } from "@/components/accounting/JournalEntriesPage";
import {
  TrialBalancePage,
  BalanceSheetPage,
  IncomeStatementPage,
  GeneralLedgerPage,
} from "@/components/accounting/FinancialReportsPages";
import {
  BrandsPage,
  ClassificationsPage,
  ColorsPage,
  ProductSectionsPage,
  SizesPage,
  SupplierGroupsPage,
  SupplierTypesPage,
} from "@/components/inventory/InventoryPages";
import { WarehousesPage } from "@/components/inventory/WarehousesPage";
import { ProductsPage } from "@/components/inventory/ProductsPage";
import { StockBalancesPage } from "@/components/inventory/StockBalancesPage";
import { SeasonsPage } from "@/components/inventory/SeasonsPage";
import { SuppliersPage } from "@/components/inventory/SuppliersPage";
import { StockTransfersPage } from "@/components/inventory/StockTransfersPage";
import { StockScrapPage } from "@/components/inventory/StockScrapPage";
import { StockDisbursementPage } from "@/components/inventory/StockDisbursementPage";
import { StockAdditionPage } from "@/components/inventory/StockAdditionPage";
import { StockValuationPage } from "@/components/inventory/StockValuationPage";
import { StockCountPage } from "@/components/inventory/StockCountPage";
import { OrdersHubPage } from "@/components/orders/OrdersHubPage";
import { SupplierGroupInventoryPage } from "@/components/inventory/SupplierGroupInventoryPage";
import { CompositeProductsPage } from "@/components/inventory/CompositeProductsPage";
import { PriceAdjustmentsPage } from "@/components/inventory/PriceAdjustmentsPage";
import { OkazionNoticeHubPage } from "@/components/inventory/OkazionNoticeHubPage";
import { StoreOfferHubPage } from "@/components/inventory/StoreOfferHubPage";
import { BarcodePrintPage } from "@/components/inventory/BarcodePrintPage";
import { SupplierAccountsPage } from "@/components/inventory/SupplierAccountsPage";
import { SupplierPaymentsPage } from "@/components/suppliers/SupplierPaymentsPage";
import { SupplierWeeklyReportsPage } from "@/components/suppliers/SupplierWeeklyReportsPage";
import { GeneralItemMovementReportPage } from "@/components/reports/GeneralItemMovementReportPage";
import { ReorderAlertsPage } from "@/components/purchases/ReorderAlertsPage";
import { PurchaseOrdersPage } from "@/components/purchases/PurchaseOrdersPage";
import { PurchasesHub } from "@/components/purchases/PurchasesHub";
import { SalesInvoicesPage } from "@/components/sales/SalesInvoicesPage";
import { SalesReturnsPage } from "@/components/sales/SalesReturnsPage";
import { TaxInvoicesPage } from "@/components/sales/TaxInvoicesPage";
import { CustomerReservationsPage, SalesQuotationsPage } from "@/components/sales/DraftSalesDocuments";
import { InstallmentCollectionPage } from "@/components/sales/InstallmentCollectionPage";
import { InstallmentFollowUpPage } from "@/components/customers/InstallmentFollowUpPage";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SellerPerformancePage } from "@/components/reports/SellerPerformancePage";

const TAB_ORDER = [
  ...ANALYTICS_NAV.map((n) => n.tab),
  ...PRODUCT_MANAGEMENT_NAV.map((i) => i.tab),
  ...ERP_NAV.flatMap((g) => g.items.map((i) => i.tab)),
  ...ACCOUNTING_NAV.flatMap((g) => g.items.map((i) => i.tab)),
  ...POS_NAV.flatMap((g) => g.items.map((i) => i.tab)),
  'departments',
];

type PriceAdjustScope = 'card' | 'supplier';

type NavigateDetail = string | { tab: string; priceAdjustScope?: PriceAdjustScope };

type ShellNavItem = {
  id: string;
  tab: string;
  label: string;
  group: string;
};

type ModuleKey =
  | 'hr'
  | 'employees'
  | 'attendance'
  | 'payroll'
  | 'crm'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'accounting'
  | 'reports'
  | 'settings'
  | 'dashboard';

type ModuleContext = {
  key: ModuleKey;
  title: string;
  description: string;
  activePageLabel: string;
  relatedPages: { tab: string; label: string }[];
};

function navigateTo(tab: string) {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: tab }));
}

function getStoredFavorites() {
  try {
    const raw = localStorage.getItem('mahaly_favorite_tabs');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function moduleKeyForTab(tab: string): ModuleKey {
  if (tab === 'profile') return 'settings';
  if (tab === 'dashboard' || tab === 'home') return 'dashboard';
  if (['hr-job-structure', 'departments', 'hr-sections', 'work-shifts', 'job-titles', 'employee-groups', 'employee-data', 'employee-reports', 'create-users'].includes(tab)) return 'employees';
  if (['attendance', 'attendance-import', 'official-holidays'].includes(tab)) return 'attendance';
  if (['bonuses', 'deduction-items', 'deductions', 'allowance-items', 'employee-commissions', 'payroll', 'payment-auth-types', 'payroll-payments'].includes(tab)) return 'payroll';
  if (tab.startsWith('customer-') || tab === 'customers' || tab === 'installment-collection') return 'crm';
  if (['sales-invoices', 'sales-returns', 'tax-invoices', 'sales-quotations', 'customer-reservations', 'seller-performance', 'pos', 'pos-barcode', 'scan-orders'].includes(tab)) return 'sales';
  if (['purchase-invoices', 'purchase-return-invoices', 'reorder-alerts', 'purchase-orders', 'supplier-payments'].includes(tab)) return 'purchases';
  if (['chart-of-accounts', 'currencies', 'asset-depreciation', 'general-expenses', 'payroll-advances', 'expense-types', 'expense-vouchers', 'cash-shifts', 'shift-handovers', 'treasury-movements', 'pending-shifts', 'enterprise-cash-balances', 'banks', 'bank-accounts', 'cheques', 'card-transactions', 'e-wallets', 'banking-statements', 'payment-methods-dashboard'].includes(tab)) return 'accounting';
  if (['journal-entries', 'trial-balance', 'balance-sheet', 'income-statement', 'general-ledger'].includes(tab)) return 'reports';
  if (['warehouses', 'seasons', 'stock-transfers', 'stock-disbursements', 'stock-additions', 'stock-scrap', 'stock-balances', 'stock-valuation', 'stock-count', 'products', 'composite-products', 'product-sections', 'brands', 'classifications', 'sizes', 'colors', 'price-adjustments', 'barcode-print', 'suppliers', 'supplier-inventories', 'supplier-weekly-reports', 'supplier-accounts', 'supplier-discounts', 'store-discounts', 'supplier-types', 'supplier-groups'].includes(tab)) return 'inventory';
  return 'hr';
}

function moduleCopy(key: ModuleKey, isRtl: boolean) {
  const copy: Record<ModuleKey, { title: string; description: string }> = {
    dashboard: {
      title: isRtl ? 'الرؤية التنفيذية' : 'Executive Dashboard',
      description: isRtl ? 'مؤشرات ومهام وتنبيهات المنشأة في مساحة قيادة واحدة.' : 'KPI, tasks, alerts, and executive visibility in one command space.',
    },
    hr: {
      title: isRtl ? 'الموارد البشرية' : 'Human Resources',
      description: isRtl ? 'تصميم موحد لعمليات شؤون العاملين والتحكم الإداري.' : 'Unified workspace for HR operations and workforce governance.',
    },
    employees: {
      title: isRtl ? 'الموظفون والهيكل' : 'Employees & Structure',
      description: isRtl ? 'إدارة الموظفين، الإدارات، الأقسام، المسميات، والشيفتات بنمط ERP واضح.' : 'Manage employees, departments, sections, titles, and shifts with ERP clarity.',
    },
    attendance: {
      title: isRtl ? 'الحضور والانصراف' : 'Attendance Operations',
      description: isRtl ? 'متابعة الحضور، الإجازات، الاستيراد، والاستثناءات من واجهة تشغيلية واحدة.' : 'Track attendance, leaves, imports, and exceptions from one operational view.',
    },
    payroll: {
      title: isRtl ? 'الرواتب والاستحقاقات' : 'Payroll & Compensation',
      description: isRtl ? 'مركز احترافي للرواتب، المكافآت، الخصومات، البدلات، والعمولات.' : 'Professional hub for payroll, bonuses, deductions, allowances, and commissions.',
    },
    crm: {
      title: isRtl ? 'إدارة العملاء CRM' : 'Customer CRM',
      description: isRtl ? 'رحلة العميل، التحصيل، الأقساط، المديونيات، والتفاعل التجاري.' : 'Customer journey, collections, installments, arrears, and commercial engagement.',
    },
    sales: {
      title: isRtl ? 'المبيعات ونقاط البيع' : 'Sales & POS',
      description: isRtl ? 'فواتير، مرتجعات، عروض أسعار، حجوزات، وفواتير ضريبية بتجربة سريعة.' : 'Invoices, returns, quotations, reservations, tax documents, and POS execution.',
    },
    purchases: {
      title: isRtl ? 'المشتريات والموردون' : 'Purchases & Suppliers',
      description: isRtl ? 'فواتير شراء، مرتجعات، مدفوعات موردين، وتحكم كامل بدورة التوريد.' : 'Purchase invoices, returns, supplier payments, and procurement control.',
    },
    inventory: {
      title: isRtl ? 'المخزون والمنتجات' : 'Inventory & Products',
      description: isRtl ? 'المستودعات، المنتجات، الأرصدة، التحويلات، الجرد، والباركود.' : 'Warehouses, products, balances, transfers, counts, valuation, and barcode flows.',
    },
    accounting: {
      title: isRtl ? 'الحسابات والخزائن' : 'Accounting & Treasury',
      description: isRtl ? 'شجرة الحسابات، المصروفات، الخزائن، البنوك، المحافظ، والشيكات.' : 'Chart of accounts, expenses, shifts, banks, wallets, cards, and cheques.',
    },
    reports: {
      title: isRtl ? 'التقارير المالية' : 'Financial Reports',
      description: isRtl ? 'قيود، ميزان مراجعة، أستاذ عام، قائمة دخل، ومركز مالي.' : 'Journals, trial balance, general ledger, income statement, and balance sheet.',
    },
    settings: {
      title: isRtl ? 'الإعدادات والحساب' : 'Settings & Account',
      description: isRtl ? 'إعدادات المستخدم، الصلاحيات، وسلوك الواجهة.' : 'User profile, preferences, permissions, and interface behavior.',
    },
  };
  return copy[key];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [priceAdjustScope, setPriceAdjustScope] = useState<PriceAdjustScope | undefined>();
  const [favoriteTabs, setFavoriteTabs] = useState<string[]>(getStoredFavorites);
  const { t, dir, isRtl } = useLanguage();
  const { user, tenant, branches, activeBranchId, loading, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'profile') return;
    if (!canViewPage(user, activeTab)) {
      const fallback = firstAllowedTab(user, TAB_ORDER) ?? 'home';
      setActiveTab(fallback);
    }
  }, [user, activeTab]);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<NavigateDetail>).detail;
      if (typeof detail === 'string') {
        setActiveTab(detail === 'create-users' ? 'employee-data' : detail);
        return;
      }
      if (detail?.tab) {
        setActiveTab(detail.tab === 'create-users' ? 'employee-data' : detail.tab);
        if (detail.priceAdjustScope) setPriceAdjustScope(detail.priceAdjustScope);
      }
    };
    window.addEventListener('app:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('app:navigate', onNavigate as EventListener);
  }, []);

  useEffect(() => {
    localStorage.setItem('mahaly_favorite_tabs', JSON.stringify(favoriteTabs));
  }, [favoriteTabs]);

  const shellNavItems = useMemo<ShellNavItem[]>(() => {
    const groupedItems = [
      ...HR_NAV,
      ...ERP_NAV,
      ...ACCOUNTING_NAV,
      ...POS_NAV,
      ...CRM_NAV,
      { id: 'productManagement', items: PRODUCT_MANAGEMENT_NAV },
    ];

    const analytics = ANALYTICS_NAV.map((item) => ({
      id: item.id,
      tab: item.tab,
      label: t(`nav.${item.id}`),
      group: t('nav.analytics'),
    }));

    const modules = groupedItems.flatMap((group) =>
      group.items.map((item) => ({
        id: item.id,
        tab: item.tab,
        label: t(`nav.${item.id}`),
        group: t(`nav.${group.id}`),
      })),
    );

    return [...analytics, ...modules].filter((item) => !user || canViewPage(user, item.tab));
  }, [t, user]);

  const activeNavItem = useMemo(() => {
    if (activeTab === 'profile') {
      return {
        id: 'profile',
        tab: 'profile',
        label: isRtl ? 'الملف الشخصي' : 'Profile',
        group: isRtl ? 'إعدادات الحساب' : 'Account',
      };
    }
    return shellNavItems.find((item) => item.tab === activeTab) ?? {
      id: activeTab,
      tab: activeTab,
      label: t('app.name'),
      group: isRtl ? 'النظام' : 'System',
    };
  }, [activeTab, isRtl, shellNavItems, t]);

  const activeModuleKey = moduleKeyForTab(activeTab);
  const moduleContext = useMemo<ModuleContext>(() => {
    const copy = moduleCopy(activeModuleKey, isRtl);
    const relatedPages = shellNavItems
      .filter((item) => moduleKeyForTab(item.tab) === activeModuleKey)
      .slice(0, 12)
      .map((item) => ({ tab: item.tab, label: item.label }));

    return {
      key: activeModuleKey,
      title: copy.title,
      description: copy.description,
      activePageLabel: activeNavItem.label,
      relatedPages,
    };
  }, [activeModuleKey, activeNavItem.label, isRtl, shellNavItems]);

  const favoriteItems = useMemo(
    () => favoriteTabs
      .map((tab) => shellNavItems.find((item) => item.tab === tab))
      .filter((item): item is ShellNavItem => Boolean(item)),
    [favoriteTabs, shellNavItems],
  );

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const branchName = activeBranch
    ? entityName(activeBranch)
    : isRtl ? 'كل الفروع' : 'All Branches';
  const isFavorite = favoriteTabs.includes(activeTab);
  const shellCopy = {
    searchPlaceholder: isRtl ? 'بحث عام في الشاشات والعمليات...' : 'Search pages and workflows...',
    quickActions: isRtl ? 'إجراءات سريعة' : 'Quick actions',
    favorites: isRtl ? 'المفضلة' : 'Favorites',
    notifications: isRtl ? 'مركز التنبيهات' : 'Notification center',
    profile: isRtl ? 'حساب المستخدم' : 'User profile',
    workspace: isRtl ? 'مساحة العمل' : 'Workspace',
    currentBranch: isRtl ? 'الفرع الحالي' : 'Active branch',
    addFavorite: isRtl ? 'إضافة للمفضلة' : 'Add favorite',
    removeFavorite: isRtl ? 'إزالة من المفضلة' : 'Remove favorite',
    noFavorites: isRtl ? 'لم تضف شاشات مفضلة بعد' : 'No favorites yet',
    noResults: isRtl ? 'لا توجد نتائج بحث' : 'No search results',
  };

  const toggleFavorite = () => {
    const removing = favoriteTabs.includes(activeTab);
    setFavoriteTabs((current) =>
      current.includes(activeTab)
        ? current.filter((tab) => tab !== activeTab)
        : [activeTab, ...current].slice(0, 8),
    );
    showPremiumToast({
      tone: removing ? 'info' : 'success',
      title: removing
        ? (isRtl ? 'تمت إزالة الصفحة من المفضلة' : 'Removed from favorites')
        : (isRtl ? 'تمت إضافة الصفحة للمفضلة' : 'Added to favorites'),
      description: activeNavItem.label,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100" role="status">
        <p className="text-slate-500">{t('auth.signingIn')}</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (activeTab === 'profile') {
      return <ProfilePage onBack={() => setActiveTab('home')} />;
    }
    if (!canViewPage(user, activeTab)) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">{t('app.noAccessTitle')}</p>
          <p className="text-sm mt-1">{t('app.noAccessDesc')}</p>
        </div>
      );
    }
    switch (activeTab) {
      case 'home':
        return <DashboardHome />;
      case 'dashboard':
        return <DashboardMain />;
      case 'create-users':
        return <EmployeeDataPage />;
      case 'hr-job-structure':
        return <HrJobStructurePage />;
      case 'departments':
        return <HrDepartmentsPage />;
      case 'hr-sections':
        return <HrSectionsPage />;
      case 'work-shifts':
        return <WorkShiftsPage />;
      case 'job-titles':
        return <JobTitlesPage />;
      case 'employee-groups':
        return <EmployeeGroupsPage />;
      case 'employee-data':
        return <EmployeeDataPage />;
      case 'employee-reports':
        return <EmployeeReportsPage />;
      case 'bonuses':
      case 'deductions':
        return <RewardsDeductionsPage />;
      case 'deduction-items':
        return <DeductionItemsPage />;
      case 'allowance-items':
        return <AllowanceItemsPage />;
      case 'official-holidays':
        return <OfficialHolidaysPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'attendance-import':
        return <AttendancePage defaultImportOpen />;
      case 'employee-commissions':
        return <CommissionsPage />;
      case 'payroll':
        return <PayrollSheetPage />;
      case 'payment-auth-types':
      case 'payroll-payments':
        return <RewardsDeductionsPage />;
      case 'reorder-alerts':
      case 'purchase-orders':
      case 'purchase-invoices':
        return (
          <PurchasesHub activeTab={activeTab}>
            {activeTab === 'reorder-alerts' ? <ReorderAlertsPage embedded /> : null}
            {activeTab === 'purchase-orders' ? <PurchaseOrdersPage embedded /> : null}
            {activeTab === 'purchase-invoices' ? (
              <PurchaseInvoicesPage invoiceType="purchase" embedded />
            ) : null}
          </PurchasesHub>
        );
      case 'purchase-return-invoices':
        return <PurchaseInvoicesPage invoiceType="return" />;
      case 'scan-orders':
        return <OrdersHubPage />;
      case 'sales-invoices':
        return <SalesInvoicesPage />;
      case 'sales-returns':
        return <SalesReturnsPage />;
      case 'tax-invoices':
        return <TaxInvoicesPage />;
      case 'sales-quotations':
        return <SalesQuotationsPage />;
      case 'customer-reservations':
        return <CustomerReservationsPage />;
      case 'seller-performance':
        return <SellerPerformancePage />;
      case 'pos':
        return <PosGalleryPage onClose={() => setActiveTab('home')} />;
      case 'pos-barcode':
        return <PosBarcodePage onClose={() => setActiveTab('home')} />;
      case 'warehouses':
        return <WarehousesPage />;
      case 'seasons':
        return <SeasonsPage />;
      case 'product-sections':
        return <ProductSectionsPage />;
      case 'brands':
        return <BrandsPage />;
      case 'classifications':
        return <ClassificationsPage />;
      case 'sizes':
        return <SizesPage />;
      case 'colors':
        return <ColorsPage />;
      case 'products':
        return <ProductsPage />;
      case 'stock-balances':
        return <StockBalancesPage />;
      case 'stock-transfers':
        return <StockTransfersPage />;
      case 'stock-disbursements':
        return <StockDisbursementPage />;
      case 'stock-additions':
        return <StockAdditionPage />;
      case 'stock-scrap':
        return <StockScrapPage />;
      case 'stock-valuation':
        return <StockValuationPage />;
      case 'stock-count':
        return <StockCountPage />;
      case 'general-item-movement':
        return <GeneralItemMovementReportPage />;
      case 'supplier-inventories':
        return <SupplierGroupInventoryPage />;
      case 'supplier-accounts':
        return <SupplierAccountsPage />;
      case 'composite-products':
        return <CompositeProductsPage />;
      case 'supplier-payments':
        return <SupplierPaymentsPage />;
      case 'supplier-discounts':
        return <OkazionNoticeHubPage />;
      case 'store-discounts':
        return <StoreOfferHubPage />;
      case 'price-adjustments':
        return <PriceAdjustmentsPage initialScope={priceAdjustScope} />;
      case 'barcode-print':
        return <BarcodePrintPage />;
      case 'supplier-types':
        return <SupplierTypesPage />;
      case 'supplier-groups':
        return <SupplierGroupsPage />;
      case 'customer-dashboard':
        return <CustomerCrmDashboardPage />;
      case 'customer-types':
        return <CustomerTypesPage />;
      case 'customer-groups':
        return <CustomerGroupsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'customer-arrears':
        return <CustomerArrearsPage />;
      case 'customer-accounts':
        return <CustomerAccountStatementPage />;
      case 'customer-installments':
        return <InstallmentsHubPage />;
      case 'installment-collection':
        return <InstallmentCollectionPage />;
      case 'installment-follow-up':
        return <InstallmentFollowUpPage />;
      case 'customer-consignment':
        return <ConsignmentHubPage />;
      case 'customer-stock-count':
        return <CustomerStockCountPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'supplier-weekly-reports':
        return <SupplierWeeklyReportsPage />;
      case 'general-expenses':
      case 'expense-types':
      case 'expense-vouchers': {
        const expensesView = activeTab === 'expense-types' ? 'items' : 'records';
        return (
          <ExpensesHub activeTab="general-expenses">
            <GeneralExpensesPage initialView={expensesView} />
          </ExpensesHub>
        );
      }
      case 'payroll-advances':
        return (
          <ExpensesHub activeTab="payroll-advances">
            <PayrollAdvancesPage />
          </ExpensesHub>
        );
      case 'payment-cheques':
        return (
          <ExpensesHub activeTab="payment-cheques">
            <PaymentChequesTrackingPage />
          </ExpensesHub>
        );
      case 'cash-shifts':
        return (
          <ExpensesHub activeTab="cash-shifts">
            <CashShiftsPage />
          </ExpensesHub>
        );
      case 'shift-handovers':
        return (
          <ExpensesHub activeTab="shift-handovers">
            <ShiftHandoversPage />
          </ExpensesHub>
        );
      case 'treasury-movements':
        return (
          <ExpensesHub activeTab="treasury-movements">
            <TreasuryMovementsPage />
          </ExpensesHub>
        );
      case 'pending-shifts':
        return (
          <ExpensesHub activeTab="pending-shifts">
            <PendingShiftsPage />
          </ExpensesHub>
        );
      case 'enterprise-cash-balances':
        return (
          <ExpensesHub activeTab="enterprise-cash-balances">
            <EnterpriseCashBalancesPage />
          </ExpensesHub>
        );
      case 'banks':
        return <BanksPage />;
      case 'bank-accounts':
        return <BankAccountsPage />;
      case 'cheques':
        return <ChequesPage />;
      case 'card-transactions':
        return <CardTransactionsPage />;
      case 'e-wallets':
        return <EWalletsPage />;
      case 'banking-statements':
        return <BankingStatementsPage />;
      case 'payment-methods-dashboard':
        return <PaymentMethodsDashboardPage />;
      case 'chart-of-accounts':
        return <ChartOfAccountsPage />;
      case 'currencies':
        return <CurrenciesPage />;
      case 'asset-depreciation':
        return <AssetDepreciationPage />;
      case 'journal-entries':
        return <JournalEntriesPage />;
      case 'trial-balance':
        return <TrialBalancePage />;
      case 'balance-sheet':
        return <BalanceSheetPage />;
      case 'income-statement':
        return <IncomeStatementPage />;
      case 'general-ledger':
        return <GeneralLedgerPage />;
      default:
        return <DashboardHome />;
    }
  };

  const appHeader = (
    <header className="app-shell-header">
      <div className="app-topbar-primary">
        <div className="app-topbar-start" aria-hidden />

        <div className="app-topbar-actions">
          <div className="app-header-right">
            <button type="button" className="app-header-brand" onClick={() => navigateTo('home')}>
              Ma7alyErp
            </button>
            <SidebarTrigger className="app-icon-button app-split-trigger" />
          </div>

          <div className="app-header-center">
            <ThemeModeControls />

            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" className="app-icon-button app-notification-trigger" />}>
                <Bell className="h-4 w-4" />
                <span aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="app-notification-menu" align="end" sideOffset={10}>
                <DropdownMenuLabel>{shellCopy.notifications}</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4 text-blue-500" />
                    <div>
                      <strong>{isRtl ? 'النظام جاهز للعمل' : 'System ready'}</strong>
                      <span>{isRtl ? 'تم تحميل مساحة العمل بنجاح' : 'Workspace loaded successfully'}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LifeBuoy className="h-4 w-4 text-emerald-500" />
                    <div>
                      <strong>{isRtl ? 'الدعم والمتابعة' : 'Support center'}</strong>
                      <span>{isRtl ? 'تابع التذاكر والتنبيهات من هنا' : 'Track tickets and alerts here'}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" className="app-icon-button" />}>
                {isFavorite ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="app-command-menu" align="end" sideOffset={10}>
                <DropdownMenuLabel>{shellCopy.favorites}</DropdownMenuLabel>
                <DropdownMenuItem onClick={toggleFavorite}>
                  <Star className="h-4 w-4" />
                  {isFavorite ? shellCopy.removeFavorite : shellCopy.addFavorite}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {favoriteItems.length > 0 ? (
                    favoriteItems.map((item) => (
                      <DropdownMenuItem key={item.tab} onClick={() => navigateTo(item.tab)}>
                        <Bookmark className="h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>{shellCopy.noFavorites}</DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="app-header-left">
            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" className="app-profile-trigger" />}>
                <span className="app-profile-avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username || user.full_name || shellCopy.profile} />
                  ) : (
                    (user.username || user.full_name || 'U').slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className="app-profile-copy">
                  <strong>{user.username || user.full_name}</strong>
                  <small>{tenant?.name ?? shellCopy.workspace}</small>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="app-command-menu" align="end" sideOffset={10}>
                <DropdownMenuLabel>{shellCopy.profile}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                  <UserCircle className="h-4 w-4" />
                  {isRtl ? 'الملف الشخصي' : 'Profile'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4" />
                  {isRtl ? 'إعدادات الواجهة' : 'Interface settings'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  {isRtl ? 'تسجيل الخروج' : 'Logout'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <LanguageSwitcher variant="header" />
            <FullscreenToggle className="app-icon-button" />
          </div>
        </div>
      </div>

      <div className="app-page-toolbar">
        <div className="app-page-title">
          <span>{shellCopy.workspace}</span>
          <h1>{activeNavItem.label}</h1>
          <p>{activeNavItem.group} · {shellCopy.currentBranch}: {branchName}</p>
        </div>
        <div className="app-page-tools">
          <button type="button" onClick={toggleFavorite}>
            {isFavorite ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {isFavorite ? shellCopy.removeFavorite : shellCopy.addFavorite}
          </button>
          <button type="button" onClick={() => navigateTo('home')}>
            <Menu className="h-4 w-4" />
            {isRtl ? 'الرئيسية' : 'Home'}
          </button>
        </div>
      </div>
    </header>
  );

  const mainContent = (
    <TenantAppLayout header={appHeader} subscription={tenant?.subscription} pageKey={activeTab} moduleContext={moduleContext}>
      {renderContent()}
    </TenantAppLayout>
  );

  return (
    <SidebarProvider dir={dir} className="min-h-svh">
      {isRtl ? (
        <>
          <SidebarInset className="flex min-h-svh flex-col overflow-hidden">{mainContent}</SidebarInset>
          <AppSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            side="right"
            user={{
              name: user.username || user.full_name,
              email: tenant?.name ?? user.username,
              avatar: user.avatar_url ?? '',
            }}
            onLogout={logout}
            onProfile={() => setActiveTab('profile')}
          />
        </>
      ) : (
        <>
          <AppSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            side="left"
            user={{
              name: user.username || user.full_name,
              email: tenant?.name ?? user.username,
              avatar: user.avatar_url ?? '',
            }}
            onLogout={logout}
            onProfile={() => setActiveTab('profile')}
          />
          <SidebarInset className="flex min-h-svh flex-col overflow-hidden">{mainContent}</SidebarInset>
        </>
      )}
    </SidebarProvider>
  );
}
