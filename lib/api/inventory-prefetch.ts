import {
  brandsApi,
  classificationsApi,
  colorsApi,
  fetchCompositeProducts,
  fetchMgmtDashboard,
  fetchProducts,
  fetchSeasons,
  fetchStockBalances,
  fetchWarehouses,
  productSectionsApi,
  sizesApi,
  type ColorCatalogItem,
} from './inventory';
import { fetchControlPanelDashboard } from './dashboard';

/** تسخين الكاش بعد تسجيل الدخول — البيانات تظهر فوراً عند فتح الشاشات */
export function warmInventoryCache() {
  void Promise.all([
    fetchSeasons(),
    fetchWarehouses(),
    productSectionsApi.list(),
    brandsApi.list(),
    classificationsApi.list(),
    sizesApi.list(),
    colorsApi.list() as Promise<ColorCatalogItem[]>,
  ]);

  queueMicrotask(() => {
    void fetchProducts();
    void fetchCompositeProducts();
    void fetchStockBalances();
    void fetchMgmtDashboard();
    void fetchControlPanelDashboard({ period: 'today' });
  });
}
