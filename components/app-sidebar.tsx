"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { NavAnalytics } from "@/components/nav-analytics"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useAuth } from "@/lib/auth/AuthContext"
import type { BranchSummary } from "@/lib/api/auth"
import { canViewPage } from "@/lib/permissions/access"
import { ACCOUNTING_NAV, ANALYTICS_NAV, CRM_NAV, ERP_NAV, HR_NAV, POS_NAV, PRODUCT_NAV } from "@/lib/navigation"
import { tenantHasCrm, tenantHasModule } from "@/lib/modules"
import { entityName } from "@/lib/entity-name"
import {
  GalleryVerticalEndIcon,
  AudioLinesIcon,
  TerminalIcon,
  UsersIcon,
  Building2Icon,
  LayersIcon,
  BriefcaseIcon,
  UsersRoundIcon,
  UserSquareIcon,
  UserPlusIcon,
  UserCircleIcon,
  TagsIcon as CustomerTagsIcon,
  GiftIcon,
  AwardIcon,
  TrendingDownIcon,
  MinusCircleIcon,
  CalendarOffIcon,
  TrendingUpIcon,
  PlusCircleIcon,
  ClockIcon,
  BanknoteIcon,
  TruckIcon,
  TagsIcon,
  DatabaseIcon,
  WarehouseIcon,
  PackageIcon,
  FileTextIcon,
  Undo2Icon,
  ClipboardListIcon,
  BadgePercentIcon,
  LandmarkIcon,
  WalletIcon,
  ShoppingBagIcon,
  StoreIcon,
  LayoutDashboardIcon,
  HomeIcon,
  BarChart3Icon,
  ClipboardCheckIcon,
  BoxesIcon,
  BadgePercentIcon as PriceTagIcon,
  PrinterIcon,
  ArrowLeftRight,
  ShieldAlert,
  GitBranch,
  Coins,
  Building2,
  BookOpen,
  Scale,
  PieChart,
  TrendingUp,
  BookMarked,
  ArrowUpFromLine,
  ArrowDownToLine,
  CreditCard,
  Smartphone,
  FileSpreadsheet,
  ScanBarcode,
} from "lucide-react"

const SUB_ICONS: Record<string, React.ReactNode> = {
  hrJobStructure: <GitBranch className="h-4 w-4 shrink-0" />,
  createUsers: <UserPlusIcon className="h-4 w-4 shrink-0" />,
  departments: <Building2Icon className="h-4 w-4 shrink-0" />,
  sections: <LayersIcon className="h-4 w-4 shrink-0" />,
  jobTitles: <BriefcaseIcon className="h-4 w-4 shrink-0" />,
  employeeGroups: <UsersRoundIcon className="h-4 w-4 shrink-0" />,
  employeeData: <UserSquareIcon className="h-4 w-4 shrink-0" />,
  employeeReports: <FileTextIcon className="h-4 w-4 shrink-0" />,
  bonusItems: <GiftIcon className="h-4 w-4 shrink-0" />,
  bonuses: <AwardIcon className="h-4 w-4 shrink-0" />,
  deductionItems: <TrendingDownIcon className="h-4 w-4 shrink-0" />,
  deductions: <MinusCircleIcon className="h-4 w-4 shrink-0" />,
  leaves: <CalendarOffIcon className="h-4 w-4 shrink-0" />,
  leaveTypes: <CalendarOffIcon className="h-4 w-4 shrink-0" />,
  officialHolidays: <CalendarOffIcon className="h-4 w-4 shrink-0" />,
  allowanceItems: <TrendingUpIcon className="h-4 w-4 shrink-0" />,
  allowances: <PlusCircleIcon className="h-4 w-4 shrink-0" />,
  attendance: <ClipboardListIcon className="h-4 w-4 shrink-0" />,
  attendanceImport: <ClockIcon className="h-4 w-4 shrink-0" />,
  employeeCommissions: <AwardIcon className="h-4 w-4 shrink-0" />,
  payroll: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  paymentAuthTypes: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  payrollPayments: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  supplierPayments: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  supplierGroups: <UsersIcon className="h-4 w-4 shrink-0" />,
  supplierTypes: <TagsIcon className="h-4 w-4 shrink-0" />,
  supplierInventories: <ClipboardListIcon className="h-4 w-4 shrink-0" />,
  generalItemMovement: <BarChart3Icon className="h-4 w-4 shrink-0" />,
  supplierWeeklyReports: <FileTextIcon className="h-4 w-4 shrink-0" />,
  supplierAccounts: <LandmarkIcon className="h-4 w-4 shrink-0" />,
  supplierDiscounts: <BadgePercentIcon className="h-4 w-4 shrink-0" />,
  storeDiscounts: <PriceTagIcon className="h-4 w-4 shrink-0" />,
  supplierData: <DatabaseIcon className="h-4 w-4 shrink-0" />,
  saleDiscounts: <BadgePercentIcon className="h-4 w-4 shrink-0" />,
  scanOrders: <ScanBarcode className="h-4 w-4 shrink-0" />,
  salesInvoices: <FileTextIcon className="h-4 w-4 shrink-0" />,
  salesReturns: <Undo2Icon className="h-4 w-4 shrink-0" />,
  taxInvoices: <BadgePercentIcon className="h-4 w-4 shrink-0" />,
  salesQuotations: <FileTextIcon className="h-4 w-4 shrink-0" />,
  customerReservations: <ClipboardListIcon className="h-4 w-4 shrink-0" />,
  sellerPerformance: <BarChart3Icon className="h-4 w-4 shrink-0" />,
  purchasesWorkspace: <TruckIcon className="h-4 w-4 shrink-0" />,
  purchaseInvoices: <FileTextIcon className="h-4 w-4 shrink-0" />,
  purchaseReturnInvoices: <Undo2Icon className="h-4 w-4 shrink-0" />,
  warehouses: <WarehouseIcon className="h-4 w-4 shrink-0" />,
  seasons: <TagsIcon className="h-4 w-4 shrink-0" />,
  productSections: <LayersIcon className="h-4 w-4 shrink-0" />,
  brands: <TagsIcon className="h-4 w-4 shrink-0" />,
  classifications: <LayersIcon className="h-4 w-4 shrink-0" />,
  sizes: <TagsIcon className="h-4 w-4 shrink-0" />,
  colors: <TagsIcon className="h-4 w-4 shrink-0" />,
  products: <PackageIcon className="h-4 w-4 shrink-0" />,
  stockBalances: <DatabaseIcon className="h-4 w-4 shrink-0" />,
  stockTransfers: <Undo2Icon className="h-4 w-4 shrink-0" />,
  stockDisbursements: <ArrowUpFromLine className="h-4 w-4 shrink-0" />,
  stockAdditions: <ArrowDownToLine className="h-4 w-4 shrink-0" />,
  stockScrap: <MinusCircleIcon className="h-4 w-4 shrink-0" />,
  stockValuation: <BarChart3Icon className="h-4 w-4 shrink-0" />,
  stockCount: <ClipboardCheckIcon className="h-4 w-4 shrink-0" />,
  compositeProducts: <BoxesIcon className="h-4 w-4 shrink-0" />,
  priceAdjustments: <PriceTagIcon className="h-4 w-4 shrink-0" />,
  barcodePrint: <PrinterIcon className="h-4 w-4 shrink-0" />,
  suppliers: <TruckIcon className="h-4 w-4 shrink-0" />,
  posScreen: <StoreIcon className="h-4 w-4 shrink-0" />,
  posBarcode: <ScanBarcode className="h-4 w-4 shrink-0" />,
  generalExpenses: <FileTextIcon className="h-4 w-4 shrink-0" />,
  payrollAdvances: <WalletIcon className="h-4 w-4 shrink-0" />,
  paymentCheques: <FileTextIcon className="h-4 w-4 shrink-0" />,
  cashShifts: <ClockIcon className="h-4 w-4 shrink-0" />,
  shiftHandovers: <ArrowLeftRight className="h-4 w-4 shrink-0" />,
  treasuryMovements: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  pendingShifts: <ShieldAlert className="h-4 w-4 shrink-0" />,
  banks: <LandmarkIcon className="h-4 w-4 shrink-0" />,
  bankAccounts: <LandmarkIcon className="h-4 w-4 shrink-0" />,
  cheques: <FileTextIcon className="h-4 w-4 shrink-0" />,
  cardTransactions: <CreditCard className="h-4 w-4 shrink-0" />,
  eWallets: <Smartphone className="h-4 w-4 shrink-0" />,
  bankingStatements: <FileSpreadsheet className="h-4 w-4 shrink-0" />,
  paymentMethodsDashboard: <CreditCard className="h-4 w-4 shrink-0" />,
  chartOfAccounts: <GitBranch className="h-4 w-4 shrink-0" />,
  currencies: <Coins className="h-4 w-4 shrink-0" />,
  assetDepreciation: <Building2 className="h-4 w-4 shrink-0" />,
  journalEntries: <BookOpen className="h-4 w-4 shrink-0" />,
  trialBalance: <Scale className="h-4 w-4 shrink-0" />,
  balanceSheet: <PieChart className="h-4 w-4 shrink-0" />,
  incomeStatement: <TrendingUp className="h-4 w-4 shrink-0" />,
  generalLedger: <BookMarked className="h-4 w-4 shrink-0" />,
  customerDashboard: <LayoutDashboardIcon className="h-4 w-4 shrink-0" />,
  customerTypes: <CustomerTagsIcon className="h-4 w-4 shrink-0" />,
  customerGroups: <UsersIcon className="h-4 w-4 shrink-0" />,
  customersList: <UserCircleIcon className="h-4 w-4 shrink-0" />,
  customerAccounts: <FileSpreadsheet className="h-4 w-4 shrink-0" />,
  customerArrears: <ShieldAlert className="h-4 w-4 shrink-0" />,
  customerInstallments: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  installmentCollection: <BanknoteIcon className="h-4 w-4 shrink-0" />,
  installmentFollowUp: <ClipboardCheckIcon className="h-4 w-4 shrink-0" />,
  customerConsignment: <PackageIcon className="h-4 w-4 shrink-0" />,
  customerStockCount: <ClipboardListIcon className="h-4 w-4 shrink-0" />,
  hrSections: <LayersIcon className="h-4 w-4 shrink-0" />,
  workShifts: <ClockIcon className="h-4 w-4 shrink-0" />,
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  employees: <UsersIcon />,
  sales: <StoreIcon />,
  suppliers: <TruckIcon />,
  purchases: <ShoppingBagIcon />,
  purchaseSuppliers: <TruckIcon />,
  productManagement: <PackageIcon />,
  pos: <StoreIcon />,
  expenses: <WalletIcon />,
  banking: <LandmarkIcon />,
  accountingCore: <LandmarkIcon />,
  financialReports: <FileTextIcon />,
  customers: <UserCircleIcon />,
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab?: string
  onTabChange?: (tab: string) => void
  user?: { name: string; email: string; avatar?: string }
  onLogout?: () => void
  onProfile?: () => void
}

function branchToTeam(branch: BranchSummary, planLabel: string, fallbackIcon: React.ReactNode) {
  const name = entityName(branch)
  return {
    id: branch.id,
    name,
    plan: planLabel,
    imageUrl: branch.image_url,
    logo: branch.image_url ? (
      <img src={branch.image_url} alt={name} className="size-full object-cover rounded-md" />
    ) : (
      fallbackIcon
    ),
  }
}

export function AppSidebar({ activeTab, onTabChange, side, user: userProp, onLogout, onProfile, ...props }: AppSidebarProps) {
  const { t, dir, isRtl } = useLanguage()
  const { tenant, user: authUser, branches, activeBranchId, setActiveBranchId, canSwitchAllBranches } = useAuth()
  const [openSection, setOpenSection] = React.useState<string | null>(null)
  const [branchTeams, setBranchTeams] = React.useState<
    { id: string; name: string; logo: React.ReactNode; plan: string; imageUrl?: string | null }[]
  >([])
  const sidebarSide = side ?? (isRtl ? 'right' : 'left')

  const planLabel = tenant?.name ?? t('teams.plan')
  const fallbackIcons = [
    <GalleryVerticalEndIcon key="a" />,
    <AudioLinesIcon key="b" />,
    <TerminalIcon key="c" />,
  ]

  React.useEffect(() => {
    if (branches.length === 0) {
      setBranchTeams([])
      return
    }
    setBranchTeams(
      branches.map((b, i) =>
        branchToTeam(b, planLabel, fallbackIcons[i % fallbackIcons.length]),
      ),
    )
  }, [branches, planLabel])

  const teams =
    branchTeams.length > 0
      ? branchTeams
      : [
          {
            id: 'default',
            name: tenant?.name ?? t('teams.downtown'),
            logo: <GalleryVerticalEndIcon />,
            plan: planLabel,
          },
        ]

  const user = {
    name: userProp?.name ?? authUser?.username ?? authUser?.full_name ?? "User",
    email: userProp?.email ?? tenant?.name ?? authUser?.username ?? "",
    avatar: userProp?.avatar ?? authUser?.avatar_url ?? "",
  }

  const analytics = ANALYTICS_NAV.filter((item) => canViewPage(authUser, item.tab)).map(
    (item) => ({
      id: item.id,
      name: t(`nav.${item.id}`),
      tab: item.tab,
      icon: item.id === 'dashboard' ? <LayoutDashboardIcon /> : <HomeIcon />,
      isActive: item.tab === activeTab,
    }),
  )

  const buildNavItems = (groups: typeof HR_NAV) =>
    groups
      .map((group) => ({
        id: group.id,
        title: t(`nav.${group.id}`),
        icon: GROUP_ICONS[group.id],
        isActive: group.items.some((sub) => sub.tab === activeTab),
        items: group.items
          .filter((sub) => canViewPage(authUser, sub.tab))
          .map((sub) => ({
            id: sub.id,
            title: t(`nav.${sub.id}`),
            tab: sub.tab,
            icon: SUB_ICONS[sub.id],
            isActive: sub.tab === activeTab,
          })),
      }))
      .filter((g) => g.items.length > 0)

  const navMain = tenantHasModule(tenant, 'hr') ? buildNavItems(HR_NAV) : []
  const erpNav = tenantHasModule(tenant, 'purchases') ? buildNavItems(ERP_NAV) : []
  const productNav = tenantHasModule(tenant, 'inventory') ? buildNavItems(PRODUCT_NAV) : []
  const posNav = tenantHasModule(tenant, 'pos') ? buildNavItems(POS_NAV) : []
  const crmNav = tenantHasCrm(tenant) ? buildNavItems(CRM_NAV) : []
  const accountingNav = tenantHasModule(tenant, 'accounting')
    ? buildNavItems(ACCOUNTING_NAV)
    : []

  return (
    <Sidebar
      collapsible="icon"
      side={sidebarSide}
      dir={dir}
      className="border-none"
      {...props}
    >
      <SidebarHeader className="app-sidebar-brand-header app-sidebar-top-dock border-b border-white/10">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-brand-mark" aria-hidden>
            M
          </span>
          <div className="app-sidebar-brand-copy">
            <strong>Ma7alyErp</strong>
            <span>The power of simplicity</span>
          </div>
        </div>
        <TeamSwitcher
          teams={teams}
          activeTeamId={activeBranchId}
          onTeamChange={(id) => setActiveBranchId(id)}
          showAllBranches={canSwitchAllBranches}
          onAllBranches={() => setActiveBranchId(null)}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavAnalytics
          analytics={analytics}
          onItemClick={(tab) => onTabChange?.(tab)}
        />
        {navMain.length > 0 && (
          <NavMain
            items={navMain}
            label={t('nav.hr')}
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
        {erpNav.length > 0 && (
          <NavMain
            items={erpNav}
            label={t('nav.erp')}
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
        {productNav.length > 0 && (
          <NavMain
            items={productNav}
            hideLabel
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
        {posNav.length > 0 && (
          <NavMain
            items={posNav}
            label={t('nav.pos')}
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
        {crmNav.length > 0 && (
          <NavMain
            items={crmNav}
            label={t('nav.crm')}
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
        {accountingNav.length > 0 && (
          <NavMain
            items={accountingNav}
            label={t('nav.accounting')}
            openSection={openSection}
            onOpenChange={setOpenSection}
            onItemClick={(tab) => onTabChange?.(tab)}
          />
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 gap-2">
        <LanguageSwitcher variant="sidebar" />
        <NavUser user={user} onLogout={onLogout} onProfile={onProfile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
