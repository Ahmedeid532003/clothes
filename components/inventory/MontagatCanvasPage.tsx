import React, { useMemo, useState } from 'react';
import { Bell, Calendar, Download, Shirt } from 'lucide-react';
import DashboardInsights from './montagat/components/DashboardInsights';
import BasicSetup from './montagat/components/BasicSetup';
import ProductCatalog from './montagat/components/ProductCatalog';
import InventoryValuation from './montagat/components/InventoryValuation';
import MovementPermits from './montagat/components/MovementPermits';
import InventoryAuditComponent from './montagat/components/InventoryAudit';
import StyleBuilder from './montagat/components/StyleBuilder';
import { useMontagatData } from './montagat/MontagatDataProvider';
import type { MontagatScreen } from './montagat/useMontagatData';
import { mgmtScreenToTab } from './montagatNav';
import type { Product } from './montagat/types';

const TAB_TO_SCREEN: Record<string, MontagatScreen> = {
  'mgmt-dashboard': 'dashboard',
  'mgmt-setup': 'setup',
  'mgmt-catalog': 'catalog',
  'mgmt-inventory': 'inventory',
  'mgmt-permits': 'permits',
  'mgmt-audit': 'audit',
  'mgmt-style-builder': 'style-builder',
};

const SCREEN_TO_TAB: Record<MontagatScreen, string> = {
  dashboard: 'mgmt-dashboard',
  setup: 'mgmt-setup',
  catalog: 'mgmt-catalog',
  inventory: 'mgmt-inventory',
  permits: 'mgmt-permits',
  audit: 'mgmt-audit',
  'style-builder': 'mgmt-style-builder',
};

type Props = {
  activeTab: string;
  onNavigate?: (tab: string) => void;
};

export function MontagatCanvasPage({ activeTab, onNavigate }: Props) {
  const data = useMontagatData();
  const screen = TAB_TO_SCREEN[activeTab] ?? 'dashboard';
  const [catalogInitialTab, setCatalogInitialTab] = useState<'all' | 'standard' | 'composite'>('all');
  const [newlyAddedProductCode, setNewlyAddedProductCode] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const currentSeasonName =
    data.seasons.find((s) => s.isCurrent)?.name || data.seasons[0]?.name || '—';

  const notifications = useMemo(() => {
    const items = data.permits
      .filter((p) => p.status === 'pending_approval' || p.status === 'draft')
      .slice(0, 8)
      .map((p) => ({
        id: p.code,
        text: `إذن ${p.type} رقم ${p.code} بانتظار الإجراء`,
        unread: !readNotifications.has(p.code),
      }));
    if (items.length === 0 && data.dataReady) {
      return [{ id: 'ok', text: 'لا توجد تنبيهات معلّقة', unread: false }];
    }
    return items;
  }, [data.permits, data.dataReady, readNotifications]);

  const navigateScreen = (target: MontagatScreen) => {
    onNavigate?.(SCREEN_TO_TAB[target] ?? mgmtScreenToTab(target));
  };

  const handleGlobalDownloadCSV = () => {
    const headers = [
      'كود المنتج',
      'اسم المنتج',
      'الموسم',
      'القسم',
      'العلامة التجارية',
      'التكلفة (ج.م)',
      'سعر البيع (ج.م)',
      'إجمالي الأرصدة المتوفرة',
    ];
    const rows = data.products.map((p) => {
      const prodBalances = data.balances.filter((b) => b.productCode === p.code);
      const totalQty = prodBalances.reduce((sum, b) => sum + b.quantity, 0);
      return [
        p.code,
        p.name,
        data.seasons.find((s) => s.code === p.seasonCode)?.name || p.seasonCode,
        data.departments.find((d) => d.code === p.departmentCode)?.name || p.departmentCode,
        data.brands.find((b) => b.code === p.brandCode)?.name || p.brandCode,
        p.buyPrice,
        p.sellPrice,
        totalQty,
      ];
    });
    const csvContent = [
      '\ufeff' + headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '');
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `منتجات_وارصدة_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const wrapProductAdd = async (prod: Product) => {
    await data.handleAddProduct(prod);
    setCatalogInitialTab(prod.isComposite ? 'composite' : 'standard');
    setNewlyAddedProductCode(prod.code);
    onNavigate?.('mgmt-catalog');
  };

  return (
    <div className="montagat-canvas space-y-4" dir="rtl">
      {data.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {data.error}
          <button type="button" className="ms-3 underline" onClick={() => void data.reload()}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
            <Shirt className="text-blue-600" size={18} />
            إدارة المخزون
          </h2>
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
            <Calendar size={14} />
            <span>الموسم الحالي: {currentSeasonName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50"
            >
              <Bell size={16} />
            </button>
            {showNotifications ? (
              <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border bg-white p-3 text-xs shadow-xl">
                {notifications.map((n) => (
                  <p key={n.id} className="mb-2 text-gray-700">
                    {n.text}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleGlobalDownloadCSV}
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700"
            title="تصدير CSV"
          >
            <Download size={16} />
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-gray-50/80 p-4 sm:p-6 min-h-[560px]">
        {screen === 'dashboard' ? (
          <DashboardInsights onNavigateToTab={navigateScreen} />
        ) : null}

        {screen === 'setup' ? (
          <BasicSetup
            seasons={data.seasons}
            departments={data.departments}
            brands={data.brands}
            classifications={data.classifications}
            sizes={data.sizes}
            colors={data.colors}
            onAddSeason={(s) => void data.handleAddSeason(s)}
            onDeleteSeason={(c) => void data.handleDeleteSeason(c)}
            onAddDepartment={(d) => void data.handleAddDepartment(d)}
            onDeleteDepartment={(c) => void data.handleDeleteDepartment(c)}
            onAddBrand={(b) => void data.handleAddBrand(b)}
            onDeleteBrand={(c) => void data.handleDeleteBrand(c)}
            onAddClassification={(c) => void data.handleAddClassification(c)}
            onDeleteClassification={(c) => void data.handleDeleteClassification(c)}
            onAddSize={(s) => void data.handleAddSize(s)}
            onDeleteSize={(c) => void data.handleDeleteSize(c)}
            onAddColor={(c) => void data.handleAddColor(c)}
            onDeleteColor={(c) => void data.handleDeleteColor(c)}
          />
        ) : null}

        {screen === 'catalog' ? (
          <ProductCatalog
            products={data.products}
            seasons={data.seasons}
            departments={data.departments}
            brands={data.brands}
            classifications={data.classifications}
            sizes={data.sizes}
            colors={data.colors}
            onAddProduct={(p) => void wrapProductAdd(p)}
            onDeleteProduct={(c) => void data.handleDeleteProduct(c)}
            initialTab={catalogInitialTab}
            newlyAddedCode={newlyAddedProductCode}
            clearNewlyAddedCode={() => setNewlyAddedProductCode(null)}
          />
        ) : null}

        {screen === 'inventory' ? (
          <InventoryValuation
            products={data.products}
            balances={data.balances}
            warehouses={data.warehouses}
            seasons={data.seasons}
            sizes={data.sizes}
            colors={data.colors}
            onAddWarehouse={(w) => data.handleAddWarehouse(w)}
            onDeleteWarehouse={(c) => void data.handleDeleteWarehouse(c)}
            onUpdateBalance={(id, qty) => void data.handleUpdateBalance(id, qty)}
          />
        ) : null}

        {screen === 'permits' ? (
          <MovementPermits
            products={data.products}
            permits={data.permits}
            balances={data.balances}
            warehouses={data.warehouses}
            sizes={data.sizes}
            colors={data.colors}
            initialFilterType="all"
            defaultPermitType="transfer"
            onAddPermit={(p) => data.handleAddPermit(p)}
            onApprovePermit={(p) => data.handleApprovePermit(p)}
          />
        ) : null}

        {screen === 'audit' ? (
          <InventoryAuditComponent
            products={data.products}
            audits={data.audits}
            balances={data.balances}
            warehouses={data.warehouses}
            seasons={data.seasons}
            sizes={data.sizes}
            colors={data.colors}
            onAddAudit={(a) => data.handleAddAudit(a)}
          />
        ) : null}

        {screen === 'style-builder' ? (
          <StyleBuilder
            products={data.products}
            balances={data.balances}
            warehouses={data.warehouses}
            sizes={data.sizes}
            colors={data.colors}
            onAddProduct={(p) => void wrapProductAdd(p)}
            onNavigateToTab={navigateScreen}
          />
        ) : null}
      </div>
    </div>
  );
}

export { isMgmtTab, mgmtTabToScreen, MGMT_TAB_KEYS } from './montagatNav';
