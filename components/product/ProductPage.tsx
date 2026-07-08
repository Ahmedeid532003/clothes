import React, { Suspense, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  initialProducts,
  initialCompositeItems,
  initialBundledItems,
} from './v13/mockData';
import type { Product } from './v13/mockData';
import {
  PRODUCT_MODULE_SUBMENUS,
  type ProductModuleSubTabId,
  tabToProductModuleSubTab,
} from './productModuleNav';

const ProductsTab = React.lazy(() =>
  import('./v13/ProductsTab').then((m) => ({ default: m.ProductsTab })),
);

type ProductPageProps = {
  activeTab?: string;
  onNavigate?: (tab: string) => void;
};

export function ProductPage({ activeTab = 'product', onNavigate }: ProductPageProps) {
  const { isRtl } = useLanguage();
  const lang = isRtl ? 'ar' : 'en';
  const { branches } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<ProductModuleSubTabId>(
    tabToProductModuleSubTab(activeTab),
  );
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [compositeItems, setCompositeItems] = useState(initialCompositeItems);
  const [bundledItems, setBundledItems] = useState(initialBundledItems);

  const selectedBranches =
    branches.length > 0 ? branches.map((b) => b.id) : ['all'];

  React.useEffect(() => {
    setActiveSubTab(tabToProductModuleSubTab(activeTab));
  }, [activeTab]);

  const handleSubTabChange = (id: ProductModuleSubTabId) => {
    setActiveSubTab(id);
    onNavigate?.(id);
  };

  return (
    <div className="product-module-page w-full min-w-0">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {lang === 'ar' ? 'جاري تحميل وحدة المنتجات...' : 'Loading product module...'}
          </div>
        }
      >
        <ProductsTab
          lang={lang}
          activeSubTab={activeSubTab}
          setActiveSubTab={(id) => {
            if (PRODUCT_MODULE_SUBMENUS.some((m) => m.id === id)) {
              handleSubTabChange(id as ProductModuleSubTabId);
            }
          }}
          products={products}
          setProducts={setProducts}
          compositeItems={compositeItems}
          setCompositeItems={setCompositeItems}
          bundledItems={bundledItems}
          setBundledItems={setBundledItems}
          selectedBranches={selectedBranches}
        />
      </Suspense>
    </div>
  );
}
