import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cacheKey, peekCached } from '@/lib/api/request-cache';
import type {
  CatalogItem,
  CompositeProductDto,
  ProductDto,
  SeasonDto,
  StockBalanceDto,
  WarehouseDto,
} from '@/lib/api/inventory';
import {
  approveStockAddition,
  approveStockCount,
  approveStockDisbursement,
  approveStockScrap,
  approveStockTransfer,
  brandsApi,
  classificationsApi,
  colorsApi,
  createCompositeProduct,
  createProduct,
  createSeason,
  createStockAddition,
  createStockCount,
  updateStockCount,
  createStockDisbursement,
  createStockScrap,
  createStockTransfer,
  createWarehouse,
  deleteCompositeProduct,
  deleteProduct,
  deleteWarehouse,
  fetchCompositeProducts,
  fetchProducts,
  fetchSeasons,
  fetchStockAdditions,
  fetchStockBalances,
  fetchStockCounts,
  fetchStockDisbursements,
  fetchStockScrap,
  fetchStockTransfers,
  fetchWarehouses,
  productSectionsApi,
  sizesApi,
  updateSeason,
} from '@/lib/api/inventory';
import {
  additionToPermit,
  balanceDtoToMontagat,
  brandFromCatalog,
  buildMontagatMaps,
  classificationFromCatalog,
  colorFromCatalog,
  compositeDtoToMontagat,
  departmentFromCatalog,
  disbursementToPermit,
  productDtoToMontagat,
  scrapToPermit,
  seasonDtoToMontagat,
  sizeFromCatalog,
  stockCountToAudit,
  transferToPermit,
  variantKey,
  warehouseDtoToMontagat,
  buildActualQtyByVariantFromAudit,
  type ColorCatalogItem,
  type MontagatMaps,
} from './adapters';
import type {
  Brand,
  Classification,
  Color,
  Department,
  InventoryAudit,
  InventoryBalance,
  MovementPermit,
  Product,
  Season,
  Size,
  Warehouse,
} from './types';

export type MontagatScreen =
  | 'dashboard'
  | 'setup'
  | 'catalog'
  | 'inventory'
  | 'permits'
  | 'audit'
  | 'style-builder';

type RawBundle = {
  seasonRows: SeasonDto[];
  sectionRows: CatalogItem[];
  brandRows: CatalogItem[];
  classRows: CatalogItem[];
  sizeRows: CatalogItem[];
  colorRows: ColorCatalogItem[];
  warehouseRows: WarehouseDto[];
  productRows: ProductDto[];
  compositeRows: CompositeProductDto[];
  balanceRows: Awaited<ReturnType<typeof fetchStockBalances>>;
  transferRows: Awaited<ReturnType<typeof fetchStockTransfers>>;
  disbursementRows: Awaited<ReturnType<typeof fetchStockDisbursements>>;
  additionRows: Awaited<ReturnType<typeof fetchStockAdditions>>;
  scrapRows: Awaited<ReturnType<typeof fetchStockScrap>>;
  countRows: Awaited<ReturnType<typeof fetchStockCounts>>;
};

const emptyRaw = (): RawBundle => ({
  seasonRows: [],
  sectionRows: [],
  brandRows: [],
  classRows: [],
  sizeRows: [],
  colorRows: [],
  warehouseRows: [],
  productRows: [],
  compositeRows: [],
  balanceRows: [],
  transferRows: [],
  disbursementRows: [],
  additionRows: [],
  scrapRows: [],
  countRows: [],
});

function mergeRowsById<T extends { id: string }>(fetched: T[], current: T[]): T[] {
  const byId = new Map(fetched.map((row) => [row.id, row]));
  for (const row of current) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

function needsProducts(screen: MontagatScreen) {
  return screen !== 'setup';
}

function needsOperations(screen: MontagatScreen) {
  return ['dashboard', 'inventory', 'permits', 'audit', 'style-builder'].includes(screen);
}

function needsBalances(screen: MontagatScreen) {
  return ['dashboard', 'inventory', 'permits', 'audit', 'style-builder'].includes(screen);
}

function applyRawToState(
  raw: RawBundle,
  mapsRef: React.MutableRefObject<MontagatMaps | null>,
  setters: {
    setSeasons: (v: Season[]) => void;
    setDepartments: (v: Department[]) => void;
    setBrands: (v: Brand[]) => void;
    setClassifications: (v: Classification[]) => void;
    setSizes: (v: Size[]) => void;
    setColors: (v: Color[]) => void;
    setWarehouses: (v: Warehouse[]) => void;
    setProducts: (v: Product[]) => void;
    setBalances: (v: InventoryBalance[]) => void;
    setPermits: (v: MovementPermit[]) => void;
    setAudits: (v: InventoryAudit[]) => void;
  },
  options?: { catalogs?: boolean; products?: boolean; operations?: boolean },
) {
  const { catalogs = true, products = true, operations = true } = options ?? {};
  const maps = buildMontagatMaps(
    raw.brandRows,
    raw.sectionRows,
    raw.classRows,
    raw.sizeRows,
    raw.colorRows,
    raw.seasonRows,
    raw.warehouseRows,
    raw.productRows,
    raw.compositeRows,
  );
  mapsRef.current = maps;

  if (catalogs) {
    setters.setSeasons(raw.seasonRows.map(seasonDtoToMontagat));
    setters.setDepartments(raw.sectionRows.map(departmentFromCatalog));
    setters.setBrands(raw.brandRows.map(brandFromCatalog));
    setters.setClassifications(raw.classRows.map(classificationFromCatalog));
    setters.setSizes(raw.sizeRows.map(sizeFromCatalog));
    setters.setColors(raw.colorRows.map(colorFromCatalog));
    setters.setWarehouses(raw.warehouseRows.map(warehouseDtoToMontagat));
  }

  if (products) {
    const standardProducts = raw.productRows.map((p, i) => productDtoToMontagat(p, maps, i));
    const compositeProducts = raw.compositeRows.map((c, i) =>
      compositeDtoToMontagat(c, maps, i + raw.productRows.length),
    );
    setters.setProducts([...standardProducts, ...compositeProducts]);
  }

  if (operations) {
    setters.setBalances(
      raw.balanceRows.map((b) => balanceDtoToMontagat(b, maps)).filter(Boolean) as InventoryBalance[],
    );
    setters.setPermits(
      [
        ...raw.transferRows.map((t) => transferToPermit(t, maps)),
        ...raw.disbursementRows.map((d) => disbursementToPermit(d, maps)),
        ...raw.additionRows.map((a) => additionToPermit(a, maps)),
        ...raw.scrapRows.map((s) => scrapToPermit(s, maps)),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    );
    setters.setAudits(raw.countRows.map((c) => stockCountToAudit(c, maps)));
  }
}

type CatalogKey =
  | 'sectionRows'
  | 'brandRows'
  | 'classRows'
  | 'sizeRows'
  | 'colorRows';

export function useMontagatDataInternal(activeScreen: MontagatScreen = 'dashboard') {
  const { activeBranchId, branches: authBranches } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [permits, setPermits] = useState<MovementPermit[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [dataReady, setDataReady] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapsRef = useRef<MontagatMaps | null>(null);
  const rawRef = useRef<RawBundle>(emptyRaw());
  const catalogsLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const movementsLoadedRef = useRef(false);
  const balancesLoadedRef = useRef(false);
  const catalogsInflightRef = useRef<Promise<void> | null>(null);
  const productsInflightRef = useRef<Promise<void> | null>(null);
  const movementsInflightRef = useRef<Promise<void> | null>(null);
  const balancesInflightRef = useRef<Promise<void> | null>(null);

  const setters = {
    setSeasons,
    setDepartments,
    setBrands,
    setClassifications,
    setSizes,
    setColors,
    setWarehouses,
    setProducts,
    setBalances,
    setPermits,
    setAudits,
  };

  const commit = useCallback(
    (options?: { catalogs?: boolean; products?: boolean; operations?: boolean }) => {
      applyRawToState(rawRef.current, mapsRef, setters, options);
    },
    [],
  );

  useLayoutEffect(() => {
    const seasonRows = peekCached<SeasonDto[]>(cacheKey('/organization/seasons/')) ?? [];
    const sectionRows = peekCached<CatalogItem[]>(cacheKey('/inventory/sections/')) ?? [];
    const brandRows = peekCached<CatalogItem[]>(cacheKey('/inventory/brands/')) ?? [];
    const classRows = peekCached<CatalogItem[]>(cacheKey('/inventory/classifications/')) ?? [];
    const sizeRows = peekCached<CatalogItem[]>(cacheKey('/inventory/sizes/')) ?? [];
    const colorRows = peekCached<ColorCatalogItem[]>(cacheKey('/inventory/colors/')) ?? [];
    const warehouseRows = peekCached<WarehouseDto[]>(cacheKey('/organization/warehouses/')) ?? [];
    const productRows = peekCached<ProductDto[]>(cacheKey('/inventory/products/')) ?? [];
    const compositeRows = peekCached<CompositeProductDto[]>(cacheKey('/inventory/composite-products/')) ?? [];
    const balanceRows = peekCached<Awaited<ReturnType<typeof fetchStockBalances>>>(
      cacheKey('/inventory/stock-balances/'),
    ) ?? [];

    const hasCatalogs =
      seasonRows.length > 0 ||
      warehouseRows.length > 0 ||
      sectionRows.length > 0 ||
      brandRows.length > 0;
    const hasProducts = productRows.length > 0 || compositeRows.length > 0;
    const hasBalances = balanceRows.length > 0;

    if (!hasCatalogs && !hasProducts && !hasBalances) return;

    rawRef.current = {
      ...rawRef.current,
      seasonRows: mergeRowsById(seasonRows, rawRef.current.seasonRows),
      sectionRows: mergeRowsById(sectionRows, rawRef.current.sectionRows),
      brandRows: mergeRowsById(brandRows, rawRef.current.brandRows),
      classRows: mergeRowsById(classRows, rawRef.current.classRows),
      sizeRows: mergeRowsById(sizeRows, rawRef.current.sizeRows),
      colorRows: mergeRowsById(colorRows, rawRef.current.colorRows),
      warehouseRows: mergeRowsById(warehouseRows, rawRef.current.warehouseRows),
      productRows: mergeRowsById(productRows, rawRef.current.productRows),
      compositeRows: mergeRowsById(compositeRows, rawRef.current.compositeRows),
      balanceRows: mergeRowsById(balanceRows, rawRef.current.balanceRows),
    };
    if (hasCatalogs) catalogsLoadedRef.current = true;
    if (hasProducts) productsLoadedRef.current = true;
    if (hasBalances) balancesLoadedRef.current = true;
    commit({
      catalogs: hasCatalogs,
      products: hasProducts,
      operations: hasBalances,
    });
  }, [commit]);

  const flushDerivedState = useCallback(() => {
    if (!catalogsLoadedRef.current) return;
    commit({
      catalogs: true,
      products: productsLoadedRef.current,
      operations: movementsLoadedRef.current || balancesLoadedRef.current,
    });
  }, [commit]);

  const loadCatalogs = useCallback(
    async (force = false) => {
      if (!force && catalogsLoadedRef.current) return;
      if (catalogsInflightRef.current) return catalogsInflightRef.current;

      const task = (async () => {
        setError(null);
        try {
          const [seasonRows, sectionRows, brandRows, classRows, sizeRows, colorRows, warehouseRows] =
            await Promise.all([
              fetchSeasons(),
              productSectionsApi.list(),
              brandsApi.list(),
              classificationsApi.list(),
              sizesApi.list(),
              colorsApi.list() as Promise<ColorCatalogItem[]>,
              fetchWarehouses(),
            ]);

          rawRef.current = {
            ...rawRef.current,
            seasonRows: mergeRowsById(seasonRows, rawRef.current.seasonRows),
            sectionRows: mergeRowsById(sectionRows, rawRef.current.sectionRows),
            brandRows: mergeRowsById(brandRows, rawRef.current.brandRows),
            classRows: mergeRowsById(classRows, rawRef.current.classRows),
            sizeRows: mergeRowsById(sizeRows, rawRef.current.sizeRows),
            colorRows: mergeRowsById(colorRows, rawRef.current.colorRows),
            warehouseRows: mergeRowsById(warehouseRows, rawRef.current.warehouseRows),
          };
          catalogsLoadedRef.current = true;
          flushDerivedState();
          setDataReady(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الإدارة');
          setDataReady(true);
        } finally {
          catalogsInflightRef.current = null;
        }
      })();

      catalogsInflightRef.current = task;
      return task;
    },
    [flushDerivedState],
  );

  const loadProductsBundle = useCallback(
    async (force = false) => {
      if (!force && productsLoadedRef.current) return;
      if (productsInflightRef.current) return productsInflightRef.current;

      const task = (async () => {
        try {
          const [productRows, compositeRows] = await Promise.all([
            fetchProducts(),
            fetchCompositeProducts(),
          ]);
          rawRef.current = {
            ...rawRef.current,
            productRows: mergeRowsById(productRows, rawRef.current.productRows),
            compositeRows: mergeRowsById(compositeRows, rawRef.current.compositeRows),
          };
          productsLoadedRef.current = true;
          flushDerivedState();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل المنتجات');
        } finally {
          productsInflightRef.current = null;
        }
      })();

      productsInflightRef.current = task;
      return task;
    },
    [flushDerivedState],
  );

  const loadMovementsBundle = useCallback(
    async (force = false) => {
      if (!force && movementsLoadedRef.current) return;
      if (movementsInflightRef.current) return movementsInflightRef.current;

      const task = (async () => {
        try {
          const [transferRows, disbursementRows, additionRows, scrapRows, countRows] =
            await Promise.all([
              fetchStockTransfers(),
              fetchStockDisbursements(),
              fetchStockAdditions(),
              fetchStockScrap(),
              fetchStockCounts(),
            ]);

          rawRef.current = {
            ...rawRef.current,
            transferRows: mergeRowsById(transferRows, rawRef.current.transferRows),
            disbursementRows: mergeRowsById(disbursementRows, rawRef.current.disbursementRows),
            additionRows: mergeRowsById(additionRows, rawRef.current.additionRows),
            scrapRows: mergeRowsById(scrapRows, rawRef.current.scrapRows),
            countRows: mergeRowsById(countRows, rawRef.current.countRows),
          };
          movementsLoadedRef.current = true;
          flushDerivedState();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل الحركات');
        } finally {
          movementsInflightRef.current = null;
        }
      })();

      movementsInflightRef.current = task;
      return task;
    },
    [flushDerivedState],
  );

  const loadBalancesBundle = useCallback(
    async (force = false) => {
      if (!force && balancesLoadedRef.current) return;
      if (balancesInflightRef.current) return balancesInflightRef.current;

      const task = (async () => {
        try {
          const balanceRows = await fetchStockBalances();
          rawRef.current = {
            ...rawRef.current,
            balanceRows: force
              ? balanceRows
              : mergeRowsById(balanceRows, rawRef.current.balanceRows),
          };
          balancesLoadedRef.current = true;
          flushDerivedState();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'تعذر تحميل الأرصدة');
        } finally {
          balancesInflightRef.current = null;
        }
      })();

      balancesInflightRef.current = task;
      return task;
    },
    [flushDerivedState],
  );

  const prefetchForScreen = useCallback(
    (screen: MontagatScreen) => {
      const jobs: Promise<void>[] = [];
      if (needsProducts(screen)) jobs.push(loadProductsBundle());
      if (needsOperations(screen)) jobs.push(loadMovementsBundle());
      if (needsBalances(screen)) jobs.push(loadBalancesBundle());
      return Promise.all(jobs);
    },
    [loadProductsBundle, loadMovementsBundle, loadBalancesBundle],
  );

  const reload = useCallback(async () => {
    catalogsLoadedRef.current = false;
    productsLoadedRef.current = false;
    movementsLoadedRef.current = false;
    balancesLoadedRef.current = false;
    await Promise.all([
      loadCatalogs(true),
      loadProductsBundle(true),
      loadMovementsBundle(true),
      loadBalancesBundle(true),
    ]);
  }, [loadCatalogs, loadProductsBundle, loadMovementsBundle, loadBalancesBundle]);

  const refreshBalancesInBackground = useCallback(() => {
    balancesLoadedRef.current = false;
    void loadBalancesBundle(true);
  }, [loadBalancesBundle]);

  const refreshMovementsInBackground = useCallback(() => {
    movementsLoadedRef.current = false;
    void loadMovementsBundle(true);
  }, [loadMovementsBundle]);

  useEffect(() => {
    void loadCatalogs();
    void prefetchForScreen(activeScreen);

    const loadBackground = () => {
      const jobs: Promise<void>[] = [];
      if (!productsLoadedRef.current && !needsProducts(activeScreen)) {
        jobs.push(loadProductsBundle());
      }
      if (!balancesLoadedRef.current && !needsBalances(activeScreen)) {
        jobs.push(loadBalancesBundle());
      }
      if (!movementsLoadedRef.current && !needsOperations(activeScreen)) {
        jobs.push(loadMovementsBundle());
      }
      if (jobs.length) void Promise.all(jobs);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(loadBackground, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(loadBackground, 300);
    return () => window.clearTimeout(timerId);
  }, [activeScreen, loadCatalogs, prefetchForScreen, loadProductsBundle, loadMovementsBundle, loadBalancesBundle]);

  const maps = () => mapsRef.current;

  const patchCatalogs = useCallback(
    (patch: Partial<RawBundle>) => {
      rawRef.current = { ...rawRef.current, ...patch };
      catalogsLoadedRef.current = true;
      commit({ catalogs: true, products: false, operations: false });
    },
    [commit],
  );

  const patchProducts = useCallback(
    (patch: Partial<Pick<RawBundle, 'productRows' | 'compositeRows'>>) => {
      rawRef.current = { ...rawRef.current, ...patch };
      productsLoadedRef.current = true;
      commit({ catalogs: false, products: true, operations: false });
    },
    [commit],
  );

  const patchOperations = useCallback(
    (patch: Partial<RawBundle>) => {
      rawRef.current = { ...rawRef.current, ...patch };
      if (patch.balanceRows) balancesLoadedRef.current = true;
      if (
        patch.transferRows ||
        patch.disbursementRows ||
        patch.additionRows ||
        patch.scrapRows ||
        patch.countRows
      ) {
        movementsLoadedRef.current = true;
      }
      commit({ catalogs: false, products: false, operations: true });
    },
    [commit],
  );

  const optimisticCatalog = async <T extends CatalogItem | ColorCatalogItem>(
    key: CatalogKey,
    optimistic: T,
    save: () => Promise<T>,
  ) => {
    const prev = rawRef.current[key];
    patchCatalogs({ [key]: [...prev, optimistic] });
    try {
      const created = await save();
      patchCatalogs({
        [key]: rawRef.current[key].map((row) => (row.id === optimistic.id ? created : row)),
      });
    } catch (e) {
      patchCatalogs({ [key]: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
      throw e;
    }
  };

  const handleAddSeason = async (season: Season) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: SeasonDto = {
      id: tempId,
      code: tempId,
      name_ar: season.name,
      name_en: season.name,
      is_open: season.isOpen,
      is_current: season.isCurrent,
      starts_at: season.startDate || null,
      ends_at: season.endDate || null,
    };
    const prev = rawRef.current.seasonRows;
    patchCatalogs({ seasonRows: [...prev, optimistic] });
    try {
      const created = await createSeason({
        code: season.code || undefined,
        name_ar: season.name,
        name_en: season.name,
        is_open: season.isOpen,
        is_current: season.isCurrent,
        starts_at: season.startDate || null,
        ends_at: season.endDate || null,
      });
      patchCatalogs({
        seasonRows: rawRef.current.seasonRows.map((s) => (s.id === tempId ? created : s)),
      });
    } catch (e) {
      patchCatalogs({ seasonRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر إضافة الموسم');
    }
  };

  const handleDeleteSeason = async (code: string) => {
    const m = maps();
    const id = m?.seasonIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.seasonRows;
    patchCatalogs({ seasonRows: prev.filter((s) => s.code !== code) });
    try {
      await updateSeason(id, { is_open: false, is_current: false });
    } catch (e) {
      patchCatalogs({ seasonRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر حذف الموسم');
    }
  };

  const handleAddDepartment = (dep: Department) =>
    optimisticCatalog(
      'sectionRows',
      { id: `tmp-${Date.now()}`, code: '', name_ar: dep.name, name_en: dep.name, is_active: true },
      () =>
        productSectionsApi.create({
          name_ar: dep.name,
          name_en: dep.name,
          code: dep.code || undefined,
        }) as Promise<CatalogItem>,
    );

  const handleDeleteDepartment = async (code: string) => {
    const id = maps()?.sectionIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.sectionRows;
    patchCatalogs({ sectionRows: prev.filter((r) => r.code !== code) });
    try {
      await productSectionsApi.remove(id);
    } catch (e) {
      patchCatalogs({ sectionRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  const handleAddBrand = (brand: Brand) =>
    optimisticCatalog(
      'brandRows',
      { id: `tmp-${Date.now()}`, code: '', name_ar: brand.name, name_en: brand.name, is_active: true },
      () =>
        brandsApi.create({
          name_ar: brand.name,
          name_en: brand.name,
          code: brand.code || undefined,
        }) as Promise<CatalogItem>,
    );

  const handleDeleteBrand = async (code: string) => {
    const id = maps()?.brandIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.brandRows;
    patchCatalogs({ brandRows: prev.filter((r) => r.code !== code) });
    try {
      await brandsApi.remove(id);
    } catch (e) {
      patchCatalogs({ brandRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  const handleAddClassification = (cls: Classification) =>
    optimisticCatalog(
      'classRows',
      { id: `tmp-${Date.now()}`, code: '', name_ar: cls.name, name_en: cls.name, is_active: true },
      () =>
        classificationsApi.create({
          name_ar: cls.name,
          name_en: cls.name,
          code: cls.code || undefined,
        }) as Promise<CatalogItem>,
    );

  const handleDeleteClassification = async (code: string) => {
    const id = maps()?.classificationIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.classRows;
    patchCatalogs({ classRows: prev.filter((r) => r.code !== code) });
    try {
      await classificationsApi.remove(id);
    } catch (e) {
      patchCatalogs({ classRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  const handleAddSize = (sz: Size) =>
    optimisticCatalog(
      'sizeRows',
      { id: `tmp-${Date.now()}`, code: '', name_ar: sz.name, name_en: sz.name, is_active: true },
      () =>
        sizesApi.create({
          name_ar: sz.name,
          name_en: sz.name,
          code: sz.code || undefined,
        }) as Promise<CatalogItem>,
    );

  const handleDeleteSize = async (code: string) => {
    const id = maps()?.sizeIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.sizeRows;
    patchCatalogs({ sizeRows: prev.filter((r) => r.code !== code) });
    try {
      await sizesApi.remove(id);
    } catch (e) {
      patchCatalogs({ sizeRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  const handleAddColor = (color: Color) =>
    optimisticCatalog(
      'colorRows',
      {
        id: `tmp-${Date.now()}`,
        code: '',
        name_ar: color.name,
        name_en: color.name,
        is_active: true,
        hex_code: color.hex,
      },
      () =>
        colorsApi.create({
          name_ar: color.name,
          name_en: color.name,
          code: color.code || undefined,
          hex_code: color.hex,
        }) as Promise<ColorCatalogItem>,
    );

  const handleDeleteColor = async (code: string) => {
    const id = maps()?.colorIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.colorRows;
    patchCatalogs({ colorRows: prev.filter((r) => r.code !== code) });
    try {
      await colorsApi.remove(id);
    } catch (e) {
      patchCatalogs({ colorRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  const handleAddWarehouse = async (wh: Warehouse) => {
    const branchId = String(
      wh.branchId ?? activeBranchId ?? authBranches[0]?.id ?? '',
    ).trim();
    if (!branchId) {
      const err = new Error('الفرع مطلوب — اختر الفرع من القائمة.');
      setError(err.message);
      throw err;
    }

    try {
      const created = await createWarehouse({
        code: wh.code.trim() || undefined,
        name_ar: wh.name,
        name_en: wh.name,
        manager_name: wh.manager,
        is_sale_outlet: wh.isDefaultSalePoint,
        primary_branch_id: branchId,
      });
      patchCatalogs({
        warehouseRows: mergeRowsById([created], rawRef.current.warehouseRows),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر إضافة المخزن';
      setError(message);
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const handleDeleteWarehouse = async (code: string) => {
    const id = maps()?.warehouseIdByCode.get(code);
    if (!id) return;
    const prev = rawRef.current.warehouseRows;
    patchCatalogs({ warehouseRows: prev.filter((w) => w.code !== code) });
    try {
      await deleteWarehouse(id);
    } catch (e) {
      patchCatalogs({ warehouseRows: prev });
      setError(e instanceof Error ? e.message : 'تعذر حذف المخزن');
    }
  };

  const handleAddProduct = async (prod: Product) => {
    const m = maps();
    if (!m) return;

    if (prod.isComposite && prod.composition?.length) {
      const lines = prod.composition
        .map((item) => {
          const fallback = [...m.variantIdByKey.entries()].find(([k]) =>
            k.startsWith(`${item.productCode}|`),
          );
          return { variant: fallback?.[1], quantity: item.quantity };
        })
        .filter((ln) => ln.variant);

      const created = await createCompositeProduct({
        code: prod.code || undefined,
        name_ar: prod.name,
        name_en: prod.name,
        barcode: prod.barcode,
        sale_price: prod.sellPrice,
        lines,
      });
      patchProducts({ compositeRows: [...rawRef.current.compositeRows, created] });
      return;
    }

    const sizeIds = [...new Set(prod.variants.map((v) => m.sizeIdByCode.get(v.sizeCode)).filter(Boolean))];
    const colorIds = [...new Set(prod.variants.map((v) => m.colorIdByCode.get(v.colorCode)).filter(Boolean))];

    const created = await createProduct({
      code: prod.code || undefined,
      name_ar: prod.name,
      name_en: prod.name,
      description: prod.description || '',
      barcode: prod.barcode,
      purchase_price: prod.buyPrice,
      sale_price: prod.sellPrice,
      brand: m.brandIdByCode.get(prod.brandCode) || null,
      section: m.sectionIdByCode.get(prod.departmentCode) || null,
      classification: m.classificationIdByCode.get(prod.classificationCode) || null,
      season: m.seasonIdByCode.get(prod.seasonCode) || null,
      size_ids: sizeIds,
      color_ids: colorIds,
    });
    patchProducts({ productRows: [...rawRef.current.productRows, created] });
    refreshBalancesInBackground();
  };

  const handleDeleteProduct = async (code: string) => {
    const m = maps();
    if (!m) return;
    const productId = m.productIdByCode.get(code);
    const compositeId = m.compositeIdByCode.get(code);
    const prevProducts = rawRef.current.productRows;
    const prevComposites = rawRef.current.compositeRows;

    if (compositeId) {
      patchProducts({ compositeRows: prevComposites.filter((c) => c.code !== code) });
      try {
        await deleteCompositeProduct(compositeId);
      } catch (e) {
        patchProducts({ compositeRows: prevComposites });
        setError(e instanceof Error ? e.message : 'تعذر الحذف');
      }
      return;
    }

    if (productId) {
      patchProducts({ productRows: prevProducts.filter((p) => p.code !== code) });
      try {
        await deleteProduct(productId);
        refreshBalancesInBackground();
      } catch (e) {
        patchProducts({ productRows: prevProducts });
        setError(e instanceof Error ? e.message : 'تعذر الحذف');
      }
    }
  };

  const handleUpdateBalance = async (id: string, qty: number) => {
    const m = maps();
    const row = balances.find((b) => b.id === id);
    if (!m || !row) return;
    const delta = qty - row.quantity;
    if (delta === 0) return;

    const variantId = m.variantIdByKey.get(
      variantKey(row.productCode, row.sizeCode, row.colorCode),
    );
    const warehouseId = m.warehouseIdByCode.get(row.warehouseCode);
    if (!variantId || !warehouseId) return;

    setBalances((prev) => prev.map((b) => (b.id === id ? { ...b, quantity: qty } : b)));

    try {
      if (delta > 0) {
        const created = await createStockAddition({
          warehouse: warehouseId,
          purpose: 'other',
          notes: 'تعديل رصيد من شاشة الإدارة',
          lines: [{ variant: variantId, quantity: delta }],
        });
        if (created.status !== 'approved') await approveStockAddition(created.id);
        patchOperations({ additionRows: [created, ...rawRef.current.additionRows] });
      } else {
        const created = await createStockDisbursement({
          warehouse: warehouseId,
          purpose: 'other',
          notes: 'تعديل رصيد من شاشة الإدارة',
          lines: [{ variant: variantId, quantity: Math.abs(delta) }],
        });
        if (created.status !== 'approved') await approveStockDisbursement(created.id);
        patchOperations({ disbursementRows: [created, ...rawRef.current.disbursementRows] });
      }
    } catch (e) {
      refreshBalancesInBackground();
      setError(e instanceof Error ? e.message : 'تعذر تعديل الرصيد');
    }
  };

  const handleAddPermit = async (permit: MovementPermit) => {
    const m = maps();
    if (!m) return;

    const lines = permit.items
      .map((item) => {
        const variantId =
          item.variantId ??
          m.variantIdByKey.get(variantKey(item.productCode, item.sizeCode, item.colorCode));
        return variantId ? { variant: variantId, quantity: item.quantity } : null;
      })
      .filter(Boolean) as Array<{ variant: string; quantity: number }>;

    if (!lines.length) {
      setError('تعذر ربط الأصناف — تأكد من اختيار SKU صحيح (مقاس/لون) لكل صنف.');
      return;
    }

    try {
      if (permit.type === 'transfer') {
        const payload: Record<string, unknown> = {
          transfer_type: 'warehouse_warehouse',
          from_warehouse: m.warehouseIdByCode.get(permit.fromWarehouseCode || ''),
          to_warehouse: m.warehouseIdByCode.get(permit.toWarehouseCode || ''),
          notes: permit.notes || '',
          lines,
          requires_approval: permit.requiresManagerApproval,
        };
        if (permit.requiresManagerApproval) {
          payload.submit = true;
        } else {
          payload.approve = true;
        }
        const created = await createStockTransfer(payload);
        patchOperations({ transferRows: [created, ...rawRef.current.transferRows] });
      } else if (permit.type === 'addition') {
        let created = await createStockAddition({
          warehouse: m.warehouseIdByCode.get(permit.toWarehouseCode || ''),
          purpose: permit.purposeKey || 'other',
          notes: permit.notes || '',
          lines,
          approve: true,
        });
        patchOperations({ additionRows: [created, ...rawRef.current.additionRows] });
      } else if (permit.type === 'disbursement') {
        let created = await createStockDisbursement({
          warehouse: m.warehouseIdByCode.get(permit.fromWarehouseCode || ''),
          purpose: permit.purposeKey || 'other',
          notes: permit.notes || '',
          lines,
          approve: true,
        });
        patchOperations({ disbursementRows: [created, ...rawRef.current.disbursementRows] });
      } else if (permit.type === 'scrap') {
        let created = await createStockScrap({
          warehouse: m.warehouseIdByCode.get(permit.fromWarehouseCode || ''),
          reason: permit.reason || 'other',
          notes: permit.notes || '',
          lines,
          approve: true,
        });
        patchOperations({ scrapRows: [created, ...rawRef.current.scrapRows] });
      }
      refreshBalancesInBackground();
      refreshMovementsInBackground();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الإذن');
      refreshMovementsInBackground();
      throw e;
    }
  };

  const handleApprovePermit = async (permit: MovementPermit) => {
    if (!permit.id) {
      setError('لا يمكن اعتماد هذا الإذن — معرّف السجل غير متوفر.');
      return;
    }
    try {
      if (permit.type === 'transfer') {
        const approved = await approveStockTransfer(permit.id);
        rawRef.current = {
          ...rawRef.current,
          transferRows: rawRef.current.transferRows.map((r) =>
            r.id === approved.id ? approved : r,
          ),
        };
      } else if (permit.type === 'disbursement') {
        const approved = await approveStockDisbursement(permit.id);
        rawRef.current = {
          ...rawRef.current,
          disbursementRows: rawRef.current.disbursementRows.map((r) =>
            r.id === approved.id ? approved : r,
          ),
        };
      } else if (permit.type === 'addition') {
        const approved = await approveStockAddition(permit.id);
        rawRef.current = {
          ...rawRef.current,
          additionRows: rawRef.current.additionRows.map((r) =>
            r.id === approved.id ? approved : r,
          ),
        };
      } else if (permit.type === 'scrap') {
        const approved = await approveStockScrap(permit.id);
        rawRef.current = {
          ...rawRef.current,
          scrapRows: rawRef.current.scrapRows.map((r) =>
            r.id === approved.id ? approved : r,
          ),
        };
      } else {
        return;
      }
      commit({ catalogs: false, products: false, operations: true });
      refreshBalancesInBackground();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر اعتماد الإذن');
      throw e;
    }
  };

  const handleAddAudit = async (audit: InventoryAudit) => {
    const m = maps();
    if (!m) {
      throw new Error('البيانات غير جاهزة بعد.');
    }
    const warehouseId = m.warehouseIdByCode.get(audit.warehouseCode);
    if (!warehouseId) {
      throw new Error('المستودع غير موجود.');
    }

    await loadBalancesBundle(true);
    const balanceRows = rawRef.current.balanceRows;
    const rowsForWarehouse = balanceRows.filter((b) => b.warehouse === warehouseId);

    if (!rowsForWarehouse.length) {
      throw new Error(
        'لا توجد أرصدة في هذا المستودع على السيرفر — أضف بضاعة عبر شراء أو إذن إضافة مخزن أولاً.',
      );
    }

    const actualByVariant = buildActualQtyByVariantFromAudit(audit, warehouseId, balanceRows, m);

    try {
      // Same flow as StockCountWorkspace: server builds lines from warehouse balances.
      let created = await createStockCount({
        warehouse: warehouseId,
        count_mode: 'filter',
        notes: audit.notes || audit.scope,
      });

      if (!created.lines?.length) {
        throw new Error('لا توجد أرصدة لجردها في هذا المستودع على السيرفر.');
      }

      const lineUpdates = created.lines.map((ln) => ({
        id: ln.id,
        counted_qty: actualByVariant.has(ln.variant)
          ? actualByVariant.get(ln.variant)!
          : parseFloat(ln.system_qty) || 0,
      }));
      created = await updateStockCount(created.id, { lines: lineUpdates });

      if (audit.status === 'completed') {
        created = await approveStockCount(created.id);
      }

      patchOperations({ countRows: [created, ...rawRef.current.countRows] });
      if (audit.status === 'completed') refreshBalancesInBackground();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر حفظ الجرد';
      setError(message);
      throw e instanceof Error ? e : new Error(message);
    }
  };

  return {
    seasons,
    departments,
    brands,
    classifications,
    sizes,
    colors,
    warehouses,
    products,
    balances,
    permits,
    audits,
    dataReady,
    error,
    reload,
    handleAddSeason,
    handleDeleteSeason,
    handleAddDepartment,
    handleDeleteDepartment,
    handleAddBrand,
    handleDeleteBrand,
    handleAddClassification,
    handleDeleteClassification,
    handleAddSize,
    handleDeleteSize,
    handleAddColor,
    handleDeleteColor,
    handleAddWarehouse,
    handleDeleteWarehouse,
    handleAddProduct,
    handleDeleteProduct,
    handleUpdateBalance,
    handleAddPermit,
    handleApprovePermit,
    handleAddAudit,
  };
}

export type MontagatDataValue = ReturnType<typeof useMontagatDataInternal>;
