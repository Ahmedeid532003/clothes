import React, { useState } from 'react';
import {
  Package,
  Settings,
  ChevronDown,
  Check,
  Menu,
  X,
} from 'lucide-react';
import {
  initialProducts,
  initialCompositeItems,
  initialBundledItems,
  translations,
  Product,
} from '../mockData';
import { ProductsTab } from './ProductsTab';
import { CompositeItem } from './CompositeItemsTab';
import { BundledItem } from './BundledItemsTab';

export interface ProductManagementModuleProps {
  lang?: 'ar' | 'en';
  /** يملأ حاوية الأب (للتضمين داخل تاب/كانفس/صفحة) */
  embedded?: boolean;
  /** وضع ملء الشاشة كتطبيق مستقل */
  fullscreen?: boolean;
  /** إخفاء الشريط الجانبي الداخلي — التنقل من ERP فقط */
  hideChrome?: boolean;
  className?: string;
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

const INVENTORY_SUBMENUS = [
  { id: 'product-categories', labelEn: 'Product Classifications', labelAr: 'تصنيفات المنتجات' },
  { id: 'products-list', labelEn: 'Products Registry', labelAr: 'المنتجات' },
  { id: 'composite-items', labelEn: 'Composite Items', labelAr: 'أصناف مركبة' },
  { id: 'bundled-items', labelEn: 'Bundled Items', labelAr: 'صنف مجمع' },
  { id: 'item-transfer', labelEn: 'Item Transfer Orders', labelAr: 'اذون تحويل اصناف' },
  { id: 'item-issue', labelEn: 'Item Issue Vouchers', labelAr: 'اذون صرف' },
  { id: 'item-addition', labelEn: 'Item Addition Vouchers', labelAr: 'اذون اضافه' },
  { id: 'item-destruction', labelEn: 'Destruction Vouchers', labelAr: 'اذون اهلاك' },
  { id: 'price-modification', labelEn: 'Modify Selling Prices', labelAr: 'تعديل اسعار البيع' },
  { id: 'inventory-check', labelEn: 'Inventory Check', labelAr: 'جرد اصناف' },
  { id: 'barcode-printing', labelEn: 'Print Barcode', labelAr: 'طباعة باركود' },
  { id: 'product-reports-shortcut', labelEn: 'Product Reports', labelAr: 'تقارير المنتجات' },
] as const;

export default function ProductManagementModule({
  lang = 'ar',
  embedded = false,
  fullscreen = false,
  hideChrome = false,
  className = '',
  initialSubTab = 'product-categories',
  onSubTabChange,
}: ProductManagementModuleProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [compositeItems, setCompositeItems] = useState<CompositeItem[]>(initialCompositeItems);
  const [bundledItems, setBundledItems] = useState<BundledItem[]>(initialBundledItems);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab);
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedBranches] = useState<string[]>(['all']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[lang];

  const showStateToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const changeSubTab = (id: string) => {
    setActiveSubTab(id);
    onSubTabChange?.(id);
  };

  React.useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubTab]);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rootClass = hideChrome
    ? 'h-[100svh] w-full'
    : fullscreen
      ? 'h-screen w-screen p-[1mm]'
      : embedded
        ? 'h-full min-h-0'
        : 'h-full min-h-[calc(100vh-5rem)]';

  const productsPanel = (
    <ProductsTab
      lang={lang}
      activeSubTab={activeSubTab}
      setActiveSubTab={changeSubTab}
      products={products}
      setProducts={setProducts}
      compositeItems={compositeItems}
      setCompositeItems={setCompositeItems}
      bundledItems={bundledItems}
      setBundledItems={setBundledItems}
      selectedBranches={selectedBranches}
    />
  );

  if (hideChrome) {
    return (
      <div
        className={`${rootClass} overflow-y-auto bg-slate-50 transition-all duration-300 ${className}`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white py-3 px-6 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in border border-slate-700">
            <Check className="text-emerald-500 w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold font-sans">{toastMessage}</span>
          </div>
        )}
        <div className="p-3 sm:p-5 space-y-6 max-w-7xl w-full mx-auto">{productsPanel}</div>
      </div>
    );
  }

  return (
    <div className={`${rootClass} bg-white transition-all duration-300 ${className}`}>
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="h-full overflow-hidden bg-[#f8fafc] text-[#1e293b] font-sans antialiased flex flex-col md:flex-row transition-all duration-300 shadow-sm ring-1 ring-slate-100 rounded-2xl"
      >
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white py-3 px-6 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in border border-slate-700">
            <Check className="text-emerald-500 w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold font-sans">{toastMessage}</span>
          </div>
        )}

        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-xs transition-opacity duration-300"
          />
        )}

        <aside
          className={`fixed inset-y-0 z-40 bg-[#0a1945] text-[#b0bdcc] flex flex-col flex-shrink-0 shadow-2xl select-none transition-all duration-300 md:relative md:flex h-full
            ${isSidebarCollapsed ? 'w-[45px]' : 'w-[240px]'}
            ${lang === 'ar'
              ? 'right-0 border-l border-[#0e2759] ' + (isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0')
              : 'left-0 border-r border-[#0e2759] ' + (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
            }`}
        >
          <div className={`p-5 border-b border-[#0e2759] flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} flex-shrink-0`}>
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex flex-shrink-0 items-center justify-center text-white font-black text-md shadow-md shadow-orange-500/20">
                M
              </div>
              {!isSidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight text-white font-sans">{t.inventory}</span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg bg-[#0e2759] hover:bg-slate-700/30 text-slate-300 transition"
                title="إغلاق القائمة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className={`flex-1 py-4 overflow-y-auto flex flex-col sidebar-scrollbar ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  if (isSidebarCollapsed) {
                    setIsSidebarCollapsed(false);
                    setIsInventoryExpanded(true);
                  } else {
                    setIsInventoryExpanded((prev) => !prev);
                  }
                }}
                title={isSidebarCollapsed ? t.inventory : undefined}
                className={`w-full flex items-center transition-all duration-200 ${
                  isSidebarCollapsed ? 'justify-center py-3 px-0 rounded-lg' : 'justify-between py-2.5 px-4'
                } text-xs font-semibold font-sans bg-orange-500/10 text-white border-l-4 rtl:border-l-0 rtl:border-r-4 border-orange-500`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <Package className="w-[17px] h-[17px] text-orange-400" />
                  {!isSidebarCollapsed && <span className="font-sans text-[13px]">{t.inventory}</span>}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronDown
                    strokeWidth={2.75}
                    className={`w-[16px] h-[16px] text-white transition-transform duration-200 ${isInventoryExpanded ? 'rotate-180' : 'rotate-0'}`}
                  />
                )}
              </button>

              {isInventoryExpanded && !isSidebarCollapsed && (
                <div className={`mt-1 bg-[#09153a]/45 rounded-xl py-1 space-y-1 relative ${lang === 'ar' ? 'mr-4 pr-3.5' : 'ml-4 pl-3.5'}`}>
                  {INVENTORY_SUBMENUS.map((sub) => {
                    const isSubActive = activeSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          changeSubTab(sub.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full text-left rtl:text-right py-2 px-3 rounded-lg transition duration-150 flex items-center gap-2.5 font-sans text-[12.7px] font-medium ${
                          isSubActive
                            ? 'bg-[#0e2759] text-white font-bold'
                            : 'text-slate-200 hover:bg-[#0c1c49]/80 hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{lang === 'ar' ? sub.labelAr : sub.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className={`py-3 px-4 border-t border-[#0e2759] bg-[#0c1f54]/60 flex-shrink-0 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5 w-full'}`}>
              <div className="rounded-lg bg-[#1e2e60] flex-shrink-0 text-orange-400 border border-orange-500/30 font-black flex items-center justify-center shadow-inner w-8 h-8 text-sm">
                AU
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white leading-tight font-sans truncate">{t.adminUser}</h4>
                  <p className="text-[11px] text-slate-400 truncate">admin@ma7aly.com</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => showStateToast(lang === 'ar' ? 'إصدار 2.4.0' : 'Version 2.4.0')}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800/40 rounded-lg flex-shrink-0"
                title="الإعدادات"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          {!isMobileSidebarOpen && (
            <button
              onClick={() => {
                setIsMobileSidebarOpen(true);
                setIsSidebarCollapsed(false);
              }}
              className={`md:hidden fixed bottom-5 z-50 p-3 rounded-full bg-[#0a1945] text-white shadow-lg border border-[#0e2759] active:scale-95 transition ${lang === 'ar' ? 'left-5' : 'right-5'}`}
              title={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
              {productsPanel}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
