import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  Download,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Settings,
  Shirt,
  Sparkles,
} from 'lucide-react';
import DashboardInsights from './components/DashboardInsights';
import BasicSetup from './components/BasicSetup';
import ProductCatalog from './components/ProductCatalog';
import InventoryValuation from './components/InventoryValuation';
import MovementPermits from './components/MovementPermits';
import InventoryAuditComponent from './components/InventoryAudit';
import StyleBuilder from './components/StyleBuilder';
import { useMontagatDataInternal } from './useMontagatData';
import type { Product } from './types';

type Props = {
  onClose?: () => void;
};

export function MontagatApp({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const data = useMontagatDataInternal(activeTab as 'dashboard' | 'setup' | 'catalog' | 'inventory' | 'permits' | 'audit' | 'style-builder');
  const [isFullscreen, setIsFullscreen] = useState(false);
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
      .map((p) => {
        const typeLabel =
          p.type === 'transfer'
            ? 'تحويل'
            : p.type === 'disbursement'
              ? 'صرف'
              : p.type === 'addition'
                ? 'إضافة'
                : 'هالك';
        const action =
          p.status === 'pending_approval' && p.type === 'transfer'
            ? 'بانتظار موافقة المدير'
            : 'بانتظار الإجراء';
        return {
          id: p.code,
          text: `إذن ${typeLabel} رقم ${p.code} — ${action}`,
          unread: !readNotifications.has(p.code),
        };
      });
    if (items.length === 0 && data.dataReady) {
      return [
        {
          id: 'ok',
          text: 'لا توجد تنبيهات معلّقة — البيانات مربوطة بقاعدة البيانات',
          unread: false,
        },
      ];
    }
    return items;
  }, [data.permits, data.dataReady, readNotifications]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
      const seasonName = data.seasons.find((s) => s.code === p.seasonCode)?.name || p.seasonCode;
      const deptName = data.departments.find((d) => d.code === p.departmentCode)?.name || p.departmentCode;
      const brandName = data.brands.find((b) => b.code === p.brandCode)?.name || p.brandCode;
      return [p.code, p.name, seasonName, deptName, brandName, p.buyPrice, p.sellPrice, totalQty];
    });
    const csvContent = [
      '\ufeff' + headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '');
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
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
  };

  return (
    <div
      dir="rtl"
      className="montagat-canvas min-h-full bg-gray-50 flex flex-row-reverse text-gray-800 selection:bg-blue-100 selection:text-blue-900"
    >
      <aside className="w-72 bg-blue-950 text-white shrink-0 shadow-2xl flex flex-col border-l border-blue-900/40 relative z-10">
        <div className="p-6 border-b border-blue-900/50 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white">
            <Shirt size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">إدارة المخزون</h1>
            <p className="text-[10px] text-blue-300 font-medium">Ma7alyErp — بيانات حية</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-xs font-bold overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'لوحة المؤشرات والتحليلات' },
            { id: 'setup', icon: Settings, label: 'تعريف محددات الملابس' },
            { id: 'catalog', icon: Shirt, label: 'دليل المنتجات والأصناف' },
            { id: 'inventory', icon: Home, label: 'أرصدة وتقييم المخازن' },
            { id: 'permits', icon: ArrowRightLeft, label: 'الأذونات وحركة البضائع' },
            { id: 'audit', icon: FileSpreadsheet, label: 'محاضر الجرد والتسوية' },
            { id: 'style-builder', icon: Sparkles, label: 'منسق ومصمم الأطقم', accent: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full p-3 rounded-xl flex items-center gap-2.5 transition-all ${
                  selected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                    : 'text-blue-200 hover:bg-blue-900/40 hover:text-white'
                }`}
              >
                <Icon size={16} className={tab.accent ? 'text-amber-400' : undefined} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {onClose ? (
          <div className="p-3 border-t border-blue-900/50">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-bold hover:bg-white/20"
            >
              العودة للنظام
            </button>
          </div>
        ) : null}
      </aside>

      <main className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {data.error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {data.error}
            <button type="button" className="ms-3 underline" onClick={() => void data.reload()}>
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        <header className="bg-white border-b border-gray-200 py-3.5 px-6 shrink-0 flex justify-between items-center relative z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
              <Shirt className="text-blue-600" size={18} />
              منصة إدارة ومطابقة المخزون
            </h2>
            <div className="hidden md:flex items-center gap-2 bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-100 text-xs text-blue-800 font-bold">
              <Calendar size={14} />
              <span>الموسم الحالي: {currentSeasonName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all relative border border-gray-200 bg-white"
              >
                <Bell size={16} />
                {notifications.some((n) => n.unread) ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                ) : null}
              </button>
              {showNotifications ? (
                <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-4 text-xs font-medium space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-1">
                    <span className="font-bold text-gray-800">تنبيهات النظام</span>
                    <button
                      type="button"
                      onClick={() =>
                        setReadNotifications(new Set(notifications.map((n) => n.id)))
                      }
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      تحديد الكل كمقروء
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 rounded-lg border text-gray-700 leading-relaxed ${
                          n.unread ? 'bg-blue-50/40 border-blue-100 font-bold' : 'bg-white border-gray-50'
                        }`}
                      >
                        <p>{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleGlobalDownloadCSV}
              className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all"
              title="تصدير CSV"
            >
              <Download size={16} className="text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all border border-gray-200 bg-white"
              title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 size={16} className="text-blue-600" /> : <Maximize2 size={16} />}
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' ? (
            <DashboardInsights onNavigateToTab={setActiveTab} />
          ) : null}

          {activeTab === 'setup' ? (
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

          {activeTab === 'catalog' ? (
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

          {activeTab === 'inventory' ? (
            <InventoryValuation
              products={data.products}
              balances={data.balances}
              warehouses={data.warehouses}
              seasons={data.seasons}
              sizes={data.sizes}
              colors={data.colors}
              onAddWarehouse={(w) => void data.handleAddWarehouse(w)}
              onDeleteWarehouse={(c) => void data.handleDeleteWarehouse(c)}
              onUpdateBalance={(id, qty) => void data.handleUpdateBalance(id, qty)}
            />
          ) : null}

          {activeTab === 'permits' ? (
            <MovementPermits
              products={data.products}
              permits={data.permits}
              balances={data.balances}
              warehouses={data.warehouses}
              sizes={data.sizes}
              colors={data.colors}
              onAddPermit={(p) => data.handleAddPermit(p)}
              onApprovePermit={(p) => data.handleApprovePermit(p)}
            />
          ) : null}

          {activeTab === 'audit' ? (
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

          {activeTab === 'style-builder' ? (
            <StyleBuilder
              products={data.products}
              balances={data.balances}
              warehouses={data.warehouses}
              sizes={data.sizes}
              colors={data.colors}
              onAddProduct={(p) => void wrapProductAdd(p)}
              onNavigateToTab={setActiveTab}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
