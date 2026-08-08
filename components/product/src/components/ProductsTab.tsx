import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Layers,
  Boxes,
  Tag,
  Shirt,
  Ruler,
  Palette,
  Plus,
  Edit2,
  Trash2,
  Package,
  Check,
  X,
  Search,
  Filter,
  Settings,
  List,
  Eye,
  Percent,
  TrendingUp,
  DollarSign,
  Copy,
  Sliders,
  Sparkles,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Grid,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ArrowRightLeft,
  Calendar,
  Layers2,
  User,
  Printer,
  Maximize2,
  Minimize2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ExportDataButton } from "./ui/ExportDataButton";
import { ProductsListContainer } from "./ProductsListContainer";
import { ProductTablePagination } from "./ProductTablePagination";
import { CompositeItemsTab, CompositeItem } from "./CompositeItemsTab";
import { BundledItemsTab, BundledItem } from "./BundledItemsTab";
import { BarcodePrintingTab } from "./BarcodePrintingTab";
import { PriceModificationTab } from "./PriceModificationTab";
import { InventoryCheckTab } from "./InventoryCheckTab";
import { ProductReportsTab } from "./ProductReportsTab";

interface ProductsTabProps {
  lang: "ar" | "en";
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  products: any[];
  setProducts: (products: any[]) => void;
  compositeItems?: CompositeItem[];
  setCompositeItems?: (items: CompositeItem[]) => void;
  bundledItems?: BundledItem[];
  setBundledItems?: (items: BundledItem[]) => void;
  selectedBranches: string[];
}

export function ProductsTab({
  lang,
  activeSubTab,
  setActiveSubTab,
  products,
  setProducts,
  compositeItems = [],
  setCompositeItems = () => {},
  bundledItems = [],
  setBundledItems = () => {},
  selectedBranches,
}: ProductsTabProps) {
  // Toast notifications trigger function helper
  const triggerToast = (msg: string) => {
    // We can use a browser alert or simple console, but let's provide custom feedback state if needed.
    // However, App.tsx's showStateToast is usually passed down or we can simulate alert/toast style inside our file.
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [maximizedBox, setMaximizedBox] = useState<string | null>(null);
  /** Search opens together with full-card maximize (like org structure). */
  const [catSearchOpen, setCatSearchOpen] = useState<Record<string, boolean>>({});
  /** Orange chevron collapses/expands the card list. */
  const [catDataCollapsed, setCatDataCollapsed] = useState<Record<string, boolean>>({});
  const handleCatMaximize = (key: string) => {
    if (maximizedBox === key) {
      setMaximizedBox(null);
      setCatSearchOpen((prev) => ({ ...prev, [key]: false }));
    } else {
      setMaximizedBox(key);
      setCatSearchOpen((prev) => ({ ...prev, [key]: true }));
    }
  };
  const toggleCatData = (key: string) =>
    setCatDataCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const catCircleBtn =
    "w-7 h-7 rounded-full border-[2.5px] border-orange-500 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer shrink-0";
  const catCircleBtnFill = `${catCircleBtn} bg-orange-50 text-orange-500 hover:bg-orange-100`;
  const catCircleBtnOutline = `${catCircleBtn} bg-white text-orange-500 hover:bg-orange-50`;

  // 1. الأقسام (Product Divisions / Departments)
  const [divisions, setDivisions] = useState([
    { id: "DIV1", nameAr: "ملابس حريمي", nameEn: "Women's Apparel" },
    { id: "DIV2", nameAr: "ملابس رجالي", nameEn: "Men's Apparel" },
    { id: "DIV3", nameAr: "ملابس أطفال", nameEn: "Kids & Infants" },
    { id: "DIV4", nameAr: "أحذية وحقائب", nameEn: "Shoes & Bags" },
  ]);

  // 2. المجموعات (Product Groups)
  const [groups, setGroups] = useState([
    {
      id: "GRP1",
      nameAr: "أصناف لا تكرر",
      nameEn: "Non-Repeatable Items",
      color: "bg-rose-500",
    },
    {
      id: "GRP2",
      nameAr: "أصناف راكدة",
      nameEn: "Slow-Moving Inventory",
      color: "bg-amber-500",
    },
    {
      id: "GRP3",
      nameAr: "أصناف قديمة تصفية",
      nameEn: "Clearance & Older stock",
      color: "bg-slate-400",
    },
    {
      id: "GRP4",
      nameAr: "مجموعة موسم الأعياد",
      nameEn: "Holiday Festival Group",
      color: "bg-emerald-500",
    },
  ]);

  // 3. العلامات التجارية (Brands)
  const [brands, setBrands] = useState([
    { id: "BRD1", nameAr: "أديداس", nameEn: "Adidas", country: "Germany" },
    { id: "BRD2", nameAr: "بوما", nameEn: "Puma", country: "Germany" },
    { id: "BRD3", nameAr: "نايك", nameEn: "Nike", country: "USA" },
    { id: "BRD4", nameAr: "زارا", nameEn: "Zara", country: "Spain" },
  ]);

  // 4. البند (Items)
  const [items, setItems] = useState([
    { id: "ITM1", nameAr: "بنطلون", nameEn: "Pants", divisionId: "DIV1" },
    { id: "ITM2", nameAr: "عباية", nameEn: "Abaya", divisionId: "DIV1" },
    {
      id: "ITM3",
      nameAr: "قميص كاجوال",
      nameEn: "Casual Shirt",
      divisionId: "DIV2",
    },
    {
      id: "ITM4",
      nameAr: "تي شيرت قطني",
      nameEn: "Cotton T-Shirt",
      divisionId: "DIV3",
    },
  ]);

  // 5. المقاسات (Sizes)
  const [sizes, setSizes] = useState([
    { id: "SZ1", nameAr: "XL مقاس كبير", nameEn: "Extra Large (XL)" },
    { id: "SZ2", nameAr: "M مقاس عادي", nameEn: "Medium Size (M)" },
    { id: "SZ3", nameAr: "مقاس 42 أوروبي", nameEn: "Size 42 EU" },
    { id: "SZ4", nameAr: "مقاس 44 أوروبي", nameEn: "Size 44 EU" },
  ]);

  // 6. الألوان (Colors)
  const [colors, setColors] = useState([
    { id: "CLR1", nameAr: "أحمر قاني", nameEn: "Crimson Red", hex: "#ef4444" },
    {
      id: "CLR2",
      nameAr: "أخضر زيتوني",
      nameEn: "Olive Green",
      hex: "#16a34a",
    },
    {
      id: "CLR3",
      nameAr: "أسود*أبيض مخطط",
      nameEn: "Black & White Striped",
      hex: "#000000",
    },
    { id: "CLR4", nameAr: "أزرق كحلي", nameEn: "Navy Blue", hex: "#1e3a8a" },
  ]);

  // Search and filter states
  const [searchDivision, setSearchDivision] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [searchSize, setSearchSize] = useState("");
  const [searchColor, setSearchColor] = useState("");

  // --- Products Registry Tab States ---
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [dirViewMode, setDirViewMode] = useState<"table" | "kanban">("table");
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [globalReorderLimit, setGlobalReorderLimit] = useState(15);
  const [isReorderSettingsOpen, setIsReorderSettingsOpen] = useState(false);

  // Pagination states
  const [prodCurrentPage, setProdCurrentPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(5);

  // Advanced search inputs
  const [advCode, setAdvCode] = useState("");
  const [advBarcode, setAdvBarcode] = useState("");
  const [advBrandId, setAdvBrandId] = useState("ALL");
  const [advGroupId, setAdvGroupId] = useState("ALL");
  const [advColorId, setAdvColorId] = useState("ALL");
  const [advSizeId, setAdvSizeId] = useState("ALL");
  const [advDivisionId, setAdvDivisionId] = useState("ALL");
  const [advItemId, setAdvItemId] = useState("ALL");
  const [advSupplierName, setAdvSupplierName] = useState("");

  // Column Customization flags
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      code: true,
      barcode: true,
      name: true,
      brand: true,
      group: true,
      color: true,
      size: true,
      division: true,
      item: true,
      costPrice: true,
      profitMargin: true,
      sellPrice: true,
      promoPrice: true,
      supplierName: true,
      reorderPoint: true,
    },
  );
  const [tempVisibleColumns, setTempVisibleColumns] = useState<
    Record<string, boolean>
  >({ ...visibleColumns });

  // View & Edit product state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [viewingTab, setViewingTab] = useState<
    "specs" | "movement" | "promotions"
  >("specs");
  const [movementBranch, setMovementBranch] = useState<string>("all");
  const [movementStartDate, setMovementStartDate] =
    useState<string>("2026-01-01");
  const [movementEndDate, setMovementEndDate] = useState<string>("2026-12-31");

  // New Promotion Sub-Form state (inside viewingProduct details)
  const [newPromoOfferNo, setNewPromoOfferNo] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState(0);

  // Form states for creating/editing product
  const [formCode, setFormCode] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formAutoBarcode, setFormAutoBarcode] = useState(true);
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formMainImage, setFormMainImage] = useState<string | null>(null);
  const [formSubImages, setFormSubImages] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [formBrandId, setFormBrandId] = useState("BRD1");
  const [formGroupId, setFormGroupId] = useState("GRP1");
  const [formColorId, setFormColorId] = useState("CLR1");
  const [formSizeId, setFormSizeId] = useState("SZ1");
  const [formDivisionId, setFormDivisionId] = useState("DIV1");
  const [formItemId, setFormItemId] = useState("ITM1");
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formProfitMargin, setFormProfitMargin] = useState(40);
  const [formSellPrice, setFormSellPrice] = useState(0);
  const [formPromoPrice, setFormPromoPrice] = useState<number | "">("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formIsCustomReorder, setFormIsCustomReorder] = useState(false);
  const [formReorderPoint, setFormReorderPoint] = useState(15);
  const [formQty, setFormQty] = useState(10);
  const [formReorderSalePercent, setFormReorderSalePercent] = useState(50);
  const [formIsReorderSaleActive, setFormIsReorderSaleActive] = useState(false);
  const [formSeason, setFormSeason] = useState("");
  const [formHasVariants, setFormHasVariants] = useState(false);
  const [formVariants, setFormVariants] = useState<any[]>([]);
  // ------------------------------------

  // Modal forms management states
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'division' | 'group' | 'brand' | 'item' | 'size' | 'color'
  const [editingId, setEditingId] = useState<string | null>(null);

  // Common input states
  const [modalNameAr, setModalNameAr] = useState("");
  const [modalNameEn, setModalNameEn] = useState("");

  // Specific input states
  const [selectedColor, setSelectedColor] = useState("bg-blue-500"); // for groups
  const [brandCountry, setBrandCountry] = useState(""); // for brands
  const [itemDivisionId, setItemDivisionId] = useState("DIV1"); // for items
  const [colorHex, setColorHex] = useState("#000000"); // for colors

  // --- Transfer Orders State ---
  const [transfers, setTransfers] = useState<any[]>(() => {
    const mockDestructions = Array.from({ length: 10 }, (_, i) => ({
      id: `DES-200${i + 1}`,
      type: "item-destruction",
      fromBranch: i % 2 === 0 ? "فرع الممر" : "فرع المسرح الروماني",
      toBranch: "اهلاك الاصناف",
      date: `2026-07-0${(i % 9) + 1}`,
      username: i % 3 === 0 ? "هاني دياب" : "أحمد علي",
      status: i % 4 === 0 ? "approved" : i % 4 === 1 ? "pending" : i % 4 === 2 ? "rejected" : "pending",
      notes: [
        "تلف ناتج عن سوء التخزين",
        "انتهاء الصلاحية",
        "عيب صناعة جسيم",
        "حريق بسيط في المخزن",
        "تلف ناتج عن النقل",
        "تجربة فحص الجودة",
        "فقدان جزء من الشحنة",
        "تمزيق في القماش",
        "بهتان في الألوان",
        "أخرى - مبرر إداري"
      ][i],
      items: [
        {
          id: `P200${i}`,
          code: `ITM-D-${i}`,
          barcode: `887766${i}`,
          nameAr: `منتج تالف ${i + 1}`,
          nameEn: `Damaged Item ${i + 1}`,
          quantity: (i + 1) * 2,
          buyPrice: 150 + i * 10,
          currentStock: 50,
        }
      ],
    }));

    const cached = localStorage.getItem("transfer_orders");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // If no destruction records exist, inject them
        if (!parsed.some((t: any) => t.type === "item-destruction")) {
          return [...parsed, ...mockDestructions];
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "TRF-1001",
        type: "item-transfer",
        fromBranch: "فرع الممر",
        toBranch: "فرع المسرح الروماني",
        date: "2026-06-25",
        username: "هاني دياب",
        status: "approved", // approved, pending, rejected
        notes: "بضائع الموسم الصيفي عاجل",
        items: [
          {
            id: "P1001",
            code: "BL-992",
            barcode: "123487",
            nameAr: "بلوزه حريمي حورس",
            nameEn: "Horus Women Blouse",
            quantity: 10,
            buyPrice: 250,
            currentStock: 2,
          },
          {
            id: "P1002",
            code: "PT-881",
            barcode: "545444",
            nameAr: "بنطلون رجالي",
            nameEn: "Men Trousers",
            quantity: 1,
            buyPrice: 500,
            currentStock: 0,
          },
        ],
      },
      {
        id: "TRF-1002",
        fromBranch: "فرع السيدة زينب",
        toBranch: "فرع شبرا",
        date: "2026-06-25",
        username: "أحمد علي",
        status: "pending",
        notes: "تصفية الرصيد الراكد",
        items: [
          {
            id: "P1003",
            code: "SH-302",
            barcode: "998234",
            nameAr: "قميص كاجوال",
            nameEn: "Casual Shirt",
            quantity: 5,
            buyPrice: 180,
            currentStock: 12,
          },
        ],
      },
      ...mockDestructions
    ];
  });

  useEffect(() => {
    localStorage.setItem("transfer_orders", JSON.stringify(transfers));
  }, [transfers]);

  // Search/Filter query for transfers
  const [transferSearchQuery, setTransferSearchQuery] = useState("");

  // Transfer form field states
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [transferFormEditingId, setTransferFormEditingId] = useState<
    string | null
  >(null); // null if new, else order id
  const [tfFromBranch, setTfFromBranch] = useState("فرع الممر");
  const [tfToBranch, setTfToBranch] = useState("فرع المسرح الروماني");
  const [tfDate, setTfDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [tfUsername, setTfUsername] = useState("هاني دياب");
  const [tfStatus, setTfStatus] = useState("pending");
  const [tfNotes, setTfNotes] = useState("");
  const [tfItems, setTfItems] = useState<any[]>([]);
  const [tfPrintType, setTfPrintType] = useState<"a4" | "a5" | "thermal">("a4");

  // Selected item to be added to the items list inside the modal
  const [tfSelectedProductId, setTfSelectedProductId] = useState("");
  const [tfItemQty, setTfItemQty] = useState<number | "">("");

  // Refs for focusing search input and quantity input in the transfer order modal
  const tfProductSearchInputRef = useRef<HTMLInputElement | null>(null);
  const tfQtyInputRef = useRef<HTMLInputElement | null>(null);

  // Search query state for selecting products inside transfer modal
  const [tfProductSearchQuery, setTfProductSearchQuery] = useState("");
  const [tfProductSearchFocused, setTfProductSearchFocused] = useState(false);
  const [tfProductHighlightedIndex, setTfProductHighlightedIndex] = useState(0);

  // View transfer detail modal state
  const [viewingTransfer, setViewingTransfer] = useState<any | null>(null);
  const [trfPage, setTrfPage] = useState(1);
  const [trfPageSize, setTrfPageSize] = useState(5);
  const [trfViewMode, setTrfViewMode] = useState<"table" | "kanban">("table");
  const [trfColumnSettingsOpen, setTrfColumnSettingsOpen] = useState(false);
  const [isTrfColumnFiltersOpen, setIsTrfColumnFiltersOpen] = useState(false);

  // Advanced transfer search fields
  const [advTrfId, setAdvTrfId] = useState("");
  const [advTrfFromBranch, setAdvTrfFromBranch] = useState("ALL");
  const [advTrfToBranch, setAdvTrfToBranch] = useState("ALL");
  const [advTrfStatus, setAdvTrfStatus] = useState("ALL");
  const [advTrfUsername, setAdvTrfUsername] = useState("");

  // Column visibility for transfers
  const [trfVisibleColumns, setTrfVisibleColumns] = useState<
    Record<string, boolean>
  >({
    id: true,
    fromBranch: true,
    toBranch: true,
    totalQty: true,
    totalValue: true,
    status: true,
    username: true,
    notes: true,
  });
  const [tempTrfVisibleColumns, setTempTrfVisibleColumns] = useState<
    Record<string, boolean>
  >({
    id: true,
    fromBranch: true,
    toBranch: true,
    totalQty: true,
    totalValue: true,
    status: true,
    username: true,
    notes: true,
  });

  const branchesList = [
    "فرع الممر",
    "فرع المسرح الروماني",
    "فرع السيدة زينب",
    "فرع شبرا",
    "فرع المنصورة",
    "فرع التجمع",
  ];

  const accountsList = [
    ...branchesList,
    "المخزن الرئيسي",
    "مخزن العبور",
    "مخزن جدة",
    "حساب المبيعات",
    "حساب المشتريات",
    "حساب المصروفات العامة",
    "حساب رواتب الموظفين",
    "حساب البنك (Visa)",
    "الخزينة الرئيسية (Cash)",
    "اهلاك الاصناف",
  ];

  // --- Normalize Products List ---
  const richProducts = useMemo(() => {
    return (products || []).map((p: any) => {
      // Safely default each lookup property
      const pCost = p.costPrice || 0;
      const pSell = p.sellPrice || 0;
      const computedMargin =
        p.profitMargin !== undefined
          ? p.profitMargin
          : Math.round(((pSell - pCost) / (pCost || 1)) * 100) || 40;
      const pQty = p.qty !== undefined ? p.qty : 10;
      const pInitialQty = p.initialQty !== undefined ? p.initialQty : pQty;
      const pReorderSalePercent =
        p.reorderSalePercent !== undefined ? p.reorderSalePercent : 50;
      const pReorderPoint = p.reorderPoint !== undefined ? p.reorderPoint : 15;

      const soldQty = Math.max(0, pInitialQty - pQty);
      const salesPercent = pInitialQty > 0 ? (soldQty / pInitialQty) * 100 : 0;
      const hasReachedSalePercent =
        pReorderSalePercent > 0 ? salesPercent >= pReorderSalePercent : false;
      const isBelowReorder = pQty <= pReorderPoint || hasReachedSalePercent;

      return {
        id: p.id || `P${Math.floor(Math.random() * 10000)}`,
        code: p.code || `SKU-${p.id}`,
        barcode: p.barcode || `2026${p.id || "99"}`,
        nameAr: p.nameAr || p.name || "صنف افتراضي",
        nameEn: p.nameEn || p.name || "Default Item",
        brandId: p.brandId || "BRD1",
        groupId: p.groupId || "GRP1",
        colorId: p.colorId || "CLR1",
        sizeId: p.sizeId || "SZ1",
        divisionId: p.divisionId || "DIV1",
        itemId: p.itemId || "ITM1",
        costPrice: pCost,
        profitMargin: computedMargin,
        sellPrice: pSell,
        promoPrice: p.promoPrice || null,
        promoDetails: p.promoDetails || [
          {
            offerNo: "OFF-101",
            currentCost: pCost || 12.0,
            discountValue: Math.round(pSell * 0.15),
            promoSellPrice: Math.round(pSell * 0.85),
          },
        ],
        supplierName: p.supplierName || "شركة توريدات المحبة",
        reorderPoint: pReorderPoint,
        isCustomReorderPoint: p.isCustomReorderPoint || false,
        qty: pQty,
        initialQty: pInitialQty,
        reorderSalePercent: pReorderSalePercent,
        status:
          pQty === 0
            ? "Out of Stock"
            : isBelowReorder
              ? "Low Stock"
              : "In Stock",
      };
    });
  }, [products]);

  // Filter products for the transfer modal selection based on barcode, nameAr, nameEn, or code (model)
  const tfFilteredProductsList = useMemo(() => {
    const q = (tfProductSearchQuery || "").trim().toLowerCase();
    if (!q) return [];
    return richProducts
      .filter((p: any) => {
        return (
          (p.nameAr || "").toLowerCase().includes(q) ||
          (p.nameEn || "").toLowerCase().includes(q) ||
          (p.code || "").toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8); // Limit to top 8 results for better performance and clean UI
  }, [richProducts, tfProductSearchQuery]);

  const handleSelectProduct = (prod: any) => {
    setTfSelectedProductId(prod.id);
    setTfProductSearchQuery(prod.nameAr || prod.nameEn || "");
    setTfProductSearchFocused(false);
    setTimeout(() => {
      tfQtyInputRef.current?.focus();
      tfQtyInputRef.current?.select();
    }, 50);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return richProducts.filter((p: any) => {
      // 1. Global Search
      const search = prodSearchQuery.toLowerCase().trim();
      if (search) {
        const matchesGlobal =
          p.code.toLowerCase().includes(search) ||
          p.barcode.toLowerCase().includes(search) ||
          p.nameAr.toLowerCase().includes(search) ||
          p.nameEn.toLowerCase().includes(search) ||
          p.supplierName.toLowerCase().includes(search);
        if (!matchesGlobal) return false;
      }

      // 2. Advanced filters
      if (advCode && !p.code.toLowerCase().includes(advCode.toLowerCase()))
        return false;
      if (
        advBarcode &&
        !p.barcode.toLowerCase().includes(advBarcode.toLowerCase())
      )
        return false;
      if (advBrandId !== "ALL" && p.brandId !== advBrandId) return false;
      if (advGroupId !== "ALL" && p.groupId !== advGroupId) return false;
      if (advColorId !== "ALL" && p.colorId !== advColorId) return false;
      if (advSizeId !== "ALL" && p.sizeId !== advSizeId) return false;
      if (advDivisionId !== "ALL" && p.divisionId !== advDivisionId)
        return false;
      if (advItemId !== "ALL" && p.itemId !== advItemId) return false;
      if (
        advSupplierName &&
        !p.supplierName.toLowerCase().includes(advSupplierName.toLowerCase())
      )
        return false;

      return true;
    });
  }, [
    richProducts,
    prodSearchQuery,
    advCode,
    advBarcode,
    advBrandId,
    advGroupId,
    advColorId,
    advSizeId,
    advDivisionId,
    advItemId,
    advSupplierName,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setProdCurrentPage(1);
  }, [
    prodSearchQuery,
    advCode,
    advBarcode,
    advBrandId,
    advGroupId,
    advColorId,
    advSizeId,
    advDivisionId,
    advItemId,
    advSupplierName,
  ]);

  // Pagination calculation
  const totalProdPages = Math.ceil(filteredProducts.length / prodPageSize) || 1;
  const activeProdPage = Math.min(prodCurrentPage, totalProdPages);
  const prodStartIndex = (activeProdPage - 1) * prodPageSize;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      prodStartIndex,
      prodStartIndex + prodPageSize,
    );
  }, [filteredProducts, prodStartIndex, prodPageSize]);

  // --- Product Forms Handlers ---
  const openAddProductModal = () => {
    setEditingProduct("NEW"); // Indicator for modal open
    setFormCode(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`2026${Math.floor(10000000 + Math.random() * 90000000)}`);
    setFormAutoBarcode(true);
    setFormNameAr("");
    setFormNameEn("");
    setFormMainImage(null);
    setFormSubImages([null, null, null]);
    setFormBrandId(brands[0]?.id || "BRD1");
    setFormGroupId(groups[0]?.id || "GRP1");
    setFormColorId(colors[0]?.id || "CLR1");
    setFormSizeId(sizes[0]?.id || "SZ1");
    setFormDivisionId(divisions[0]?.id || "DIV1");
    setFormItemId(items[0]?.id || "ITM1");
    setFormCostPrice(0);
    setFormProfitMargin(40);
    setFormSellPrice(0);
    setFormPromoPrice("");
    setFormSupplierName("");
    setFormIsCustomReorder(false);
    setFormReorderPoint(globalReorderLimit);
    setFormQty(0);
    setFormReorderSalePercent(50);
    setFormIsReorderSaleActive(false);
    setFormHasVariants(false);
    setFormVariants([
      {
        sizeId: sizes[0]?.id || "SZ1",
        colorId: colors[0]?.id || "CLR1",
        costPrice: 0,
        sellPrice: 0,
        barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
        autoBarcode: true,
      },
    ]);
  };

  const openEditProductModal = (p: any) => {
    setEditingProduct(p);
    setFormCode(p.code);
    setFormBarcode(p.barcode);
    setFormAutoBarcode(false);
    setFormNameAr(p.nameAr);
    setFormNameEn(p.nameEn);
    setFormMainImage(p.mainImage || null);
    setFormSubImages(p.subImages || [null, null, null]);
    setFormBrandId(p.brandId);
    setFormGroupId(p.groupId);
    setFormColorId(p.colorId);
    setFormSizeId(p.sizeId);
    setFormDivisionId(p.divisionId);
    setFormItemId(p.itemId);
    setFormCostPrice(p.costPrice);
    setFormProfitMargin(p.profitMargin);
    setFormSellPrice(p.sellPrice);
    setFormPromoPrice(
      p.promoPrice !== null && p.promoPrice !== undefined ? p.promoPrice : "",
    );
    setFormSupplierName(p.supplierName);
    setFormIsCustomReorder(p.isCustomReorderPoint);
    setFormReorderPoint(p.reorderPoint);
    setFormQty(p.qty);
    setFormReorderSalePercent(
      p.reorderSalePercent !== undefined && p.reorderSalePercent > 0
        ? p.reorderSalePercent
        : 50,
    );
    setFormIsReorderSaleActive(
      p.reorderSalePercent !== undefined && p.reorderSalePercent > 0,
    );
    const hasVar = p.variants && p.variants.length > 0;
    setFormHasVariants(hasVar);
    setFormVariants(
      hasVar
        ? p.variants
        : [
            {
              sizeId: sizes[0]?.id || "SZ1",
              colorId: colors[0]?.id || "CLR1",
              costPrice: p.costPrice || 0,
              sellPrice: p.sellPrice || 0,
              barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
              autoBarcode: true,
            },
          ],
    );
  };

  const handleAutoBarcodeChange = (checked: boolean) => {
    setFormAutoBarcode(checked);
    if (checked) {
      setFormBarcode(`2026${Math.floor(10000000 + Math.random() * 90000000)}`);
    }
  };

  const handleAddVariantRow = () => {
    setFormVariants((prev) => [
      ...prev,
      {
        sizeId: sizes[0]?.id || "SZ1",
        colorId: colors[0]?.id || "CLR1",
        costPrice: Number(formCostPrice) || 0,
        sellPrice: Number(formSellPrice) || 0,
        barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
        autoBarcode: true,
      },
    ]);
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    setFormVariants((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, [field]: value };
          if (field === "autoBarcode" && value === true) {
            updated.barcode = `2026${Math.floor(10000000 + Math.random() * 90000000)}`;
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const handleDeleteVariant = (index: number) => {
    setFormVariants((prev) => {
      if (prev.length <= 1) {
        return [
          {
            sizeId: sizes[0]?.id || "SZ1",
            colorId: colors[0]?.id || "CLR1",
            costPrice: Number(formCostPrice) || 0,
            sellPrice: Number(formSellPrice) || 0,
            barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
            autoBarcode: true,
          },
        ];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleVariantKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddVariantRow();
    }
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim() && !formNameEn.trim()) {
      triggerToast(
        lang === "ar"
          ? "الرجاء إدخال اسم أو وصف للصنف"
          : "Please enter a name or description",
      );
      return;
    }

    if (formSellPrice <= 0) {
      triggerToast(
        lang === "ar" ? "الرجاء إدخال سعر البيع" : "Please enter Selling Price",
      );
      return;
    }

    const calculatedSellPrice =
      formSellPrice || formCostPrice * (1 + formProfitMargin / 100);

    const isNew = editingProduct === "NEW";
    const finalQty = Number(formQty);
    const existingInitialQty = isNew
      ? finalQty
      : editingProduct.initialQty !== undefined
        ? Number(editingProduct.initialQty)
        : Number(editingProduct.qty);
    const finalInitialQty = existingInitialQty;

    const soldQty = Math.max(0, finalInitialQty - finalQty);
    const salesPercent =
      finalInitialQty > 0 ? (soldQty / finalInitialQty) * 100 : 0;
    const hasReachedSalePercent =
      formIsReorderSaleActive && Number(formReorderSalePercent) > 0
        ? salesPercent >= Number(formReorderSalePercent)
        : false;

    const isBelowReorder =
      finalQty <=
        (formIsCustomReorder ? Number(formReorderPoint) : globalReorderLimit) ||
      hasReachedSalePercent;
    const finalStatus =
      finalQty === 0
        ? "Out of Stock"
        : isBelowReorder
          ? "Low Stock"
          : "In Stock";

    const productPayload = {
      id: isNew
        ? `P${Math.floor(1000 + Math.random() * 9000)}`
        : editingProduct.id,
      code: formCode,
      barcode: formBarcode,
      nameAr: formNameAr || formNameEn,
      nameEn: formNameEn || formNameAr,
      brandId: formBrandId,
      groupId: formGroupId,
      colorId: formColorId,
      sizeId: formSizeId,
      divisionId: formDivisionId,
      itemId: formItemId,
      costPrice: Number(formCostPrice),
      profitMargin: Number(formProfitMargin),
      sellPrice: Number(calculatedSellPrice),
      promoPrice: formPromoPrice !== "" ? Number(formPromoPrice) : null,
      promoDetails: isNew ? [] : editingProduct.promoDetails || [],
      supplierName:
        formSupplierName || (lang === "ar" ? "مورد عام" : "General Supplier"),
      reorderPoint: formIsCustomReorder
        ? Number(formReorderPoint)
        : globalReorderLimit,
      isCustomReorderPoint: formIsCustomReorder,
      qty: finalQty,
      initialQty: finalInitialQty,
      reorderSalePercent: formIsReorderSaleActive
        ? Number(formReorderSalePercent)
        : 0,
      status: finalStatus,
      variants: formHasVariants ? formVariants : [],
    };

    const exists = (products || []).some(
      (p: any) => p.id === productPayload.id,
    );
    let updatedList;
    if (exists) {
      updatedList = products.map((p: any) =>
        p.id === productPayload.id
          ? {
              ...p,
              ...productPayload,
              name:
                lang === "ar" ? productPayload.nameAr : productPayload.nameEn,
              category:
                divisions.find((d) => d.id === productPayload.divisionId)
                  ?.nameEn || "General",
            }
          : p,
      );
    } else {
      updatedList = [
        ...products,
        {
          ...productPayload,
          name: lang === "ar" ? productPayload.nameAr : productPayload.nameEn,
          category:
            divisions.find((d) => d.id === productPayload.divisionId)?.nameEn ||
            "General",
        },
      ];
    }

    setProducts(updatedList);
    setEditingProduct(null);
    triggerToast(
      lang === "ar"
        ? "تم حفظ بيانات الصنف بنجاح!"
        : "Product details saved successfully!",
    );
  };

  const handleAddNewPromoOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoOfferNo.trim() || !newPromoDiscount || newPromoDiscount <= 0) {
      triggerToast(
        lang === "ar"
          ? "الرجاء ملء رقم العرض وقيمة خصم صحيحة"
          : "Please fill offer no. and a valid discount",
      );
      return;
    }

    const currentCost = viewingProduct.costPrice || 0;
    const currentSell = viewingProduct.sellPrice || 0;
    const discount = Number(newPromoDiscount);
    const promoPrice = Math.max(0, currentSell - discount);

    const newOffer = {
      offerNo: newPromoOfferNo.trim(),
      currentCost: currentCost,
      discountValue: discount,
      promoSellPrice: promoPrice,
    };

    const updatedPromoDetails = [
      newOffer,
      ...(viewingProduct.promoDetails || []),
    ];

    // Update product globally
    const updatedProduct = {
      ...viewingProduct,
      promoPrice: promoPrice,
      promoDetails: updatedPromoDetails,
    };

    const updatedList = products.map((p: any) =>
      p.id === viewingProduct.id
        ? {
            ...p,
            ...updatedProduct,
            name: lang === "ar" ? updatedProduct.nameAr : updatedProduct.nameEn,
            category:
              divisions.find((d) => d.id === updatedProduct.divisionId)
                ?.nameEn || "General",
          }
        : p,
    );

    setProducts(updatedList);
    setViewingProduct(updatedProduct); // Update modal view state
    setNewPromoOfferNo("");
    setNewPromoDiscount(0);
    triggerToast(
      lang === "ar"
        ? "تم تسجيل عرض الأوكازيون بنجاح للصنف!"
        : "New promo offer logged successfully for the item!",
    );
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedList = products.filter((p: any) => p.id !== productId);
    setProducts(updatedList);
    triggerToast(
      lang === "ar" ? "تم حذف الصنف بنجاح!" : "Product deleted successfully!",
    );
  };

  // Handlers for opening Add Modals
  const handleOpenAdd = (type: string) => {
    setEditingId(null);
    setModalNameAr("");
    setModalNameEn("");

    if (type === "group") {
      setSelectedColor("bg-blue-500");
    } else if (type === "brand") {
      setBrandCountry("");
    } else if (type === "item") {
      setItemDivisionId(divisions[0]?.id || "DIV1");
    } else if (type === "color") {
      setColorHex("#3b82f6");
    }

    setActiveModal(type);
  };

  // Handlers for opening Edit Modals
  const handleOpenEdit = (type: string, data: any) => {
    setEditingId(data.id);
    setModalNameAr(data.nameAr);
    setModalNameEn(data.nameEn);

    if (type === "group") {
      setSelectedColor(data.color || "bg-blue-500");
    } else if (type === "brand") {
      setBrandCountry(data.country || "");
    } else if (type === "item") {
      setItemDivisionId(data.divisionId || "DIV1");
    } else if (type === "color") {
      setColorHex(data.hex || "#000000");
    }

    setActiveModal(type);
  };

  // Generic Save Handler
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNameAr.trim()) return;

    const formattedEn = modalNameEn.trim() || modalNameAr.trim();

    if (activeModal === "division") {
      if (editingId) {
        setDivisions(
          divisions.map((d) =>
            d.id === editingId
              ? { ...d, nameAr: modalNameAr, nameEn: formattedEn }
              : d,
          ),
        );
        triggerToast(
          lang === "ar"
            ? "تم تعديل القسم بنجاح"
            : "Division updated successfully",
        );
      } else {
        const newId = `DIV${divisions.length + 1}`;
        setDivisions([
          { id: newId, nameAr: modalNameAr, nameEn: formattedEn },
          ...divisions,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة القسم الجديد بنجاح"
            : "New division added successfully",
        );
      }
    } else if (activeModal === "group") {
      if (editingId) {
        setGroups(
          groups.map((g) =>
            g.id === editingId
              ? {
                  ...g,
                  nameAr: modalNameAr,
                  nameEn: formattedEn,
                  color: selectedColor,
                }
              : g,
          ),
        );
        triggerToast(
          lang === "ar"
            ? "تم تعديل المجموعة بنجاح"
            : "Group updated successfully",
        );
      } else {
        const newId = `GRP${groups.length + 1}`;
        setGroups([
          {
            id: newId,
            nameAr: modalNameAr,
            nameEn: formattedEn,
            color: selectedColor,
          },
          ...groups,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة المجموعة الجديدة بنجاح"
            : "New group added successfully",
        );
      }
    } else if (activeModal === "brand") {
      if (editingId) {
        setBrands(
          brands.map((b) =>
            b.id === editingId
              ? {
                  ...b,
                  nameAr: modalNameAr,
                  nameEn: formattedEn,
                  country: brandCountry,
                }
              : b,
          ),
        );
        triggerToast(
          lang === "ar"
            ? "تم تعديل العلامة التجارية بنجاح"
            : "Brand updated successfully",
        );
      } else {
        const newId = `BRD${brands.length + 1}`;
        setBrands([
          {
            id: newId,
            nameAr: modalNameAr,
            nameEn: formattedEn,
            country: brandCountry,
          },
          ...brands,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة العلامة التجارية بنجاح"
            : "New brand added successfully",
        );
      }
    } else if (activeModal === "item") {
      if (editingId) {
        setItems(
          items.map((i) =>
            i.id === editingId
              ? {
                  ...i,
                  nameAr: modalNameAr,
                  nameEn: formattedEn,
                  divisionId: itemDivisionId,
                }
              : i,
          ),
        );
        triggerToast(
          lang === "ar" ? "تم تعديل البند بنجاح" : "Item updated successfully",
        );
      } else {
        const newId = `ITM${items.length + 1}`;
        setItems([
          {
            id: newId,
            nameAr: modalNameAr,
            nameEn: formattedEn,
            divisionId: itemDivisionId,
          },
          ...items,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة البند الجديد بنجاح"
            : "New item added successfully",
        );
      }
    } else if (activeModal === "size") {
      if (editingId) {
        setSizes(
          sizes.map((s) =>
            s.id === editingId
              ? { ...s, nameAr: modalNameAr, nameEn: formattedEn }
              : s,
          ),
        );
        triggerToast(
          lang === "ar" ? "تم تعديل المقاس بنجاح" : "Size updated successfully",
        );
      } else {
        const newId = `SZ${sizes.length + 1}`;
        setSizes([
          { id: newId, nameAr: modalNameAr, nameEn: formattedEn },
          ...sizes,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة المقاس الجديد بنجاح"
            : "New size added successfully",
        );
      }
    } else if (activeModal === "color") {
      if (editingId) {
        setColors(
          colors.map((c) =>
            c.id === editingId
              ? {
                  ...c,
                  nameAr: modalNameAr,
                  nameEn: formattedEn,
                  hex: colorHex,
                }
              : c,
          ),
        );
        triggerToast(
          lang === "ar" ? "تم تعديل اللون بنجاح" : "Color updated successfully",
        );
      } else {
        const newId = `CLR${colors.length + 1}`;
        setColors([
          {
            id: newId,
            nameAr: modalNameAr,
            nameEn: formattedEn,
            hex: colorHex,
          },
          ...colors,
        ]);
        triggerToast(
          lang === "ar"
            ? "تم إضافة اللون بنجاح"
            : "New color added successfully",
        );
      }
    }

    setActiveModal(null);
  };

  // Delete Handlers
  const handleDelete = (type: string, id: string) => {
    if (
      !confirm(
        lang === "ar"
          ? "هل أنت متأكد من الحذف؟"
          : "Are you sure you want to delete this classification?",
      )
    )
      return;

    if (type === "division") {
      setDivisions(divisions.filter((d) => d.id !== id));
      triggerToast(
        lang === "ar" ? "تم حذف القسم بنجاح" : "Division removed successfully",
      );
    } else if (type === "group") {
      setGroups(groups.filter((g) => g.id !== id));
      triggerToast(
        lang === "ar" ? "تم حذف المجموعة بنجاح" : "Group removed successfully",
      );
    } else if (type === "brand") {
      setBrands(brands.filter((b) => b.id !== id));
      triggerToast(
        lang === "ar"
          ? "تم حذف العلامة التجارية بنجاح"
          : "Brand removed successfully",
      );
    } else if (type === "item") {
      setItems(items.filter((i) => i.id !== id));
      triggerToast(
        lang === "ar" ? "تم حذف البند بنجاح" : "Item removed successfully",
      );
    } else if (type === "size") {
      setSizes(sizes.filter((s) => s.id !== id));
      triggerToast(
        lang === "ar" ? "تم حذف المقاس بنجاح" : "Size removed successfully",
      );
    } else if (type === "color") {
      setColors(colors.filter((c) => c.id !== id));
      triggerToast(
        lang === "ar" ? "تم حذف اللون بنجاح" : "Color removed successfully",
      );
    }
  };

  const filteredDivisions = divisions.filter((d) => {
    const term = searchDivision.toLowerCase().trim();
    if (!term) return true;
    return (
      d.nameAr.toLowerCase().includes(term) ||
      d.nameEn.toLowerCase().includes(term) ||
      d.id.toLowerCase().includes(term)
    );
  });

  const filteredGroups = groups.filter((g) => {
    const term = searchGroup.toLowerCase().trim();
    if (!term) return true;
    return (
      g.nameAr.toLowerCase().includes(term) ||
      g.nameEn.toLowerCase().includes(term) ||
      g.id.toLowerCase().includes(term)
    );
  });

  const filteredBrands = brands.filter((b) => {
    const term = searchBrand.toLowerCase().trim();
    if (!term) return true;
    return (
      b.nameAr.toLowerCase().includes(term) ||
      b.nameEn.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
      b.country.toLowerCase().includes(term)
    );
  });

  const filteredItems = items.filter((i) => {
    const term = searchItem.toLowerCase().trim();
    if (!term) return true;
    const parentDiv = divisions.find((d) => d.id === i.divisionId);
    const parentLabel = parentDiv
      ? lang === "ar"
        ? parentDiv.nameAr
        : parentDiv.nameEn
      : "";
    return (
      i.nameAr.toLowerCase().includes(term) ||
      i.nameEn.toLowerCase().includes(term) ||
      i.id.toLowerCase().includes(term) ||
      parentLabel.toLowerCase().includes(term)
    );
  });

  const filteredSizes = sizes.filter((s) => {
    const term = searchSize.toLowerCase().trim();
    if (!term) return true;
    return (
      s.nameAr.toLowerCase().includes(term) ||
      s.nameEn.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  });

  const filteredColors = colors.filter((c) => {
    const term = searchColor.toLowerCase().trim();
    if (!term) return true;
    return (
      c.nameAr.toLowerCase().includes(term) ||
      c.nameEn.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.hex.toLowerCase().includes(term)
    );
  });

  if (activeSubTab === "composite-items") {
    return <CompositeItemsTab lang={lang} products={products} compositeItems={compositeItems} setCompositeItems={setCompositeItems} groups={groups} />;
  }

  if (activeSubTab === "bundled-items") {
    return <BundledItemsTab lang={lang} products={products} bundledItems={bundledItems} setBundledItems={setBundledItems} groups={groups} />;
  }

  if (activeSubTab === "barcode-printing") {
    return <BarcodePrintingTab lang={lang} products={products} selectedBranches={selectedBranches} />;
  }

  if (activeSubTab === "price-modification") {
    return <PriceModificationTab lang={lang} products={products} setActiveSubTab={setActiveSubTab} />;
  }

  if (activeSubTab === "inventory-check") {
    return <InventoryCheckTab lang={lang} products={products} />;
  }
  
  if (activeSubTab === "product-reports-shortcut") {
    return <ProductReportsTab lang={lang} />;
  }
  
  if (
    activeSubTab === "products-list" ||
    activeSubTab === "item-transfer" ||
    activeSubTab === "item-issue" ||
    activeSubTab === "item-addition" ||
    activeSubTab === "item-destruction"
  ) {
    const isTransferMode = activeSubTab === "item-transfer";
    const isIssueMode = activeSubTab === "item-issue";
    const isAdditionMode = activeSubTab === "item-addition";
    const isDestructionMode = activeSubTab === "item-destruction";

    // Filtered transfers computation
    const filteredTransfers = transfers.filter((t) => {
      // 0. Filter by active subtab type
      const modeType = t.type || "item-transfer"; // fallback for legacy data
      if (modeType !== activeSubTab) return false;

      // 1. General query search
      const q = transferSearchQuery.toLowerCase().trim();
      if (q) {
        const matchesGeneral =
          t.id.toLowerCase().includes(q) ||
          t.fromBranch.toLowerCase().includes(q) ||
          t.toBranch.toLowerCase().includes(q) ||
          t.username.toLowerCase().includes(q) ||
          (t.notes || "").toLowerCase().includes(q);
        if (!matchesGeneral) return false;
      }

      // 2. Advanced filters
      if (advTrfId && !t.id.toLowerCase().includes(advTrfId.toLowerCase()))
        return false;
      if (
        advTrfFromBranch &&
        advTrfFromBranch !== "ALL" &&
        t.fromBranch !== advTrfFromBranch
      )
        return false;
      if (
        advTrfToBranch &&
        advTrfToBranch !== "ALL" &&
        t.toBranch !== advTrfToBranch
      )
        return false;
      if (advTrfStatus && advTrfStatus !== "ALL" && t.status !== advTrfStatus)
        return false;
      if (
        advTrfUsername &&
        !t.username.toLowerCase().includes(advTrfUsername.toLowerCase())
      )
        return false;

      return true;
    });

    const totalTrfPages =
      Math.ceil(filteredTransfers.length / trfPageSize) || 1;
    const activeTrfPage = Math.min(trfPage || 1, totalTrfPages);
    const paginatedTransfers = filteredTransfers.slice(
      (activeTrfPage - 1) * trfPageSize,
      activeTrfPage * trfPageSize,
    );

    // Selected product inside the transfer modal to view stock/balance
    const selectedProductObj = richProducts.find(
      (p: any) => p.id === tfSelectedProductId,
    );

    // Add item to transfer list handler
    const handleAddItemToTransfer = () => {
      if (!tfSelectedProductId) {
        triggerToast(
          lang === "ar"
            ? "يرجى اختيار صنف أولاً!"
            : "Please select an item first!",
        );
        return;
      }
      const prod = richProducts.find((p: any) => p.id === tfSelectedProductId);
      if (!prod) return;

      if (tfItems.some((item: any) => item.id === prod.id)) {
        triggerToast(
          lang === "ar"
            ? isAdditionMode
              ? "هذا الصنف مضاف بالفعل للإضافة!"
              : isIssueMode
                ? "هذا الصنف مضاف بالفعل للصرف!"
              : isDestructionMode
                ? "هذا الصنف مضاف بالفعل للاهلاك!"
                : "هذا الصنف مضاف بالفعل للتحويل!"
            : "This item is already added!",
        );
        return;
      }

      if (tfItemQty <= 0) {
        triggerToast(
          lang === "ar"
            ? "يرجى إدخال كمية صحيحة!"
            : "Please enter a valid quantity!",
        );
        return;
      }

      const newItem = {
        id: prod.id,
        code: prod.code,
        barcode: prod.barcode,
        nameAr: prod.nameAr,
        nameEn: prod.nameEn,
        quantity: tfItemQty,
        buyPrice: prod.costPrice || 250,
        currentStock: prod.qty !== undefined ? prod.qty : 10,
      };

      setTfItems([...tfItems, newItem]);
      setTfSelectedProductId("");
      setTfProductSearchQuery("");
      setTfItemQty("");
      setTimeout(() => {
        tfProductSearchInputRef.current?.focus();
      }, 50);
      triggerToast(
        lang === "ar"
          ? isAdditionMode
            ? "تم إضافة الصنف للإضافة بنجاح!"
            : isIssueMode
              ? "تم إضافة الصنف للصرف بنجاح!"
            : isDestructionMode
              ? "تم إضافة الصنف للاهلاك بنجاح!"
              : "تم إضافة الصنف للتحويل بنجاح!"
          : "Item added!",
      );
    };

    // Print transfer order helper
    const printTransferOrder = (order: any, type: "a4" | "a5" | "thermal") => {
      // Create a hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) return;

      const isAr = lang === "ar";

      // Total quantity and values
      const totalQty = order.items.reduce(
        (sum: number, i: any) => sum + i.quantity,
        0,
      );
      const totalVal = order.items.reduce(
        (sum: number, i: any) => sum + i.quantity * i.buyPrice,
        0,
      );

      let columnsHtml = "";
      let itemsRowsHtml = "";

      if (type === "thermal") {
        // Thermal prints only: Barcode + Qty + Item Name
        columnsHtml = `
          <th style="padding: 6px; text-align: right; border-bottom: 2px solid #000;">${isAr ? "الصنف" : "Item"}</th>
          <th style="padding: 6px; text-align: center; border-bottom: 2px solid #000;">${isAr ? "الكمية" : "Qty"}</th>
          <th style="padding: 6px; text-align: left; border-bottom: 2px solid #000;">${isAr ? "الباركود" : "Barcode"}</th>
        `;
        itemsRowsHtml = order.items
          .map(
            (item: any) => `
          <tr style="border-bottom: 1px dashed #ccc;">
            <td style="padding: 6px 4px; text-align: right; font-weight: bold; font-size: 13px;">${item.nameAr || item.nameEn}</td>
            <td style="padding: 6px 4px; text-align: center; font-weight: bold; font-size: 13px;">${item.quantity}</td>
            <td style="padding: 6px 4px; text-align: left; font-family: monospace; font-size: 11px;">${item.barcode || "-"}</td>
          </tr>
        `,
          )
          .join("");
      } else {
        // A4/A5 prints show all columns: Item Name, Code, Barcode, Qty, Cost Price, Subtotal
        columnsHtml = `
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "اسم الصنف" : "Item Name"}</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "الكود" : "Code"}</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "الباركود" : "Barcode"}</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "الكمية" : "Qty"}</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "سعر الشراء" : "Cost"}</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #334155; background: #f8fafc;">${isAr ? "إجمالي القيمة" : "Total"}</th>
        `;
        itemsRowsHtml = order.items
          .map(
            (item: any) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">${item.nameAr || item.nameEn}</td>
            <td style="padding: 10px; text-align: center; font-family: monospace; color: #475569;">${item.code || "-"}</td>
            <td style="padding: 10px; text-align: center; font-family: monospace; color: #64748b;">${item.barcode || "-"}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #0f172a;">${item.quantity}</td>
            <td style="padding: 10px; text-align: center; font-family: monospace; color: #475569;">${item.buyPrice} ${isAr ? "ج.م" : "EGP"}</td>
            <td style="padding: 10px; text-align: left; font-family: monospace; font-weight: bold; color: #15803d;">${(item.quantity * item.buyPrice).toLocaleString()} ${isAr ? "ج.م" : "EGP"}</td>
          </tr>
        `,
          )
          .join("");
      }

      const printHtml = `
        <!DOCTYPE html>
        <html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
        <head>
          <meta charset="utf-8">
          <title>${isAr ? (isAdditionMode ? "إذن إضافة أصناف" : isIssueMode ? "إذن صرف أصناف" : isDestructionMode ? "إذن اهلاك أصناف" : "إذن تحويل أصناف") : isAdditionMode ? "Addition Voucher" : isIssueMode ? "Issue Voucher" : isDestructionMode ? "Destruction Voucher" : "Transfer Permit"}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Inter:wght@400;700&display=swap');
            body {
              font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
              color: #333;
              margin: 0;
              padding: ${type === "thermal" ? "10px" : "40px"};
              font-size: ${type === "thermal" ? "12px" : "14px"};
              line-height: 1.4;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: ${type === "thermal" ? "2px dashed #000" : "2px solid #ea580c"};
              padding-bottom: 10px;
            }
            .title {
              font-size: ${type === "thermal" ? "16px" : "22px"};
              font-weight: 900;
              margin: 5px 0;
              color: ${type === "thermal" ? "#000" : "#c2410c"};
            }
            .meta-grid {
              display: grid;
              grid-template-columns: ${type === "thermal" ? "1fr" : "1fr 1fr"};
              gap: 10px;
              margin-bottom: 20px;
              background: ${type === "thermal" ? "transparent" : "#f8fafc"};
              padding: ${type === "thermal" ? "0" : "15px"};
              border-radius: ${type === "thermal" ? "0" : "10px"};
              border: ${type === "thermal" ? "none" : "1px solid #e2e8f0"};
            }
            .meta-item {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 4px;
            }
            .meta-label {
              color: #64748b;
              font-weight: bold;
            }
            .meta-value {
              font-weight: bold;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .totals {
              margin-top: 20px;
              text-align: left;
              padding: 10px;
              background: ${type === "thermal" ? "transparent" : "#f8fafc"};
              border-top: ${type === "thermal" ? "2px dashed #000" : "1px solid #e2e8f0"};
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: ${type === "thermal" ? "13px" : "16px"};
              font-weight: bold;
              margin-top: 5px;
            }
            .footer-sigs {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              color: #475569;
            }
            @media print {
              body { padding: 0; }
              @page {
                size: ${type === "a4" ? "A4" : type === "a5" ? "A5" : "80mm auto"};
                margin: ${type === "thermal" ? "0" : "15mm"};
              }
            }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => { if (window.parent && window.parent.document && window.frameElement) { window.parent.document.body.removeChild(window.frameElement); } }, 1000);">
          <div class="header">
            <div class="title">${isAr ? (isAdditionMode ? "إذن إضافة" : isIssueMode ? "إذن صرف" : isDestructionMode ? "إذن اهلاك" : "إذن تحويل بين الفروع") : isAdditionMode ? "Item Addition Voucher" : isIssueMode ? "Item Issue Voucher" : isDestructionMode ? "Destruction Voucher" : "Stock Transfer Permit"}</div>
            <div style="font-weight: bold; font-size: ${type === "thermal" ? "12px" : "14px"}; margin-top: 5px;">
              ${isAr ? `رقم الإذن: ${order.id}` : `Permit ID: ${order.id}`}
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">${isAr ? (isAdditionMode ? "من حساب:" : isIssueMode ? "الفرع / المخزن:" : isDestructionMode ? "الفرع / المخزن:" : "من فرع (المُرسل):") : isAdditionMode ? "From Account:" : isIssueMode ? "Branch / Warehouse:" : isDestructionMode ? "Branch / Warehouse:" : "From Branch:"}</span>
              <span class="meta-value">${order.fromBranch}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${isAr ? (isAdditionMode ? "الفرع / المخزن:" : isIssueMode ? "إلى حساب:" : isDestructionMode ? "إلى حساب:" : "إلى فرع (المُستقبِل):") : isAdditionMode ? "Branch / Store:" : isIssueMode ? "To Account:" : isDestructionMode ? "To Account:" : "To Branch:"}</span>
              <span class="meta-value">${order.toBranch}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${isAr ? "التاريخ:" : "Date:"}</span>
              <span class="meta-value">${order.date}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${isAr ? "مُعد الإذن:" : "Prepared By:"}</span>
              <span class="meta-value">${order.username}</span>
            </div>
            ${
              order.notes
                ? `
            <div class="meta-item" style="grid-column: ${type === "thermal" ? "1" : "1 / span 2"};">
              <span class="meta-label">${isAr ? (isDestructionMode ? "سبب الاهلاك:" : "ملاحظات التحويل:") : (isDestructionMode ? "Destruction Reason:" : "Notes:")}</span>
              <span class="meta-value">${order.notes}</span>
            </div>
            `
                : ""
            }
          </div>

          <table style="width: 100%;">
            <thead>
              <tr>
                ${columnsHtml}
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>${isAr ? "إجمالي الكمية:" : "Total Qty:"}</span>
              <span>${totalQty} ${isAr ? "قطعة" : "pcs"}</span>
            </div>
            ${
              type !== "thermal"
                ? `
            <div class="total-row" style="color: #15803d;">
              <span>${isAr ? "إجمالي القيمة:" : "Total Value:"}</span>
              <span>${totalVal.toLocaleString()} ${isAr ? "ج.م" : "EGP"}</span>
            </div>
            `
                : ""
            }
          </div>

          ${
            type !== "thermal"
              ? `
          <div class="footer-sigs">
            <div>${isAr ? "توقيع أمين المخزن المُرسل: _________________" : "Sender Signature: _________________"}</div>
            <div>${isAr ? "توقيع أمين المخزن المُستقبل: _________________" : "Receiver Signature: _________________"}</div>
          </div>
          `
              : `
          <div style="text-align: center; margin-top: 15px; font-weight: bold; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px;">
            ${isAr ? "تمت الطباعة بنجاح - برنامج إدارة المخازن" : "Printed Successfully - Inventory System"}
          </div>
          `
          }
        </body>
        </html>
      `;

      doc.open();
      doc.write(printHtml);
      doc.close();
    };

    // Save transfer order core function
    const saveTransferOrderAndGetObj = () => {
      if (tfItems.length === 0) {
        triggerToast(
          lang === "ar"
            ? isAdditionMode
              ? "يجب إضافة صنف واحد على الأقل لإتمام الإضافة!"
              : isIssueMode
                ? "يجب إضافة صنف واحد على الأقل لإتمام الصرف!"
              : isDestructionMode
                ? "يجب إضافة صنف واحد على الأقل لإتمام الاهلاك!"
                : "يجب إضافة صنف واحد على الأقل لإتمام التحويل!"
            : "Please add at least one item!",
        );
        return null;
      }
      if (tfFromBranch === tfToBranch) {
        triggerToast(
          lang === "ar"
            ? isAdditionMode
              ? "عفواً، الوجهة والمصدر متطابقان!"
              : isIssueMode
                ? "عفواً، الوجهة والمصدر متطابقان!"
              : isDestructionMode
                ? "عفواً، الوجهة والمصدر متطابقان!"
                : "عفواً، لا يمكن التحويل لنفس الفرع!"
            : "Source and destination cannot be the same!",
        );
        return null;
      }

      if (isDestructionMode && !tfNotes.trim()) {
        triggerToast(
          lang === "ar"
            ? "يجب إدخال سبب الإهلاك!"
            : "Please enter the reason for destruction!",
        );
        return null;
      }

      let savedOrder: any = null;

      if (transferFormEditingId) {
        // Edit mode
        const updated = transfers.map((t) => {
          if (t.id === transferFormEditingId) {
            savedOrder = {
              ...t,
              type: activeSubTab,
              fromBranch: tfFromBranch,
              toBranch: tfToBranch,
              date: tfDate,
              username: tfUsername,
              status: tfStatus,
              notes: tfNotes,
              items: tfItems,
            };
            return savedOrder;
          }
          return t;
        });
        setTransfers(updated);
        triggerToast(
          lang === "ar"
            ? isAdditionMode
              ? "تم حفظ تعديلات إذن الإضافة بنجاح!"
              : isIssueMode
                ? "تم حفظ تعديلات إذن الصرف بنجاح!"
              : isDestructionMode
                ? "تم حفظ تعديلات إذن الاهلاك بنجاح!"
                : "تم حفظ تعديلات إذن التحويل بنجاح!"
            : "Transfer order changes saved successfully!",
        );
      } else {
        // Create mode
        const newId = `TRF-${Math.floor(1001 + Math.random() * 8999)}`;
        savedOrder = {
          id: newId,
          type: activeSubTab,
          fromBranch: tfFromBranch,
          toBranch: tfToBranch,
          date: tfDate,
          username: tfUsername,
          status: tfStatus,
          notes: tfNotes,
          items: tfItems,
        };
        setTransfers([savedOrder, ...transfers]);
        triggerToast(
          lang === "ar"
            ? isAdditionMode
              ? "تم تسجيل إذن الإضافة الجديد بنجاح!"
              : isIssueMode
                ? "تم تسجيل إذن الصرف الجديد بنجاح!"
              : isDestructionMode
                ? "تم تسجيل إذن الاهلاك الجديد بنجاح!"
                : "تم تسجيل إذن التحويل الجديد بنجاح!"
            : "New transfer order created successfully!",
        );
      }

      setTransferFormOpen(false);
      return savedOrder;
    };

    // Save transfer order handler
    const handleSaveTransferOrder = (e: React.FormEvent) => {
      e.preventDefault();
      saveTransferOrderAndGetObj();
    };

    // Save & Print handler
    const handleSaveAndPrintTransferOrder = (e: React.MouseEvent) => {
      e.preventDefault();
      const order = saveTransferOrderAndGetObj();
      if (order) {
        printTransferOrder(order, tfPrintType);
      }
    };

    return (
      <div
        className={cn(
          "bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6 font-sans",
          lang === "ar" && "rtl font-[Cairo] text-right",
        )}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 left-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 animate-bounce flex items-center gap-2 text-xs font-bold font-sans">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="border-b border-[#eaeff2] pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="rtl:text-right text-left flex flex-col items-start shrink-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-md font-bold text-[#0a1945] flex items-center gap-1.5 font-sans">
                <Package className="text-orange-500" size={18} />
                <span>
                  {isTransferMode
                    ? lang === "ar"
                      ? "تحويل الاصناف بين الفروع"
                      : "Item Transfers Between Branches"
                    : isIssueMode
                      ? lang === "ar"
                        ? "اذون صرف"
                        : "Item Issue Vouchers"
                    : isDestructionMode
                      ? lang === "ar"
                        ? "اذون اهلاك"
                        : "Item Destruction Vouchers"
                      : isAdditionMode
                        ? lang === "ar"
                          ? "اذون اضافه"
                          : "Item Addition Vouchers"
                        : lang === "ar"
                          ? "سجل المنتجات والأصناف"
                          : "Products & Apparel Inventory"}
                </span>
              </h3>
            </div>
            {isDestructionMode && (
              <p className="text-xs text-slate-500 font-medium block w-full mt-1">
                {lang === "ar"
                  ? "تسجيل اهلاك الاصناف واسباب الاهلاك وخصمها من الارصده"
                  : "Log item destructions, reasons, and deduct them from stock."}
              </p>
            )}
            {!isTransferMode && !isIssueMode && !isAdditionMode && !isDestructionMode && (
              <p className="text-xs text-slate-500 font-normal block w-full mt-1 text-right" style={{ lineHeight: '16px', borderStyle: 'none' }}>
                {lang === "ar"
                  ? "قم بانشاء الاصناف وتحديد مجموعاتها واضافه الوان ومقاسات"
                  : "Create items, specify their groups, and add colors and sizes."}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end" style={{ width: "252.469px" }}>
            {/* Orange Add Product / Transfer Button */}
            <button
              onClick={() => {
                if (isTransferMode || isIssueMode || isAdditionMode || isDestructionMode) {
                  setTransferFormEditingId(null);
                  setTfFromBranch("فرع الممر");
                  setTfToBranch(isDestructionMode ? "اهلاك الاصناف" : "فرع المسرح الروماني");
                  setTfDate(new Date().toISOString().split("T")[0]);
                  setTfUsername("هاني دياب");
                  setTfStatus("pending");
                  setTfNotes("");
                  setTfItems([]);
                  setTfSelectedProductId("");
                  setTfItemQty("");
                  setTransferFormOpen(true);
                } else {
                  openAddProductModal();
                }
              }}
              className="py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider h-[38px] min-h-[38px]"
              style={{ width: "251.141px", borderRadius: '8px' }}
            >
              <Plus size={15} />
              <span className="text-[11px] whitespace-nowrap font-black">
                {isTransferMode
                  ? lang === "ar"
                    ? "إنشاء إذن تحويل جديد"
                    : "Create Transfer Order"
                  : isIssueMode
                    ? lang === "ar"
                      ? "إنشاء إذن صرف جديد"
                      : "Create Issue Voucher"
                  : isDestructionMode
                    ? lang === "ar"
                      ? "إنشاء إذن اهلاك جديد"
                      : "Create Destruction Voucher"
                    : isAdditionMode
                      ? lang === "ar"
                        ? "إنشاء إذن اضافه جديد"
                        : "Create Addition Voucher"
                      : lang === "ar"
                        ? "إنشاء صنف جديد"
                        : "Create Product"}
              </span>
            </button>
          </div>
        </div>

        {isTransferMode || isIssueMode || isAdditionMode || isDestructionMode ? (
          <div className="space-y-6">
            {/* VIEW 1: DESKTOP/RESPONSIVE CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-[12px] overflow-visible shadow-sm relative">
              {/* Toolbar bar */}
              <div className="p-3.5 border-b border-[#eaeff2] bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 w-full">
                
                {/* Right Actions (First in DOM so it goes to the Right in RTL) */}
                <div className="flex items-center gap-2">
                  {/* Columns Customizer Gear dropdown (FAR RIGHT) */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setTempTrfVisibleColumns({ ...trfVisibleColumns });
                        setTrfColumnSettingsOpen(!trfColumnSettingsOpen);
                      }}
                      className="w-[36px] h-[36px] flex items-center justify-center text-[#f06424] bg-white border border-slate-200 hover:border-orange-400 rounded-lg hover:shadow-xs transition cursor-pointer"
                      title={lang === "ar" ? "تخصيص الأعمدة" : "Columns"}
                    >
                      <Settings size={15} className="!text-[#f06424] shrink-0" stroke="currentColor" />
                    </button>
                    {trfColumnSettingsOpen && (
                      <div className="absolute right-0 rtl:right-0 rtl:left-auto mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3.5 text-xs text-left rtl:text-right">
                        <div className="pb-2 border-b border-slate-100 mb-2.5 flex justify-between items-center rtl:flex-row-reverse">
                          <h4 className="font-extrabold text-slate-800 text-[12px]">
                            {lang === "ar"
                              ? isAdditionMode
                                ? "أعمدة جدول أذونات الإضافة"
                                : isIssueMode
                                  ? "أعمدة جدول أذونات الصرف"
                                : isDestructionMode
                                  ? "أعمدة جدول أذونات الاهلاك"
                                  : "أعمدة جدول أذونات التحويل"
                              : isAdditionMode
                                ? "Addition Columns"
                                : isIssueMode
                                  ? "Issue Columns"
                                : isDestructionMode
                                  ? "Destruction Columns"
                                  : "Transfer Columns"}
                          </h4>
                          <button
                            onClick={() => setTrfColumnSettingsOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {Object.entries({
                            id: { en: "Permit No.", ar: "رقم الإذن" },
                            fromBranch: {
                              en: isAdditionMode
                                ? "From Account"
                                : isIssueMode
                                  ? "Branch / Warehouse"
                                : isDestructionMode
                                  ? "Branch / Warehouse"
                                  : "From Branch",
                              ar: isAdditionMode
                                ? "من حساب"
                                : isIssueMode
                                  ? "الفرع / المخزن"
                                : isDestructionMode
                                  ? "الفرع / المخزن"
                                  : "من فرع",
                            },
                            toBranch: {
                              en: isAdditionMode
                                ? "Branch / Store"
                                : isIssueMode
                                  ? "To Account"
                                : isDestructionMode
                                  ? "To Account"
                                  : "To Branch",
                              ar: isAdditionMode
                                ? "الفرع / المخزن"
                                : isIssueMode
                                  ? "إلى حساب"
                                : isDestructionMode
                                  ? "إلى حساب"
                                  : "إلى فرع",
                            },
                            totalQty: { en: "Total Qty", ar: "عدد القطع" },
                            status: {
                              en: isAdditionMode
                                ? "Addition Status"
                                : isIssueMode
                                  ? "Issue Status"
                                : isDestructionMode
                                  ? "Destruction Status"
                                  : "Transfer Status",
                              ar: isAdditionMode
                                ? "حالة الإضافة"
                                : isIssueMode
                                  ? "حالة الصرف"
                                : isDestructionMode
                                  ? "حالة الاهلاك"
                                  : "حالة التحويل",
                            },
                            username: { en: "Username", ar: "اسم المستخدم" },
                            notes: {
                              en: isDestructionMode
                                ? "Destruction Reason"
                                : "Notes",
                              ar: isDestructionMode
                                ? "سبب الاهلاك"
                                : "ملاحظات",
                            },
                          }).map(([key, value]) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer select-none rtl:flex-row-reverse"
                            >
                              <input
                                type="checkbox"
                                checked={tempTrfVisibleColumns[key] ?? false}
                                onChange={(e) =>
                                  setTempTrfVisibleColumns({
                                    ...tempTrfVisibleColumns,
                                    [key]: e.target.checked,
                                  })
                                }
                                className="accent-orange-500 rounded text-white cursor-pointer"
                              />
                              <span className="text-slate-700 font-bold">
                                {lang === "ar" ? value.ar : value.en}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-3 mt-3 border-t border-slate-100">
                          <button
                            onClick={() => setTrfColumnSettingsOpen(false)}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold text-center cursor-pointer"
                          >
                            {lang === "ar" ? "إلغاء" : "Cancel"}
                          </button>
                          <button
                            onClick={() => {
                              setTrfVisibleColumns({
                                ...tempTrfVisibleColumns,
                              });
                              setTrfColumnSettingsOpen(false);
                              triggerToast(
                                lang === "ar"
                                  ? "تم تطبيق تفضيلات الأعمدة"
                                  : "Columns view applied!",
                              );
                            }}
                            className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-650 text-white rounded-lg text-[10px] font-bold text-center cursor-pointer"
                          >
                            {lang === "ar" ? "تطبيق" : "Apply"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Download/Export — between Settings and Cards (matches Products Registry) */}
                  <ExportDataButton
                    lang={lang}
                    onToast={triggerToast}
                    hideText={true}
                    onCopy={() =>
                      triggerToast(
                        lang === "ar"
                          ? "تم نسخ البيانات إلى الحافظة"
                          : "Data copied to clipboard!",
                      )
                    }
                    onPrint={() =>
                      triggerToast(
                        lang === "ar"
                          ? "تم فتح خيارات الطباعة للجدول"
                          : "Print dialog opened!",
                      )
                    }
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                    }}
                  />

                  {/* Table/Cards Mode Toggle (SECOND ON THE RIGHT) */}
                  <button
                    onClick={() =>
                      setTrfViewMode(
                        trfViewMode === "table" ? "kanban" : "table"
                      )
                    }
                    className="h-[36px] px-3 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:shadow-xs transition cursor-pointer select-none font-black text-[11px] text-slate-700"
                    title={lang === "ar" ? "تبديل العرض" : "Toggle View"}
                  >
                    {trfViewMode === "table" ? (
                      <>
                        <Grid size={14} className="!text-[#f06424] shrink-0" stroke="currentColor" />
                        <span className="text-slate-700">{lang === "ar" ? "بطاقات" : "Cards"}</span>
                      </>
                    ) : (
                      <>
                        <List size={14} className="!text-[#f06424] shrink-0" stroke="currentColor" />
                        <span className="text-slate-700">{lang === "ar" ? "جدول" : "Table"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Left side (Second in DOM so it goes to the Left in RTL) */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md justify-end">
                  <button
                    onClick={() =>
                      setIsTrfColumnFiltersOpen(!isTrfColumnFiltersOpen)
                    }
                    className={cn(
                      "w-[36px] h-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer select-none",
                      isTrfColumnFiltersOpen
                        ? "bg-[#0a1945] text-white border-[#0a1945]"
                        : "bg-white text-orange-500 border-slate-200 hover:border-orange-400"
                    )}
                    title={lang === "ar" ? "بحث متقدم" : "Advanced Search"}
                  >
                    <Filter size={15} />
                  </button>
                  <div className="relative flex-1 flex items-center max-w-[300px]">
                    <Search
                      size={14}
                      className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={transferSearchQuery}
                      onChange={(e) => {
                        setTransferSearchQuery(e.target.value);
                        setTrfPage(1);
                      }}
                      placeholder={
                        lang === "ar"
                          ? "البحث بالاسم، الكود، الباركود..."
                          : "Search by name, SKU..."
                      }
                      className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
                    />
                    {transferSearchQuery && (
                      <button
                        onClick={() => {
                          setTransferSearchQuery("");
                          setTrfPage(1);
                        }}
                        className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
        {/* Dynamic Display (Table or Cards) */}
              {trfViewMode === "table" ? (
                <>
                  {/* Table View: Hidden on mobile and tablet (below lg), shown on desktop (lg and up) */}
                  <div className="hidden lg:block overflow-x-auto max-h-[520px] overflow-y-auto relative border border-slate-200 rounded-b-2xl shadow-xs bg-white">
                    <table className="w-full border-collapse text-right text-xs font-bold text-slate-700">
                      <thead className="sticky top-0 z-30 bg-orange-500 text-white select-none">
                        <tr className="bg-[#f06424] text-white font-extrabold border-b border-orange-600">
                          {trfVisibleColumns.id && (
                            <th className="p-3.5 text-center w-[120px]">
                              {lang === "ar" ? "رقم الإذن" : "Permit No."}
                            </th>
                          )}
                          {trfVisibleColumns.fromBranch && (
                            <th className="p-3.5">
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "من حساب"
                                  : isIssueMode
                                    ? "الفرع / المخزن"
                                  : isDestructionMode
                                    ? "الفرع / المخزن"
                                    : "من فرع"
                                : isAdditionMode
                                  ? "From Account"
                                  : isIssueMode
                                    ? "Branch / Warehouse"
                                  : isDestructionMode
                                    ? "Branch / Warehouse"
                                    : "From Branch"}
                            </th>
                          )}
                          {trfVisibleColumns.toBranch && (
                            <th className="p-3.5">
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "الفرع / المخزن"
                                  : isIssueMode
                                    ? "إلى حساب"
                                  : isDestructionMode
                                    ? "إلى حساب"
                                    : "إلى فرع"
                                : isAdditionMode
                                  ? "Branch / Store"
                                  : isIssueMode
                                    ? "To Account"
                                  : isDestructionMode
                                    ? "To Account"
                                    : "To Branch"}
                            </th>
                          )}
                          {trfVisibleColumns.totalQty && (
                            <th className="p-3.5 text-center">
                              {lang === "ar" ? "عدد القطع" : "Total Qty"}
                            </th>
                          )}
                          {trfVisibleColumns.totalValue && (
                            <th className="p-3.5 text-center">
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "قيمة الإضافة"
                                  : isIssueMode
                                    ? "قيمة الصرف"
                                  : isDestructionMode
                                    ? "قيمة الاهلاك"
                                    : "قيمة التحويل"
                                : isAdditionMode
                                  ? "Addition Value"
                                  : isIssueMode
                                    ? "Issue Value"
                                  : isDestructionMode
                                    ? "Destruction Value"
                                    : "Transfer Value"}
                            </th>
                          )}
                          {trfVisibleColumns.status && (
                            <th className="p-3.5 text-center">
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "حالة الإضافة"
                                  : isIssueMode
                                    ? "حالة الصرف"
                                  : isDestructionMode
                                    ? "حالة الاهلاك"
                                    : "حالة التحويل"
                                : isAdditionMode
                                  ? "Addition Status"
                                  : isIssueMode
                                    ? "Issue Status"
                                  : isDestructionMode
                                    ? "Destruction Status"
                                    : "Transfer Status"}
                            </th>
                          )}
                          {trfVisibleColumns.username && (
                            <th className="p-3.5">
                              {lang === "ar" ? "اسم المستخدم" : "Username"}
                            </th>
                          )}
                           {trfVisibleColumns.notes && (
                             <th className="p-3.5 max-w-[180px] truncate">
                               {lang === "ar"
                                 ? isDestructionMode
                                   ? "سبب الاهلاك"
                                   : "ملاحظات"
                                 : isDestructionMode
                                   ? "Destruction Reason"
                                   : "Notes"}
                             </th>
                           )}
                          <th className="p-3.5 text-center w-[120px]">
                            {lang === "ar" ? "الإجراءات" : "Actions"}
                          </th>
                        </tr>
                        {isTrfColumnFiltersOpen && (
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                            {trfVisibleColumns.id && (
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={advTrfId}
                                    onChange={(e) => {
                                      setAdvTrfId(e.target.value);
                                      setTrfPage(1);
                                    }}
                                    placeholder={
                                      lang === "ar"
                                        ? "بحث بالإذن..."
                                        : "Filter No..."
                                    }
                                    className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold"
                                  />
                                  {advTrfId && (
                                    <button
                                      onClick={() => {
                                        setAdvTrfId("");
                                        setTrfPage(1);
                                      }}
                                      className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                            {trfVisibleColumns.fromBranch && (
                              <td className="py-2 px-3">
                                <select
                                  value={advTrfFromBranch}
                                  onChange={(e) => {
                                    setAdvTrfFromBranch(e.target.value);
                                    setTrfPage(1);
                                  }}
                                  className="w-full text-[10px] p-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans font-bold text-slate-700"
                                >
                                  <option value="ALL">
                                    {lang === "ar" ? "الكل" : "All"}
                                  </option>
                                  {branchesList.map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {trfVisibleColumns.toBranch && (
                              <td className="py-2 px-3">
                                <select
                                  value={advTrfToBranch}
                                  onChange={(e) => {
                                    setAdvTrfToBranch(e.target.value);
                                    setTrfPage(1);
                                  }}
                                  className="w-full text-[10px] p-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans font-bold text-slate-700"
                                >
                                  <option value="ALL">
                                    {lang === "ar" ? "الكل" : "All"}
                                  </option>
                                  {(isIssueMode || isAdditionMode || isDestructionMode
                                    ? accountsList
                                    : branchesList
                                  ).map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {trfVisibleColumns.totalQty && (
                              <td className="py-2 px-3"></td>
                            )}
                            {trfVisibleColumns.totalValue && (
                              <td className="py-2 px-3"></td>
                            )}
                            {trfVisibleColumns.status && (
                              <td className="py-2 px-3">
                                <select
                                  value={advTrfStatus}
                                  onChange={(e) => {
                                    setAdvTrfStatus(e.target.value);
                                    setTrfPage(1);
                                  }}
                                  className="w-full text-[10px] p-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans font-bold text-slate-700"
                                >
                                  <option value="ALL">
                                    {lang === "ar" ? "الكل" : "All"}
                                  </option>
                                  <option value="pending">
                                    {lang === "ar" ? "قيد الانتظار" : "Pending"}
                                  </option>
                                  <option value="approved">
                                    {lang === "ar" ? "موافق عليه" : "Approved"}
                                  </option>
                                  <option value="rejected">
                                    {lang === "ar" ? "مرفوض" : "Rejected"}
                                  </option>
                                </select>
                              </td>
                            )}
                            {trfVisibleColumns.username && (
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={advTrfUsername}
                                    onChange={(e) => {
                                      setAdvTrfUsername(e.target.value);
                                      setTrfPage(1);
                                    }}
                                    placeholder={
                                      lang === "ar" ? "المستخدم..." : "User..."
                                    }
                                    className="w-full text-[10px] p-1.5 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-400 font-sans text-center font-bold text-slate-700"
                                  />
                                  {advTrfUsername && (
                                    <button
                                      onClick={() => {
                                        setAdvTrfUsername("");
                                        setTrfPage(1);
                                      }}
                                      className="absolute right-1.5 rtl:left-1.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                            {trfVisibleColumns.notes && (
                              <td className="py-2 px-3"></td>
                            )}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setAdvTrfId("");
                                  setAdvTrfFromBranch("ALL");
                                  setAdvTrfToBranch("ALL");
                                  setAdvTrfStatus("ALL");
                                  setAdvTrfUsername("");
                                  setTrfPage(1);
                                  triggerToast(
                                    lang === "ar"
                                      ? "تم إعادة ضبط فلاتر البحث"
                                      : "Filters reset!",
                                  );
                                }}
                                className="text-[10px] bg-white border border-slate-200 hover:bg-rose-50 hover:text-red-655 rounded-lg px-2.5 py-1 font-black cursor-pointer transition select-none"
                              >
                                {lang === "ar" ? "إعادة ضبط" : "Clear"}
                              </button>
                            </td>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-bold bg-white">
                        {paginatedTransfers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                Object.values(trfVisibleColumns).filter(Boolean)
                                  .length + 1
                              }
                              className="py-12 text-center text-slate-400 font-bold"
                            >
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "لا توجد أذونات إضافة مطابقة لمعايير البحث حالياً"
                                  : isIssueMode
                                    ? "لا توجد أذونات صرف مطابقة لمعايير البحث حالياً"
                                  : isDestructionMode
                                    ? "لا توجد أذونات اهلاك مطابقة لمعايير البحث حالياً"
                                    : "لا توجد أذون تحويل مطابقة لمعايير البحث حالياً"
                                : isAdditionMode
                                  ? "No addition vouchers found matching search criteria"
                                  : isIssueMode
                                    ? "No issue vouchers found matching search criteria"
                                  : isDestructionMode
                                    ? "No issue vouchers found matching search criteria"
                                    : "No transfer orders found matching search criteria"}
                            </td>
                          </tr>
                        ) : (
                          paginatedTransfers.map((t) => {
                            const totalQty = t.items.reduce(
                              (sum: number, item: any) => sum + item.quantity,
                              0,
                            );
                            const totalValue = t.items.reduce(
                              (sum: number, item: any) =>
                                sum + item.quantity * item.buyPrice,
                              0,
                            );

                            return (
                              <tr
                                key={t.id}
                                className="hover:bg-slate-50/50 transition"
                              >
                                {trfVisibleColumns.id && (
                                  <td className="p-3.5 text-center font-mono font-black text-orange-600">
                                    {t.id}
                                  </td>
                                )}
                                {trfVisibleColumns.fromBranch && (
                                  <td className="p-3.5 text-[#0a1945]">
                                    {t.fromBranch}
                                  </td>
                                )}
                                {trfVisibleColumns.toBranch && (
                                  <td className="p-3.5 text-[#0a1945]">
                                    {t.toBranch}
                                  </td>
                                )}
                                {trfVisibleColumns.totalQty && (
                                  <td className="p-3.5 text-center text-slate-900">
                                    {totalQty} {lang === "ar" ? "قطعة" : "pcs"}
                                  </td>
                                )}
                                {trfVisibleColumns.totalValue && (
                                  <td className="p-3.5 text-center font-mono font-black text-emerald-600">
                                    {totalValue.toLocaleString()}{" "}
                                    {lang === "ar" ? "ج.م" : "EGP"}
                                  </td>
                                )}
                                {trfVisibleColumns.status && (
                                  <td className="py-3.5 text-center text-[8px] leading-none w-[96px] px-0">
                                    <span
                                      className={cn(
                                        "px-2.5 py-1 rounded-[8px] text-[10px] font-black border",
                                        t.status === "approved"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : t.status === "rejected"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200",
                                      )}
                                    >
                                      {t.status === "approved"
                                        ? lang === "ar"
                                          ? "تمت الموافقة"
                                          : "Approved"
                                        : t.status === "rejected"
                                          ? lang === "ar"
                                            ? "مرفوض"
                                            : "Rejected"
                                          : lang === "ar"
                                            ? "قيد الانتظار"
                                            : "Pending"}
                                    </span>
                                  </td>
                                )}
                                {trfVisibleColumns.username && (
                                  <td className="p-3.5 text-slate-500">
                                    {t.username}
                                  </td>
                                )}
                                {trfVisibleColumns.notes && (
                                  <td
                                    className="p-3.5 text-slate-500 max-w-[180px] truncate"
                                    title={t.notes}
                                  >
                                    {t.notes || "-"}
                                  </td>
                                )}
                                <td className="p-3.5 text-center">
                                  <div className="flex items-center gap-1 justify-center bg-white border border-slate-100 rounded-lg p-0.5 shadow-xs w-fit mx-auto">
                                    <button
                                      type="button"
                                      onClick={() => setViewingTransfer(t)}
                                      className="p-1.5 hover:bg-slate-50 text-slate-655 rounded-lg transition cursor-pointer"
                                      title={
                                        lang === "ar"
                                          ? "عرض تفاصيل الإذن"
                                          : "View Transfer"
                                      }
                                    >
                                      <Eye size={13} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTransferFormEditingId(t.id);
                                        setTfFromBranch(t.fromBranch);
                                        setTfToBranch(t.toBranch);
                                        setTfDate(t.date);
                                        setTfUsername(t.username);
                                        setTfStatus(t.status);
                                        setTfNotes(t.notes || "");
                                        setTfItems([...t.items]);
                                        setTfSelectedProductId("");
                                        setTfItemQty("");
                                        setTransferFormOpen(true);
                                      }}
                                      className="p-1.5 hover:bg-slate-50 text-blue-655 rounded-lg transition cursor-pointer"
                                      title={
                                        lang === "ar"
                                          ? "تعديل الإذن"
                                          : "Edit Transfer"
                                      }
                                    >
                                      <Edit2 size={13} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            lang === "ar"
                                              ? isAdditionMode
                                                ? "هل أنت متأكد من حذف إذن الإضافة هذا؟"
                                                : isIssueMode
                                                  ? "هل أنت متأكد من حذف إذن الصرف هذا؟"
                                                : isDestructionMode
                                                  ? "هل أنت متأكد من حذف إذن الاهلاك هذا؟"
                                                  : "هل أنت متأكد من حذف هذا الإذن بالكامل؟"
                                              : "Are you sure you want to delete this order?",
                                          )
                                        ) {
                                          setTransfers(
                                            transfers.filter(
                                              (tr) => tr.id !== t.id,
                                            ),
                                          );
                                          triggerToast(
                                            lang === "ar"
                                              ? isAdditionMode
                                                ? "تم حذف إذن الإضافة بنجاح"
                                                : isIssueMode
                                                  ? "تم حذف إذن الصرف بنجاح"
                                                : isDestructionMode
                                                  ? "تم حذف إذن الاهلاك بنجاح"
                                                  : "تم حذف إذن التحويل بنجاح"
                                              : "Transfer order deleted successfully",
                                          );
                                        }
                                      }}
                                      className="p-1.5 hover:bg-slate-50 text-red-655 rounded-lg transition cursor-pointer"
                                      title={
                                        lang === "ar"
                                          ? "حذف الإذن"
                                          : "Delete Transfer"
                                      }
                                    >
                                      <Trash2 size={13} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards View: Automatically shown on mobile and tablet (below lg) as fallback */}
                  <div className="block lg:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginatedTransfers.length === 0 ? (
                      <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-3xl font-bold col-span-full">
                        {lang === "ar"
                          ? isAdditionMode
                            ? "لا توجد أذونات إضافة مطابقة للبحث"
                            : isIssueMode
                              ? "لا توجد أذونات صرف مطابقة للبحث"
                            : isDestructionMode
                              ? "لا توجد أذونات اهلاك مطابقة للبحث"
                              : "لا توجد أذون تحويل مطابقة للبحث"
                          : isAdditionMode
                            ? "No addition vouchers found"
                            : isIssueMode
                              ? "No issue vouchers found"
                            : isDestructionMode
                              ? "No issue vouchers found"
                              : "No transfer orders found"}
                      </div>
                    ) : (
                      paginatedTransfers.map((t) => {
                        const totalQty = t.items.reduce(
                          (sum: number, item: any) => sum + item.quantity,
                          0,
                        );
                        const totalValue = t.items.reduce(
                          (sum: number, item: any) =>
                            sum + item.quantity * item.buyPrice,
                          0,
                        );

                        return (
                          <div
                            key={`resp-${t.id}`}
                            className="bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right border-slate-200"
                          >
                            <div className="flex justify-between items-center mb-3.5 rtl:flex-row-reverse">
                              <span className="font-mono text-[9px] bg-slate-100 text-[#f06424] px-2 py-0.5 rounded border border-slate-200 font-extrabold">
                                {t.id}
                              </span>
                              <span
                                className={cn(
                                  "text-[9.5px] font-black px-2.5 py-0.5 rounded-full border",
                                  t.status === "approved"
                                    ? "bg-emerald-50 text-emerald-655 border-emerald-150"
                                    : t.status === "rejected"
                                      ? "bg-rose-50 text-rose-655 border-rose-150"
                                      : "bg-amber-50 text-amber-655 border-amber-150",
                                )}
                              >
                                {t.status === "approved"
                                  ? lang === "ar"
                                    ? "معتمد"
                                    : "Approved"
                                  : t.status === "rejected"
                                    ? lang === "ar"
                                      ? "مرفوض"
                                      : "Rejected"
                                    : lang === "ar"
                                      ? "قيد الانتظار"
                                      : "Pending"}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-[13px] font-black text-slate-800 leading-snug flex items-center gap-1.5 justify-end">
                                <span>{t.toBranch}</span>
                                <ArrowRightLeft
                                  size={12}
                                  className="text-orange-400 rotate-180"
                                />
                                <span className="text-slate-500">
                                  {t.fromBranch}
                                </span>
                              </h4>
                            </div>

                            <div className="flex gap-2 justify-between items-center py-2 border-y border-slate-100 my-3 text-[10px] text-slate-500 font-bold rtl:flex-row-reverse">
                              <div>
                                {lang === "ar" ? "المستلم:" : "To:"}{" "}
                                {t.toBranch}
                              </div>
                              <div>
                                {lang === "ar" ? "المُرسل:" : "From:"}{" "}
                                {t.fromBranch}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 bg-slate-50 p-2.5 rounded-xl text-center text-[10px] font-bold border border-slate-100 mb-3.5">
                              <div>
                                <span className="text-slate-400 block text-[8px]">
                                  {lang === "ar" ? "القطع" : "Qty"}
                                </span>
                                <span className="font-mono text-slate-700 text-[11px] font-black">
                                  {totalQty} {lang === "ar" ? "قطعة" : "pcs"}
                                </span>
                              </div>
                              <div className="border-r border-slate-200">
                                <span className="text-slate-400 block text-[8px]">
                                  {lang === "ar" ? "القيمة" : "Value"}
                                </span>
                                <span className="font-mono text-emerald-600 text-[11px] font-black">
                                  {totalValue.toLocaleString()}{" "}
                                  {lang === "ar" ? "ج.م" : "EGP"}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 rtl:flex-row-reverse">
                              <div className="text-[10px] text-slate-400 text-right">
                                <span className="block">
                                  {lang === "ar" ? "المُعد:" : "By:"}
                                </span>
                                <span className="text-slate-650 font-extrabold truncate block max-w-[125px]">
                                  {t.username}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setViewingTransfer(t)}
                                  className="p-1.5 bg-[#0a1945] text-white rounded-lg transition hover:bg-slate-950 cursor-pointer"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    setTransferFormEditingId(t.id);
                                    setTfFromBranch(t.fromBranch);
                                    setTfToBranch(t.toBranch);
                                    setTfDate(t.date);
                                    setTfUsername(t.username);
                                    setTfStatus(t.status);
                                    setTfNotes(t.notes || "");
                                    setTfItems([...t.items]);
                                    setTfSelectedProductId("");
                                    setTfItemQty("");
                                    setTransferFormOpen(true);
                                  }}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition hover:bg-blue-100 cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        lang === "ar"
                                          ? "هل أنت متأكد من حذف هذا الإذن؟"
                                          : "Are you sure?",
                                      )
                                    ) {
                                      setTransfers(
                                        transfers.filter(
                                          (tr) => tr.id !== t.id,
                                        ),
                                      );
                                      triggerToast(
                                        lang === "ar"
                                          ? isAdditionMode
                                            ? "تم حذف إذن الإضافة بنجاح"
                                            : isIssueMode
                                              ? "تم حذف إذن الصرف بنجاح"
                                            : isDestructionMode
                                              ? "تم حذف إذن الاهلاك بنجاح"
                                              : "تم حذف إذن التحويل بنجاح"
                                          : "Transfer order deleted",
                                      );
                                    }
                                  }}
                                  className="p-1.5 bg-rose-50 text-rose-600 rounded-lg transition hover:bg-rose-100 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Cards Bento view for Transfers */
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedTransfers.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-3xl font-bold col-span-full">
                      {lang === "ar"
                        ? isAdditionMode
                          ? "لا توجد أذونات إضافة مطابقة للبحث"
                          : isIssueMode
                            ? "لا توجد أذونات صرف مطابقة للبحث"
                          : isDestructionMode
                            ? "لا توجد أذونات اهلاك مطابقة للبحث"
                            : "لا توجد أذون تحويل مطابقة للبحث"
                        : isAdditionMode
                          ? "No addition vouchers found"
                          : isIssueMode
                            ? "No issue vouchers found"
                          : isDestructionMode
                            ? "No issue vouchers found"
                            : "No transfer orders found"}
                    </div>
                  ) : (
                    paginatedTransfers.map((t) => {
                      const totalQty = t.items.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      );
                      const totalValue = t.items.reduce(
                        (sum: number, item: any) =>
                          sum + item.quantity * item.buyPrice,
                        0,
                      );

                      return (
                        <div
                          key={t.id}
                          className="bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all text-right border-slate-200"
                        >
                          <div className="flex justify-between items-center mb-3.5 rtl:flex-row-reverse">
                            <span className="font-mono text-[9px] bg-slate-100 text-[#f06424] px-2 py-0.5 rounded border border-slate-200 font-extrabold">
                              {t.id}
                            </span>
                            <span
                              className={cn(
                                "text-[9.5px] font-black px-2.5 py-0.5 rounded-full border",
                                t.status === "approved"
                                  ? "bg-emerald-50 text-emerald-655 border-emerald-150"
                                  : t.status === "rejected"
                                    ? "bg-rose-50 text-rose-655 border-rose-150"
                                    : "bg-amber-50 text-amber-655 border-amber-150",
                              )}
                            >
                              {t.status === "approved"
                                ? lang === "ar"
                                  ? "معتمد"
                                  : "Approved"
                                : t.status === "rejected"
                                  ? lang === "ar"
                                    ? "مرفوض"
                                    : "Rejected"
                                  : lang === "ar"
                                    ? "قيد الانتظار"
                                    : "Pending"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-[13px] font-black text-slate-800 leading-snug flex items-center gap-1.5 justify-end">
                              <span>{t.toBranch}</span>
                              <ArrowRightLeft
                                size={12}
                                className="text-orange-400 rotate-180"
                              />
                              <span className="text-slate-500">
                                {t.fromBranch}
                              </span>
                            </h4>
                          </div>

                          <div className="flex gap-2 justify-between items-center py-2 border-y border-slate-100 my-3 text-[10px] text-slate-500 font-bold rtl:flex-row-reverse">
                            <div>
                              {lang === "ar" ? "المستلم:" : "To:"} {t.toBranch}
                            </div>
                            <div>
                              {lang === "ar" ? "المُرسل:" : "From:"}{" "}
                              {t.fromBranch}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 bg-slate-50 p-2.5 rounded-xl text-center text-[10px] font-bold border border-slate-100 mb-3.5">
                            <div>
                              <span className="text-slate-400 block text-[8px]">
                                {lang === "ar" ? "القطع" : "Qty"}
                              </span>
                              <span className="font-mono text-slate-700 text-[11px] font-black">
                                {totalQty} {lang === "ar" ? "قطعة" : "pcs"}
                              </span>
                            </div>
                            <div className="border-r border-slate-200">
                              <span className="text-slate-400 block text-[8px]">
                                {lang === "ar" ? "القيمة" : "Value"}
                              </span>
                              <span className="font-mono text-emerald-600 text-[11px] font-black">
                                {totalValue.toLocaleString()}{" "}
                                {lang === "ar" ? "ج.م" : "EGP"}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 rtl:flex-row-reverse">
                            <div className="text-[10px] text-slate-400 text-right">
                              <span className="block">
                                {lang === "ar" ? "المُعد:" : "By:"}
                              </span>
                              <span className="text-slate-650 font-extrabold truncate block max-w-[125px]">
                                {t.username}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setViewingTransfer(t)}
                                className="p-1.5 bg-[#0a1945] text-white rounded-lg transition hover:bg-slate-950 cursor-pointer"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setTransferFormEditingId(t.id);
                                  setTfFromBranch(t.fromBranch);
                                  setTfToBranch(t.toBranch);
                                  setTfDate(t.date);
                                  setTfUsername(t.username);
                                  setTfStatus(t.status);
                                  setTfNotes(t.notes || "");
                                  setTfItems([...t.items]);
                                  setTfSelectedProductId("");
                                  setTfItemQty("");
                                  setTransferFormOpen(true);
                                }}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg transition hover:bg-blue-100 cursor-pointer"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      lang === "ar"
                                        ? "هل أنت متأكد من حذف هذا الإذن؟"
                                        : "Are you sure?",
                                    )
                                  ) {
                                    setTransfers(
                                      transfers.filter((tr) => tr.id !== t.id),
                                    );
                                    triggerToast(
                                      lang === "ar"
                                        ? isAdditionMode
                                          ? "تم حذف إذن الإضافة بنجاح"
                                          : isIssueMode
                                            ? "تم حذف إذن الصرف بنجاح"
                                          : isDestructionMode
                                            ? "تم حذف إذن الاهلاك بنجاح"
                                            : "تم حذف إذن التحويل بنجاح"
                                        : "Transfer order deleted",
                                    );
                                  }
                                }}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg transition hover:bg-rose-100 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <ProductTablePagination
                lang={lang}
                page={activeTrfPage}
                pageCount={totalTrfPages}
                pageSize={trfPageSize}
                shown={paginatedTransfers.length}
                total={filteredTransfers.length}
                onPageChange={setTrfPage}
                onPageSizeChange={(size) => {
                  setTrfPageSize(size);
                  setTrfPage(1);
                }}
                className="rounded-b-[12px] rounded-t-none border-x-0 border-b-0 border-t border-gray-200"
              />
            </div>
          </div>
        ) : (
          <ProductsListContainer
            lang={lang}
            filteredProducts={filteredProducts}
            richProducts={richProducts}
            brands={brands}
            groups={groups}
            colors={colors}
            sizes={sizes}
            divisions={divisions}
            items={items}
            setViewingProduct={setViewingProduct}
            openEditProductModal={openEditProductModal}
            handleDeleteProduct={handleDeleteProduct}
            triggerToast={triggerToast}
            prodSearchQuery={prodSearchQuery}
            setProdSearchQuery={setProdSearchQuery}
            isColumnFiltersOpen={isColumnFiltersOpen}
            setIsColumnFiltersOpen={setIsColumnFiltersOpen}
            advCode={advCode}
            setAdvCode={setAdvCode}
            advBarcode={advBarcode}
            setAdvBarcode={setAdvBarcode}
            advBrandId={advBrandId}
            setAdvBrandId={setAdvBrandId}
            advGroupId={advGroupId}
            setAdvGroupId={setAdvGroupId}
            advColorId={advColorId}
            setAdvColorId={setAdvColorId}
            advSizeId={advSizeId}
            setAdvSizeId={setAdvSizeId}
            advDivisionId={advDivisionId}
            setAdvDivisionId={setAdvDivisionId}
            advItemId={advItemId}
            setAdvItemId={setAdvItemId}
            advSupplierName={advSupplierName}
            setAdvSupplierName={setAdvSupplierName}
            extraToolbarAction={
              <ExportDataButton
                lang={lang}
                onToast={triggerToast}
                hideText={true}
                onCopy={() =>
                  triggerToast(
                    lang === "ar"
                      ? "تم نسخ البيانات إلى الحافظة"
                      : "Data copied to clipboard!",
                  )
                }
                onPrint={() =>
                  triggerToast(
                    lang === "ar"
                      ? "تم فتح خيارات الطباعة للجدول"
                      : "Print dialog opened!",
                  )
                }
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                }}
              />
            }
          />
        )}

        {/* MODAL 1: VIEW DETAILED PROFILE AND PROMOTIONS OFFERS (أوكازيون) */}
        <AnimatePresence>
          {viewingProduct &&
            (() => {
              // Dynamic movements builder
              const dynamicMovements = [
                {
                  date: "2026-05-16",
                  docNo: "383838",
                  descAr: "فاتوره مشتريات - هانى محاسب",
                  descEn: "Purchase Invoice - Hany Accountant",
                  inQty: 10,
                  inPrice: Number((viewingProduct.costPrice * 0.95).toFixed(2)),
                  outQty: null,
                  outPrice: null,
                  balance: 10,
                  branch: "cairo",
                },
                {
                  date: "2026-05-18",
                  docNo: "877",
                  descAr: "فاتوره بيع - احمد كاشير",
                  descEn: "Sales Invoice - Ahmed Cashier",
                  inQty: null,
                  inPrice: null,
                  outQty: 1,
                  outPrice: Number(viewingProduct.sellPrice.toFixed(2)),
                  balance: 9,
                  branch: "giza",
                },
                {
                  date: "2026-06-01",
                  docNo: "TRF-4402",
                  descAr: "تحويل مخزني وارد",
                  descEn: "Incoming Stock Transfer",
                  inQty: 5,
                  inPrice: Number(viewingProduct.costPrice.toFixed(2)),
                  outQty: null,
                  outPrice: null,
                  balance: 14,
                  branch: "alex",
                },
                {
                  date: "2026-06-12",
                  docNo: "INV-9022",
                  descAr: "فاتوره بيع - ساره كاشير",
                  descEn: "Sales Invoice - Sarah Cashier",
                  inQty: null,
                  inPrice: null,
                  outQty: 2,
                  outPrice: Number(viewingProduct.sellPrice.toFixed(2)),
                  balance: 12,
                  branch: "cairo",
                },
              ];

              // Filter movements by branch and date-range picker inputs
              const filteredMovements = dynamicMovements.filter((m) => {
                const matchesBranch =
                  movementBranch === "all" || m.branch === movementBranch;
                const matchesDate =
                  m.date >= movementStartDate && m.date <= movementEndDate;
                return matchesBranch && matchesDate;
              });

              // Dynamic promotions builder
              const basePromos = [
                {
                  date: "2026-06-15",
                  docNo: "PRM-8891",
                  user: lang === "ar" ? "أحمد منصور" : "Ahmed Mansour",
                  qty: 50,
                  prevBuyPrice: viewingProduct.costPrice * 1.05,
                  discount: viewingProduct.sellPrice * 0.1,
                  currBuyPrice: viewingProduct.costPrice,
                  promoPrice: viewingProduct.sellPrice * 0.9,
                },
                {
                  date: "2026-05-01",
                  docNo: "PRM-7712",
                  user: lang === "ar" ? "ليلى حسن" : "Layla Hassan",
                  qty: 100,
                  prevBuyPrice: viewingProduct.costPrice * 1.1,
                  discount: viewingProduct.sellPrice * 0.15,
                  currBuyPrice: viewingProduct.costPrice,
                  promoPrice: viewingProduct.sellPrice * 0.85,
                },
              ];

              return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {/* Header */}
                    <div
                      className="p-5 border-b border-slate-100 flex justify-between items-center rtl:flex-row-reverse"
                      style={{
                        height: "59.6667px",
                        backgroundColor: "#ff6900",
                        color: "#f0f3f8",
                      }}
                    >
                      <div>
                        <h3
                          className="text-md font-extrabold"
                          style={{
                            fontSize: "18px",
                            lineHeight: "28px",
                            color: "#f3f5f8",
                          }}
                        >
                          {isTransferMode
                            ? lang === "ar"
                              ? "تفاصيل إذن التحويل"
                              : "Transfer Details"
                            : isIssueMode
                              ? lang === "ar"
                                ? "تفاصيل إذن الصرف"
                                : "Issue Details"
                            : isDestructionMode
                              ? lang === "ar"
                                ? "تفاصيل إذن الاهلاك"
                                : "Destruction Details"
                              : lang === "ar"
                                ? "تفاصيل الصنف"
                                : "Product Details"}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setViewingProduct(null);
                          setNewPromoOfferNo("");
                          setNewPromoDiscount(0);
                        }}
                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Tabbed Navigation */}
                    <div className="flex bg-slate-100 border-b border-slate-200 p-1 gap-1 rtl:flex-row-reverse">
                      <button
                        onClick={() => setViewingTab("specs")}
                        className={cn(
                          "flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                          viewingTab === "specs"
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-200",
                        )}
                      >
                        {lang === "ar" ? "بيانات الصنف" : "Product Specs"}
                      </button>
                      <button
                        onClick={() => setViewingTab("movement")}
                        className={cn(
                          "flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                          viewingTab === "movement"
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-200",
                        )}
                      >
                        {lang === "ar" ? "حركة الصنف" : "Product Movement"}
                      </button>
                      <button
                        onClick={() => setViewingTab("promotions")}
                        className={cn(
                          "flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                          viewingTab === "promotions"
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-200",
                        )}
                      >
                        {lang === "ar" ? "أوكازيونات" : "Promotions"}
                      </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 overflow-y-auto space-y-6">
                      {/* 1. PRODUCT SPECS TAB */}
                      {viewingTab === "specs" && (
                        <div className="space-y-6">
                          {/* Top Cards Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Card 1: Purchase Price */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "سعر الشراء"
                                    : "Purchase Cost"}
                                </span>
                                <span className="text-sm font-black text-slate-800 font-mono block mt-0.5">
                                  ${viewingProduct.costPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <DollarSign size={16} />
                              </div>
                            </div>

                            {/* Card 2: Selling Price */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "سعر البيع"
                                    : "Selling Price"}
                                </span>
                                <span className="text-sm font-black text-[#0a1945] font-mono block mt-0.5">
                                  ${viewingProduct.sellPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Tag size={16} />
                              </div>
                            </div>

                            {/* Card 3: Promo Price */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "سعر العرض" : "Promo Price"}
                                </span>
                                <span className="text-sm font-black text-rose-600 font-mono block mt-0.5">
                                  {viewingProduct.promoPrice ||
                                  (viewingProduct.promoDetails &&
                                    viewingProduct.promoDetails.length > 0)
                                    ? `$${(viewingProduct.promoPrice || viewingProduct.promoDetails?.[0]?.promoSellPrice || 0).toFixed(2)}`
                                    : lang === "ar"
                                      ? "لا يوجد"
                                      : "N/A"}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                                <Percent size={15} />
                              </div>
                            </div>

                            {/* Card 4: Total Stock */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "اجمالى رصيد الفروع"
                                    : "Total Branches Stock"}
                                </span>
                                <span className="text-sm font-black text-emerald-600 font-mono block mt-0.5">
                                  {viewingProduct.qty} pcs
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Boxes size={16} />
                              </div>
                            </div>
                          </div>

                          {/* Specs Form Layout (Replicating create product form) */}
                          <div className="flex flex-col md:flex-row gap-6 items-start mt-4">
                            {/* Left Side: Images & Financials */}
                            <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                              {/* Main Image View */}
                              <div className="w-[178px] h-[178px] bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 relative overflow-hidden">
                                {viewingProduct.mainImage ? (
                                  <img
                                    src={viewingProduct.mainImage}
                                    className="w-full h-full object-cover"
                                    alt="Product main"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center opacity-40">
                                    <Shirt
                                      size={48}
                                      className="text-slate-400"
                                    />
                                    <span className="text-[10px] mt-1 font-extrabold">
                                      {lang === "ar"
                                        ? "لا توجد صورة"
                                        : "No Image"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Sub Images View */}
                              <div className="grid grid-cols-3 gap-2 w-[178px]">
                                {[0, 1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="aspect-square bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden"
                                  >
                                    {viewingProduct.subImages?.[i] ? (
                                      <img
                                        src={viewingProduct.subImages[i]}
                                        className="w-full h-full object-cover"
                                        alt="Sub"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                        <Plus
                                          size={14}
                                          className="text-slate-300"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Right Side: Grid of metadata fields */}
                            <div
                              className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 w-full text-right"
                              dir="rtl"
                            >
                              {/* Style Code */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "كود الموديل / SKU"
                                    : "Style Code"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-slate-800 text-[13px]">
                                  {viewingProduct.code}
                                </div>
                              </div>

                              {/* Barcode */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "باركود الصنف"
                                    : "EAN / Barcode"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-slate-800 text-[13px]">
                                  {viewingProduct.barcode || "N/A"}
                                </div>
                              </div>

                              {/* Profit Margin */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "نسبة الربح"
                                    : "Profit Margin"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-emerald-600 text-[13px]">
                                  {viewingProduct.costPrice > 0
                                    ? (
                                        ((viewingProduct.sellPrice -
                                          viewingProduct.costPrice) /
                                          viewingProduct.costPrice) *
                                        100
                                      ).toFixed(1) + "%"
                                    : "100%"}
                                </div>
                              </div>

                              {/* Description / Name */}
                              <div className="space-y-1 flex flex-col items-start text-start col-span-2 sm:col-span-3">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "الوصف" : "Description"}
                                </label>
                                <div className="w-full min-h-[50px] bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-start p-2 font-bold text-slate-800 text-xs text-right">
                                  {lang === "ar"
                                    ? viewingProduct.nameAr
                                    : viewingProduct.nameEn}
                                </div>
                              </div>

                              {/* Supplier Name */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "اسم المورد"
                                    : "Supplier Name"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {viewingProduct.supplierName ||
                                    (lang === "ar"
                                      ? "مورد عام"
                                      : "General Supplier")}
                                </div>
                              </div>

                              {/* Division */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "القسم الرئيسي" : "Division"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {divisions.find(
                                    (d) => d.id === viewingProduct.divisionId,
                                  )?.[lang === "ar" ? "nameAr" : "nameEn"] ||
                                    "General"}
                                </div>
                              </div>

                              {/* Season */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "الموسم" : "Season"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {viewingProduct.season ||
                                    (lang === "ar" ? "محير" : "All seasons")}
                                </div>
                              </div>

                              {/* Brand */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "العلامة التجارية" : "Brand"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {brands.find(
                                    (b) => b.id === viewingProduct.brandId,
                                  )?.[lang === "ar" ? "nameAr" : "nameEn"] ||
                                    "General"}
                                </div>
                              </div>

                              {/* Group */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "مجموعة الصنف"
                                    : "Item Group"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {groups.find(
                                    (g) => g.id === viewingProduct.groupId,
                                  )?.[lang === "ar" ? "nameAr" : "nameEn"] ||
                                    "General"}
                                </div>
                              </div>

                              {/* Category */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "البند التابع له"
                                    : "Category"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {items.find(
                                    (i) => i.id === viewingProduct.itemId,
                                  )?.[lang === "ar" ? "nameAr" : "nameEn"] ||
                                    "General"}
                                </div>
                              </div>

                              {/* Reorder preferences */}
                              <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-right w-full mt-1">
                                <span className="text-[10px] font-extrabold text-slate-500 block mb-1">
                                  {lang === "ar"
                                    ? "إعدادات حد إعادة الطلب الآمن"
                                    : "Reorder Alert Preferences"}
                                </span>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-xs font-bold text-slate-800">
                                    {viewingProduct.isCustomReorder
                                      ? lang === "ar"
                                        ? `تنبيه النقص عند رصيد أقل من: ${viewingProduct.reorderPoint || 5} قطع`
                                        : `Alert when stock falls below: ${viewingProduct.reorderPoint || 5} pcs`
                                      : lang === "ar"
                                        ? "تنبيه آلي قياسي (عند رصيد أقل من 10 قطع)"
                                        : "Standard Auto Alert (below 10 pcs)"}
                                  </span>
                                </div>
                              </div>

                              {/* Variants Table */}
                              {viewingProduct.variants &&
                                viewingProduct.variants.length > 0 && (
                                  <div className="col-span-2 sm:col-span-3 mt-4 space-y-2">
                                    <h4 className="text-xs font-black text-slate-800 text-right">
                                      {lang === "ar"
                                        ? "المتغيرات (الألوان والمقاسات)"
                                        : "Variants (Colors & Sizes)"}
                                    </h4>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                                      <table
                                        className="w-full text-center border-collapse text-xs font-bold text-slate-700"
                                        dir={lang === "ar" ? "rtl" : "ltr"}
                                      >
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-2 border-slate-200">
                                              {lang === "ar"
                                                ? "اللون"
                                                : "Color"}
                                            </th>
                                            <th className="p-2 border-slate-200">
                                              {lang === "ar"
                                                ? "المقاس"
                                                : "Size"}
                                            </th>
                                            <th className="p-2 border-slate-200">
                                              {lang === "ar"
                                                ? "كود الصنف"
                                                : "Code"}
                                            </th>
                                            <th className="p-2 border-slate-200">
                                              {lang === "ar"
                                                ? "الباركود"
                                                : "Barcode"}
                                            </th>
                                            <th className="p-2">
                                              {lang === "ar" ? "الكمية" : "Qty"}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {viewingProduct.variants.map(
                                            (v: any, idx: number) => (
                                              <tr
                                                key={idx}
                                                className="hover:bg-slate-50/50"
                                              >
                                                <td className="p-2 border-slate-100">
                                                  {colors.find(
                                                    (c: any) =>
                                                      c.id === v.colorId,
                                                  )?.[
                                                    lang === "ar"
                                                      ? "nameAr"
                                                      : "nameEn"
                                                  ] || "-"}
                                                </td>
                                                <td className="p-2 border-slate-100">
                                                  {sizes.find(
                                                    (s: any) =>
                                                      s.id === v.sizeId,
                                                  )?.[
                                                    lang === "ar"
                                                      ? "nameAr"
                                                      : "nameEn"
                                                  ] || "-"}
                                                </td>
                                                <td className="p-2 border-slate-100 font-mono text-[13px]">
                                                  {v.code || "-"}
                                                </td>
                                                <td className="p-2 border-slate-100 font-mono text-[13px]">
                                                  {v.barcode || "-"}
                                                </td>
                                                <td className="p-2 font-mono text-[13px] text-emerald-600 font-black">
                                                  {v.qty || 0}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. PRODUCT MOVEMENT TAB */}
                      {viewingTab === "movement" && (
                        <div className="space-y-4">
                          {/* Filters Panel */}
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 w-full lg:h-[90px]">
                            {/* Date Range Picker */}
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                                <span className="text-slate-500 text-[11px] font-extrabold shrink-0 w-16 text-right">
                                  {lang === "ar" ? "الفترة من:" : "From:"}
                                </span>
                                <input
                                  type="date"
                                  value={movementStartDate}
                                  onChange={(e) =>
                                    setMovementStartDate(e.target.value)
                                  }
                                  className="h-8 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 text-[13px] font-bold font-mono text-slate-700 flex-1 sm:w-auto"
                                />
                              </div>
                              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                                <span className="text-slate-500 text-[11px] font-extrabold shrink-0 w-16 text-right">
                                  {lang === "ar" ? "إلى:" : "To:"}
                                </span>
                                <input
                                  type="date"
                                  value={movementEndDate}
                                  onChange={(e) =>
                                    setMovementEndDate(e.target.value)
                                  }
                                  className="h-8 px-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 text-[13px] font-bold font-mono text-slate-700 flex-1 sm:w-auto"
                                />
                              </div>
                            </div>

                            {/* Branch Dropdown */}
                            <div className="flex items-center gap-2 rtl:flex-row-reverse w-full sm:w-auto h-full pt-1 sm:pt-0 sm:mr-auto">
                              <select
                                value={movementBranch}
                                onChange={(e) =>
                                  setMovementBranch(e.target.value)
                                }
                                className="h-[64px] lg:h-[46px] w-full lg:w-[370px] px-3 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 text-xs font-black text-slate-700 text-center"
                              >
                                <option value="all">
                                  {lang === "ar" ? "كل الفروع" : "All Branches"}
                                </option>
                                <option value="cairo">
                                  {lang === "ar"
                                    ? "الفرع الرئيسي - القاهرة"
                                    : "Main Cairo Branch"}
                                </option>
                                <option value="giza">
                                  {lang === "ar" ? "فرع الجيزة" : "Giza Branch"}
                                </option>
                                <option value="alex">
                                  {lang === "ar"
                                    ? "فرع الإسكندرية"
                                    : "Alexandria Branch"}
                                </option>
                              </select>
                            </div>
                          </div>

                          {/* Movement Table Container */}
                          <div className="space-y-4">
                            {/* Desktop: Movement Table */}
                            <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
                              <table
                                dir={lang === "ar" ? "rtl" : "ltr"}
                                className="w-full text-center border-collapse border border-slate-300 text-xs font-bold text-slate-700"
                              >
                                <thead>
                                  <tr className="bg-slate-100 border-b border-slate-300">
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-slate-300 w-28 text-center"
                                    >
                                      {lang === "ar" ? "تاريخ" : "Date"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-slate-300 w-28 text-center"
                                    >
                                      {lang === "ar"
                                        ? "رقم المستند"
                                        : "Doc No."}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-slate-300 text-right pr-4"
                                    >
                                      {lang === "ar" ? "بيان" : "Description"}
                                    </th>
                                    <th
                                      colSpan={2}
                                      className="p-2 border-r border-slate-300 text-center"
                                    >
                                      {lang === "ar" ? "وارد" : "Inward"}
                                    </th>
                                    <th
                                      colSpan={2}
                                      className="p-2 border-r border-slate-300 text-center"
                                    >
                                      {lang === "ar" ? "صادر" : "Outward"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-slate-300 w-24 text-center"
                                    >
                                      {lang === "ar" ? "الرصيد" : "Balance"}
                                    </th>
                                  </tr>
                                  <tr className="bg-slate-50 border-b border-slate-300 text-[10px] text-slate-500 font-extrabold">
                                    {/* Under Inward */}
                                    <th className="p-1 border-r border-slate-300 w-16 text-center">
                                      {lang === "ar" ? "كمية" : "Qty"}
                                    </th>
                                    <th className="p-1 border-r border-slate-300 w-16 text-center">
                                      {lang === "ar" ? "سعر" : "Price"}
                                    </th>
                                    {/* Under Outward */}
                                    <th className="p-1 border-r border-slate-300 w-16 text-center">
                                      {lang === "ar" ? "كمية" : "Qty"}
                                    </th>
                                    <th className="p-1 border-r border-slate-300 w-16 text-center">
                                      {lang === "ar" ? "سعر" : "Price"}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {filteredMovements.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="p-6 text-center text-slate-400 font-bold"
                                      >
                                        {lang === "ar"
                                          ? "لا توجد قيود حركة مخزنية لهذه الفترة والفرع المحددين."
                                          : "No movement records found for selected period & branch."}
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredMovements.map((m, idx) => (
                                      <tr
                                        key={idx}
                                        className="hover:bg-slate-50 text-slate-700 text-[11px] font-bold border-b border-slate-150"
                                      >
                                        {/* تاريخ */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-slate-600">
                                          {m.date}
                                        </td>

                                        {/* رقم المستند */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-slate-800 font-black">
                                          {m.docNo}
                                        </td>

                                        {/* بيان */}
                                        <td className="p-2.5 border-r border-slate-150 text-[13px] text-right pr-4 text-slate-800">
                                          {lang === "ar" ? m.descAr : m.descEn}
                                        </td>

                                        {/* وارد - كمية */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-emerald-600 font-black">
                                          {m.inQty !== null ? m.inQty : ""}
                                        </td>
                                        {/* وارد - سعر */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-emerald-600">
                                          {m.inPrice !== null
                                            ? `$${m.inPrice.toFixed(2)}`
                                            : ""}
                                        </td>

                                        {/* صادر - كمية */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-red-600 font-black">
                                          {m.outQty !== null ? m.outQty : ""}
                                        </td>
                                        {/* صادر - سعر */}
                                        <td className="p-2.5 border-r border-slate-150 font-mono text-[13px] text-center text-red-600">
                                          {m.outPrice !== null
                                            ? `$${m.outPrice.toFixed(2)}`
                                            : ""}
                                        </td>

                                        {/* الرصيد */}
                                        <td className="p-2.5 border-r border-slate-150 bg-slate-50 font-mono text-[13px] text-center text-slate-900">
                                          {m.balance}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile: Cards View */}
                            <div
                              className="block md:hidden space-y-4"
                              dir={lang === "ar" ? "rtl" : "ltr"}
                            >
                              {filteredMovements.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                  {lang === "ar"
                                    ? "لا توجد قيود حركة مخزنية لهذه الفترة والفرع المحددين."
                                    : "No movement records found for selected period & branch."}
                                </div>
                              ) : (
                                filteredMovements.map((m, idx) => {
                                  const isInward = m.inQty !== null;
                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "p-4 rounded-2xl shadow-xs transition-all text-xs font-bold space-y-3",
                                        isInward
                                          ? "bg-emerald-50/20 border border-emerald-300"
                                          : "bg-rose-50/20 border border-red-300",
                                      )}
                                    >
                                      {/* Title & Type Badge */}
                                      <div className="flex items-center justify-between border-b pb-2">
                                        <span
                                          className={cn(
                                            "px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-xs",
                                            isInward
                                              ? "bg-emerald-500 text-white"
                                              : "bg-red-500 text-white",
                                          )}
                                        >
                                          {isInward
                                            ? lang === "ar"
                                              ? "وارد"
                                              : "Inward"
                                            : lang === "ar"
                                              ? "صادر"
                                              : "Outward"}
                                        </span>
                                        <div className="text-right flex items-center gap-2">
                                          <span className="font-mono text-[13px] text-slate-500">
                                            {m.date}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Details Grid */}
                                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                                        {/* Description */}
                                        <div className="col-span-2 flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar"
                                              ? "البيان"
                                              : "Description"}
                                          </span>
                                          <span className="text-slate-800 text-sm font-black text-right w-full">
                                            {lang === "ar"
                                              ? m.descAr
                                              : m.descEn}
                                          </span>
                                        </div>

                                        {/* Document Number */}
                                        <div className="flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar"
                                              ? "رقم المستند"
                                              : "Doc No."}
                                          </span>
                                          <span className="font-mono text-[13px] text-slate-700">
                                            {m.docNo}
                                          </span>
                                        </div>

                                        {/* Quantity & Price */}
                                        <div className="flex flex-col items-start gap-1">
                                          {isInward ? (
                                            <>
                                              <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                                {lang === "ar"
                                                  ? "الكمية الواردة / السعر"
                                                  : "Inward Qty / Price"}
                                              </span>
                                              <span className="text-emerald-600 font-mono text-[13px]">
                                                {m.inQty} pcs / $
                                                {m.inPrice?.toFixed(2)}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                                {lang === "ar"
                                                  ? "الكمية الصادرة / السعر"
                                                  : "Outward Qty / Price"}
                                              </span>
                                              <span className="text-red-600 font-mono text-[13px]">
                                                {m.outQty} pcs / $
                                                {m.outPrice?.toFixed(2)}
                                              </span>
                                            </>
                                          )}
                                        </div>

                                        {/* Current Balance */}
                                        <div className="flex flex-col items-start gap-1">
                                          <span className="text-[10px] text-slate-450 uppercase tracking-wider">
                                            {lang === "ar"
                                              ? "الرصيد بعد الحركة"
                                              : "Post-balance"}
                                          </span>
                                          <span className="font-mono text-[13px] text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            {m.balance} pcs
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. PROMOTIONS TAB */}
                      {viewingTab === "promotions" && (
                        <div className="space-y-4">
                          {/* Summary Header */}
                          <div className="flex justify-between items-center border-b pb-2 rtl:flex-row-reverse">
                            <h4 className="text-xs font-black text-rose-600 flex items-center gap-1.5">
                              <Percent size={14} />
                              <span>
                                {lang === "ar"
                                  ? "سجل الأوكازيونات وعروض الأسعار الترويجية المفعّلة"
                                  : "Seasonal Promotions & Active Offers"}
                              </span>
                            </h4>
                            <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 font-bold text-[10.5px]">
                              {lang === "ar"
                                ? `${basePromos.length} عروض مسجلة`
                                : `${basePromos.length} active promos`}
                            </span>
                          </div>

                          {/* Promotions Table Container */}
                          <div className="space-y-4">
                            {/* Desktop: Promotions Table */}
                            <div className="hidden md:block border border-orange-200 rounded-2xl overflow-hidden overflow-x-auto">
                              <table className="w-full text-center border-collapse border border-slate-200 text-xs font-bold text-slate-700">
                                <thead>
                                  <tr className="bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider">
                                    <th className="p-2.5 border border-orange-600">
                                      {lang === "ar" ? "تاريخ" : "Date"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600">
                                      {lang === "ar" ? "رقم مستند" : "Doc No."}
                                    </th>
                                    <th className="p-2.5 border border-orange-600">
                                      {lang === "ar" ? "مستخدم" : "User"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600">
                                      {lang === "ar" ? "كمية" : "Qty"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600 font-mono">
                                      {lang === "ar"
                                        ? "سعر شراء سابق"
                                        : "Prev Buy Price"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600 text-yellow-100">
                                      {lang === "ar" ? "خصم" : "Discount"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600 font-mono">
                                      {lang === "ar"
                                        ? "سعر شراء حالى"
                                        : "Curr Buy Price"}
                                    </th>
                                    <th className="p-2.5 border border-orange-600 text-orange-100 font-black">
                                      {lang === "ar"
                                        ? "بيع بالعرض"
                                        : "Promo Sell Price"}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {basePromos.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="p-6 text-center text-slate-400 font-bold"
                                      >
                                        {lang === "ar"
                                          ? "لا توجد عروض ترويجية مسجلة حالياً"
                                          : "No promotions found."}
                                      </td>
                                    </tr>
                                  ) : (
                                    basePromos.map((p, idx) => (
                                      <tr
                                        key={idx}
                                        className="hover:bg-orange-50/20 text-slate-700 font-mono text-[13px] font-bold border-b border-slate-150"
                                      >
                                        <td className="p-2.5 border border-slate-150 font-sans">
                                          {p.date}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 text-slate-900 font-sans font-black">
                                          {p.docNo}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 font-sans">
                                          {p.user}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 text-slate-800">
                                          {p.qty}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 text-slate-500">
                                          ${p.prevBuyPrice.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 text-red-600 font-black">
                                          -${p.discount.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 text-emerald-600 font-black">
                                          ${p.currBuyPrice.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-slate-150 bg-orange-50/30 text-orange-600 font-black">
                                          ${p.promoPrice.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile: Cards View */}
                            <div
                              className="block md:hidden space-y-4"
                              dir={lang === "ar" ? "rtl" : "ltr"}
                            >
                              {basePromos.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                  {lang === "ar"
                                    ? "لا توجد عروض ترويجية مسجلة حالياً"
                                    : "No promotions found."}
                                </div>
                              ) : (
                                basePromos.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-orange-50/20 border border-orange-200 p-4 rounded-2xl shadow-xs transition-all text-xs font-bold space-y-3"
                                  >
                                    {/* Title & Type Badge */}
                                    <div className="flex items-center justify-between border-b border-orange-200/50 pb-2">
                                      <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-xs bg-orange-500 text-white">
                                        {p.docNo}
                                      </span>
                                      <span className="text-slate-500 font-mono text-[11px]">
                                        {p.date}
                                      </span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-slate-700">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar" ? "المستخدم" : "User"}
                                        </span>
                                        <span className="font-bold">
                                          {p.user}
                                        </span>
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar" ? "الكمية" : "Qty"}
                                        </span>
                                        <span className="font-mono">
                                          {p.qty}
                                        </span>
                                      </div>

                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar"
                                            ? "سعر شراء سابق"
                                            : "Prev Buy Price"}
                                        </span>
                                        <span className="font-mono">
                                          ${p.prevBuyPrice.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar" ? "الخصم" : "Discount"}
                                        </span>
                                        <span className="font-mono text-red-600 font-black">
                                          -${p.discount.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Footer with Prices */}
                                    <div className="flex items-center justify-between pt-2 border-t border-orange-200/50 mt-1">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar"
                                            ? "سعر شراء حالى"
                                            : "Curr Buy Price"}
                                        </span>
                                        <span className="font-mono text-emerald-600 font-black">
                                          ${p.currBuyPrice.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col gap-0.5 text-right rtl:text-left">
                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                          {lang === "ar"
                                            ? "بيع بالعرض"
                                            : "Promo Sell Price"}
                                        </span>
                                        <span className="font-mono text-orange-600 font-black text-sm">
                                          ${p.promoPrice.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button
                        onClick={() => {
                          setViewingProduct(null);
                          setNewPromoOfferNo("");
                          setNewPromoDiscount(0);
                        }}
                        className="px-6 py-2 bg-[#0a1945] hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        {lang === "ar" ? "إغلاق النافذة" : "Close window"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
        </AnimatePresence>

        {/* MODAL 2: CREATE / EDIT PRODUCT MODAL */}
        <AnimatePresence>
          {editingProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-[95vw] md:max-w-none md:w-[774px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header — title on the right for Arabic */}
                <div
                  className="px-5 flex items-center shrink-0 gap-2"
                  style={{
                    height: "57px",
                    backgroundColor: "#e47b12",
                    color: "#eceff5",
                    direction: lang === "ar" ? "rtl" : "ltr",
                  }}
                >
                  <h3 className="text-md font-extrabold text-[#eceff5] flex flex-1 items-center gap-2 justify-start">
                    <Package size={18} />
                    {editingProduct === "NEW"
                      ? isTransferMode
                        ? lang === "ar"
                          ? "إنشاء إذن تحويل جديد بين الفروع"
                          : "Create New Branch Transfer Order"
                        : isIssueMode
                          ? lang === "ar"
                            ? "إنشاء إذن صرف جديد"
                            : "Create New Issue Voucher"
                        : isDestructionMode
                          ? lang === "ar"
                            ? "إنشاء إذن اهلاك جديد"
                            : "Create New Destruction Voucher"
                          : lang === "ar"
                            ? "إنشاء وإدراج صنف جديد بالسيستم"
                            : "Register New Inventory Style"
                      : isTransferMode
                        ? lang === "ar"
                          ? `تعديل إذن التحويل: ${editingProduct.code}`
                          : `Edit Transfer Order: ${editingProduct.code}`
                        : isIssueMode
                          ? lang === "ar"
                            ? `تعديل إذن الصرف: ${editingProduct.code}`
                            : `Edit Issue Voucher: ${editingProduct.code}`
                        : isDestructionMode
                          ? lang === "ar"
                            ? `تعديل إذن الاهلاك: ${editingProduct.code}`
                            : `Edit Destruction Voucher: ${editingProduct.code}`
                          : lang === "ar"
                            ? `تعديل بيانات الصنف: ${editingProduct.code}`
                            : `Edit Product Style: ${editingProduct.code}`}
                  </h3>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="p-1.5 hover:bg-black/10 text-[#eceff5] rounded-lg transition cursor-pointer shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Form body */}
                <form
                  onSubmit={handleSaveProductForm}
                  className="overflow-y-auto flex-1 p-6 text-xs font-bold text-slate-700 w-full md:w-[772px] flex flex-col md:flex-row md:flex-wrap gap-4 md:gap-x-2 md:gap-y-4 md:rtl:flex-row-reverse content-start"
                  style={{ paddingLeft: "3px", paddingRight: "41px" }}
                >
                  {/* Images Section */}
                  <div
                    className="mx-auto md:mx-0 shrink-0 space-y-3 w-full md:w-[187px] max-md:order-2 max-md:mt-2"
                    style={{
                      minHeight: "393px",
                      marginRight: "0px",
                      marginLeft: "0px",
                    }}
                  >
                    {/* Main Image */}
                    <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-orange-500 hover:text-orange-500 transition cursor-pointer relative overflow-hidden group block mx-auto md:mx-0 w-full md:w-[180px] md:h-[180px] mb-[9px]">
                      {formMainImage ? (
                        <>
                          <img
                            src={formMainImage}
                            className="w-full h-full object-cover"
                            alt="Main product"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={32} />
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon
                            size={36}
                            className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity"
                          />
                          <span className="text-[11px] uppercase tracking-wider">
                            {lang === "ar"
                              ? "رفع الصورة الأساسية"
                              : "Upload Main Image"}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            setFormMainImage(
                              URL.createObjectURL(e.target.files[0]),
                            );
                        }}
                      />
                    </label>

                    {/* Sub Images */}
                    <div className="grid grid-cols-3 gap-3 mx-auto md:mx-0 w-full md:w-[178px] mb-[46px]">
                      {[0, 1, 2].map((idx) => (
                        <label
                          key={idx}
                          className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:border-orange-400 hover:text-orange-400 transition cursor-pointer relative overflow-hidden group block"
                        >
                          {formSubImages[idx] ? (
                            <>
                              <img
                                src={formSubImages[idx]!}
                                className="w-full h-full object-cover"
                                alt={`Sub product ${idx + 1}`}
                              />
                              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white w-5 h-5" />
                              </div>
                            </>
                          ) : (
                            <Plus
                              size={20}
                              className="group-hover:opacity-100 transition-opacity"
                            />
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                const newSub = [...formSubImages];
                                newSub[idx] = URL.createObjectURL(
                                  e.target.files[0],
                                );
                                setFormSubImages(newSub);
                              }
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    {/* Financial Inputs under Images */}
                    <div className="hidden md:flex flex-row md:flex-col gap-2 mx-auto md:mx-0 w-full md:w-[180px] mt-2">
                      {/* Profit Margin */}
                      <div className="flex flex-row items-center justify-center shrink-0 gap-2 w-full h-[45px] text-center rounded-lg border-[0.2px] border-[#10b346] border-solid">
                        <label
                          className="text-slate-500 block text-[11px]"
                          style={{
                            textAlign: "center",
                            height: "20.3281px",
                            width: "65.9375px",
                            paddingTop: "2px",
                          }}
                        >
                          {lang === "ar" ? "نسبة الربح (%)" : "Profit Margin"}
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={formProfitMargin || ""}
                          onChange={(e) => {
                            const margin = Number(e.target.value);
                            setFormProfitMargin(margin);
                            setFormSellPrice(
                              Number(
                                (formCostPrice * (1 + margin / 100)).toFixed(2),
                              ),
                            );
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold text-[14px] px-1 outline-none focus:border-orange-500 text-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ height: "36px", width: "74px" }}
                        />
                      </div>

                      <div className="flex flex-row justify-between items-center gap-2">
                        {/* Offer Price */}
                        <div
                          className="space-y-1 flex flex-col items-center shrink-0"
                          style={{
                            width: "80px",
                            height: "87.4px",
                            paddingTop: "3px",
                            textAlign: "center",
                            borderRadius: "8px",
                            borderWidth: "0.2px",
                            borderColor: "#10b346",
                            borderStyle: "solid",
                          }}
                        >
                          <label
                            className="text-slate-500 block"
                            style={{
                              textAlign: "center",
                              width: "67.5104px",
                              height: "24px",
                            }}
                          >
                            {lang === "ar" ? "سعر العرض" : "Offer Price"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formPromoPrice || ""}
                            onChange={(e) =>
                              setFormPromoPrice(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            className="bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold text-[16px] px-1 outline-none focus:border-orange-500 text-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{
                              height: "60.0833px",
                              width: "71.6667px",
                              paddingBottom: "0px",
                              marginBottom: "4px",
                            }}
                          />
                        </div>

                        {/* Selling Price */}
                        <div
                          className="space-y-1 flex flex-col items-center shrink-0"
                          style={{
                            width: "80px",
                            height: "87.4px",
                            paddingTop: "3px",
                            textAlign: "center",
                            borderRadius: "8px",
                            borderWidth: "0.2px",
                            borderColor: "#10b346",
                            borderStyle: "solid",
                          }}
                        >
                          <label
                            className="text-slate-500 block"
                            style={{
                              textAlign: "center",
                              width: "67.5104px",
                              height: "24px",
                            }}
                          >
                            {lang === "ar" ? "سعر البيع" : "Selling Price"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formSellPrice || ""}
                            onChange={(e) => {
                              const sell = Number(e.target.value);
                              setFormSellPrice(sell);
                              if (formCostPrice > 0) {
                                setFormProfitMargin(
                                  Number(
                                    (
                                      ((sell - formCostPrice) / formCostPrice) *
                                      100
                                    ).toFixed(0),
                                  ),
                                );
                              }
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold text-[16px] px-1 outline-none focus:border-orange-500 text-[#0a1945] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{
                              height: "60.0833px",
                              width: "71.6667px",
                              paddingBottom: "0px",
                              marginBottom: "3px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 max-md:order-1 min-w-[280px]">
                    {/* Form Inputs Grid */}
                    <div className="flex flex-wrap lg:flex-nowrap gap-6 content-start justify-end">
                      {/* Combined Inputs Block - 3 columns */}
                      <div
                        className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 shrink-0 w-full md:w-[542.667px]"
                        style={{ marginLeft: "0px", paddingLeft: "0px" }}
                      >
                        {/* Code */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-1">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "كود الموديل / SKU" : "Style Code"}
                          </label>
                          <input
                            type="text"
                            required
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] px-2"
                          />
                        </div>

                        {/* Barcode */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-2">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "باركود الصنف" : "EAN / Barcode"}
                          </label>
                          <div className="relative w-full h-[34px]">
                            <input
                              type="text"
                              required
                              disabled={formAutoBarcode}
                              value={formBarcode}
                              onChange={(e) => setFormBarcode(e.target.value)}
                              className={cn(
                                "w-full h-full border border-slate-200 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] pl-2 pr-7 transition-colors",
                                formAutoBarcode
                                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                  : "bg-slate-50 text-slate-800",
                              )}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                              <input
                                type="checkbox"
                                checked={formAutoBarcode}
                                onChange={(e) =>
                                  handleAutoBarcodeChange(e.target.checked)
                                }
                                className="accent-orange-500 w-3.5 h-3.5 cursor-pointer"
                                title={
                                  lang === "ar"
                                    ? "إنشاء الباركود آلياً"
                                    : "Auto Generate Barcode"
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Purchase Price */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-4">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "سعر الشراء" : "Purchase Price"}
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formCostPrice || ""}
                            onChange={(e) => {
                              const cost = Number(e.target.value);
                              setFormCostPrice(cost);
                              setFormSellPrice(
                                Number(
                                  (cost * (1 + formProfitMargin / 100)).toFixed(
                                    2,
                                  ),
                                ),
                              );
                            }}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold text-[15px] px-2 outline-none focus:border-orange-500 text-slate-800"
                          />
                        </div>

                        {/* Mobile Profit Margin */}
                        <div className="md:hidden space-y-1 flex flex-col items-start text-start max-md:order-5">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "نسبة الربح (%)" : "Profit Margin"}
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={formProfitMargin || ""}
                            onChange={(e) => {
                              const margin = Number(e.target.value);
                              setFormProfitMargin(margin);
                              setFormSellPrice(
                                Number(
                                  (formCostPrice * (1 + margin / 100)).toFixed(
                                    2,
                                  ),
                                ),
                              );
                            }}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] px-2 text-emerald-600"
                          />
                        </div>

                        {/* Mobile Selling Price */}
                        <div className="md:hidden space-y-1 flex flex-col items-start text-start max-md:order-6">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "سعر البيع" : "Selling Price"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formSellPrice || ""}
                            onChange={(e) => {
                              const sell = Number(e.target.value);
                              setFormSellPrice(sell);
                              if (formCostPrice > 0) {
                                setFormProfitMargin(
                                  Number(
                                    (
                                      ((sell - formCostPrice) / formCostPrice) *
                                      100
                                    ).toFixed(0),
                                  ),
                                );
                              }
                            }}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] px-2 text-[#0a1945]"
                          />
                        </div>

                        {/* Mobile Offer Price */}
                        <div className="md:hidden space-y-1 flex flex-col items-start text-start max-md:order-7">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "سعر العرض" : "Offer Price"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formPromoPrice || ""}
                            onChange={(e) =>
                              setFormPromoPrice(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                              )
                            }
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] px-2 text-red-500"
                          />
                        </div>

                        {/* Name (Both Languages) */}
                        <div className="space-y-1 flex flex-col items-start text-start col-span-2 md:col-span-3 max-md:order-3">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "الوصف" : "Description"}
                          </label>
                          <textarea
                            required
                            value={formNameAr}
                            onChange={(e) => {
                              setFormNameAr(e.target.value);
                              setFormNameEn(e.target.value);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold outline-none focus:border-orange-500 text-xs px-2 py-2 resize-none"
                            style={{ height: "69px" }}
                          />
                        </div>

                        {/* Supplier Name Dropdown */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-8">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "اسم المورد" : "Supplier Name"}
                          </label>
                          <select
                            value={formSupplierName}
                            onChange={(e) =>
                              setFormSupplierName(e.target.value)
                            }
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            <option value="">
                              {lang === "ar"
                                ? "اختر المورد..."
                                : "Select Supplier..."}
                            </option>
                            {[
                              "مورد عام",
                              "شركة النسيج العربية",
                              "محلات المصطفى",
                              "مؤسسة التوحيد",
                              "استيراد دولي",
                            ].map((sup) => (
                              <option key={sup} value={sup}>
                                {sup}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Division */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-11">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "القسم الرئيسي" : "Division"}
                          </label>
                          <select
                            value={formDivisionId}
                            onChange={(e) => setFormDivisionId(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            {divisions.map((d) => (
                              <option key={d.id} value={d.id}>
                                {lang === "ar" ? d.nameAr : d.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Season */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-9">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "الموسم" : "Season"}
                          </label>
                          <select
                            value={formSeason}
                            onChange={(e) => setFormSeason(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            <option value="">
                              {lang === "ar"
                                ? "اختر الموسم..."
                                : "Select Season..."}
                            </option>
                            {[
                              "صيفي",
                              "شتوي",
                              "خريفي",
                              "ربيعي",
                              "محير (All seasons)",
                            ].map((season) => (
                              <option key={season} value={season}>
                                {season}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Brand */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-10">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "العلامة التجارية" : "Brand"}
                          </label>
                          <select
                            value={formBrandId}
                            onChange={(e) => setFormBrandId(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            {brands.map((b) => (
                              <option key={b.id} value={b.id}>
                                {lang === "ar" ? b.nameAr : b.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Group */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-12">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "مجموعة الصنف" : "Item Group"}
                          </label>
                          <select
                            value={formGroupId}
                            onChange={(e) => setFormGroupId(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {lang === "ar" ? g.nameAr : g.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Item category */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-13">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "البند التابع له" : "Category"}
                          </label>
                          <select
                            value={formItemId}
                            onChange={(e) => setFormItemId(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-[8px] text-right font-bold text-xs px-2 outline-none focus:border-orange-500"
                          >
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {lang === "ar" ? i.nameAr : i.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Reorder settings */}
                        <div
                          className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200 text-right w-full col-span-2 md:col-span-3 max-md:order-14"
                          style={{ marginTop: "-1px", borderRadius: "8px" }}
                        >
                          <div className="flex justify-between items-center rtl:flex-row-reverse mb-2">
                            <span className="text-[11px] font-extrabold text-slate-800 shrink-0">
                              {lang === "ar"
                                ? "إعدادات حد إعادة الطلب الآمن"
                                : "Reorder Alert Preferences"}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 justify-between w-full">
                            {/* Option 1: Quantity based */}
                            <div
                              className={cn(
                                "flex-1 flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer",
                                formIsCustomReorder
                                  ? "bg-orange-50/50 border-orange-400"
                                  : "bg-white border-slate-200 hover:border-orange-200",
                              )}
                              onClick={() =>
                                setFormIsCustomReorder(!formIsCustomReorder)
                              }
                              style={{ height: "46px", borderRadius: "8px" }}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={formIsCustomReorder}
                                  onChange={(e) =>
                                    setFormIsCustomReorder(e.target.checked)
                                  }
                                  className="accent-orange-500 w-4 h-4 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span
                                  className="text-[11.5px] font-bold text-slate-700"
                                  style={{
                                    marginLeft: "0px",
                                    marginRight: "8px",
                                  }}
                                >
                                  {lang === "ar"
                                    ? "تنبيه النقص عند رصيد:"
                                    : "Alert when stock falls below:"}
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max="1000"
                                  disabled={!formIsCustomReorder}
                                  value={formReorderPoint}
                                  onChange={(e) =>
                                    setFormReorderPoint(Number(e.target.value))
                                  }
                                  className={cn(
                                    "bg-white border font-bold outline-none focus:border-orange-500 text-slate-800 transition-colors",
                                    formIsCustomReorder
                                      ? "border-slate-300"
                                      : "border-slate-100 text-slate-400 bg-slate-50",
                                  )}
                                  style={{
                                    width: "70px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    fontSize: "15px",
                                    paddingBottom: "6px",
                                    paddingTop: "5px",
                                    lineHeight: "11px",
                                    fontFamily: "system-ui",
                                    paddingRight: "14px",
                                  }}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-bold",
                                    formIsCustomReorder
                                      ? "text-slate-500"
                                      : "text-slate-300",
                                  )}
                                >
                                  {lang === "ar" ? "قطعة" : "pieces"}
                                </span>
                              </div>
                            </div>

                            {/* Option 2: Percentage based */}
                            <div
                              className={cn(
                                "flex-1 flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer",
                                formIsReorderSaleActive
                                  ? "bg-orange-50/50 border-orange-400"
                                  : "bg-white border-slate-200 hover:border-orange-200",
                              )}
                              onClick={() =>
                                setFormIsReorderSaleActive(
                                  !formIsReorderSaleActive,
                                )
                              }
                              style={{ height: "46px", borderRadius: "8px" }}
                            >
                              <div
                                className="flex items-center gap-2"
                                style={{
                                  marginLeft: "0px",
                                  marginRight: "0px",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={formIsReorderSaleActive}
                                  onChange={(e) =>
                                    setFormIsReorderSaleActive(e.target.checked)
                                  }
                                  className="accent-orange-500 w-4 h-4 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span
                                  className="text-[11.5px] font-bold text-slate-700"
                                  style={{ marginRight: "8px" }}
                                >
                                  {lang === "ar"
                                    ? "تنبيه عند مبيعات بنسبة:"
                                    : "Alert at sales percentage:"}
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  disabled={!formIsReorderSaleActive}
                                  value={formReorderSalePercent}
                                  onChange={(e) =>
                                    setFormReorderSalePercent(
                                      Number(e.target.value),
                                    )
                                  }
                                  className={cn(
                                    "bg-white border font-bold outline-none focus:border-orange-500 text-slate-800 transition-colors",
                                    formIsReorderSaleActive
                                      ? "border-slate-300"
                                      : "border-slate-100 text-slate-400 bg-slate-50",
                                  )}
                                  style={{
                                    width: "70px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    textAlign: "center",
                                    fontSize: "15px",
                                    paddingBottom: "6px",
                                    paddingTop: "5px",
                                    lineHeight: "11px",
                                    fontFamily: "system-ui",
                                    paddingRight: "14px",
                                    marginRight: "0px",
                                    marginLeft: "0px",
                                  }}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] font-bold",
                                    formIsReorderSaleActive
                                      ? "text-slate-500"
                                      : "text-slate-300",
                                  )}
                                  style={{ marginLeft: "0px" }}
                                >
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Variants and Options Bar */}
                  <div className="w-full mt-2 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden text-xs font-bold text-slate-700 max-md:order-3">
                    {/* Header Bar */}
                    <div
                      className="flex flex-row justify-between items-center p-3 cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors select-none"
                      onClick={() => {
                        const nextVal = !formHasVariants;
                        setFormHasVariants(nextVal);
                        if (nextVal && formVariants.length === 0) {
                          setFormVariants([
                            {
                              sizeId: sizes[0]?.id || "SZ1",
                              colorId: colors[0]?.id || "CLR1",
                              costPrice: Number(formCostPrice) || 0,
                              sellPrice: Number(formSellPrice) || 0,
                              barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
                              autoBarcode: true,
                            },
                          ]);
                        }
                      }}
                    >
                      <span className="text-xs font-extrabold text-slate-800">
                        {lang === "ar"
                          ? "إعدادات الألوان والمقاسات والمتغيرات للصنف"
                          : "Size, Color & Variant Options"}
                      </span>
                      <input
                        type="checkbox"
                        checked={formHasVariants}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setFormHasVariants(nextVal);
                          if (nextVal && formVariants.length === 0) {
                            setFormVariants([
                              {
                                sizeId: sizes[0]?.id || "SZ1",
                                colorId: colors[0]?.id || "CLR1",
                                costPrice: Number(formCostPrice) || 0,
                                sellPrice: Number(formSellPrice) || 0,
                                barcode: `2026${Math.floor(10000000 + Math.random() * 90000000)}`,
                                autoBarcode: true,
                              },
                            ]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-orange-500 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Expandable Table Content */}
                    {formHasVariants && (
                      <div className="p-4 border-t border-slate-200 bg-white space-y-3 overflow-x-auto">
                        <div className="min-w-[600px]">
                          {/* Table Headers */}
                          <div className="grid grid-cols-12 gap-2 text-center text-slate-500 font-extrabold text-[11px] border-b border-slate-100 pb-2 rtl:flex-row-reverse">
                            <div className="col-span-2 text-right rtl:text-right pr-2">
                              {lang === "ar" ? "المقاس" : "Size"}
                            </div>
                            <div className="col-span-2 text-right rtl:text-right pr-2">
                              {lang === "ar" ? "اللون" : "Color"}
                            </div>
                            <div className="col-span-2 text-center">
                              {lang === "ar" ? "سعر الشراء" : "Buy Price"}
                            </div>
                            <div className="col-span-2 text-center">
                              {lang === "ar" ? "سعر البيع" : "Sell Price"}
                            </div>
                            <div className="col-span-3 text-center">
                              {lang === "ar" ? "الباركود" : "Barcode"}
                            </div>
                            <div className="col-span-1"></div>
                          </div>

                          {/* Table Rows */}
                          <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                            {formVariants.map((item, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-12 gap-2 items-center text-xs rtl:flex-row-reverse"
                              >
                                {/* Size Dropdown */}
                                <div className="col-span-2">
                                  <select
                                    value={item.sizeId}
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "sizeId",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-1 font-bold outline-none focus:border-orange-500 text-[11px]"
                                  >
                                    {sizes.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {lang === "ar" ? s.nameAr : s.nameEn}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Color Dropdown */}
                                <div className="col-span-2">
                                  <select
                                    value={item.colorId}
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "colorId",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-1 font-bold outline-none focus:border-orange-500 text-[11px]"
                                  >
                                    {colors.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {lang === "ar" ? c.nameAr : c.nameEn}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Buy Price */}
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.costPrice}
                                    onKeyDown={(e) =>
                                      handleVariantKeyDown(e, idx)
                                    }
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "costPrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-orange-500 font-mono text-[14px]"
                                  />
                                </div>

                                {/* Sell Price */}
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.sellPrice}
                                    onKeyDown={(e) =>
                                      handleVariantKeyDown(e, idx)
                                    }
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "sellPrice",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-orange-500 font-mono text-[14px]"
                                  />
                                </div>

                                {/* Barcode input with auto checkbox */}
                                <div className="col-span-3 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-1.5 h-8">
                                  <input
                                    type="text"
                                    disabled={item.autoBarcode}
                                    value={item.barcode}
                                    onKeyDown={(e) =>
                                      handleVariantKeyDown(e, idx)
                                    }
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "barcode",
                                        e.target.value,
                                      )
                                    }
                                    className={cn(
                                      "flex-1 bg-transparent font-mono font-bold outline-none text-[14px] text-center w-0",
                                      item.autoBarcode
                                        ? "text-slate-400 cursor-not-allowed"
                                        : "text-slate-800",
                                    )}
                                    style={{ lineHeight: "20.6667px" }}
                                  />
                                  <input
                                    type="checkbox"
                                    checked={item.autoBarcode}
                                    onChange={(e) =>
                                      handleUpdateVariant(
                                        idx,
                                        "autoBarcode",
                                        e.target.checked,
                                      )
                                    }
                                    className="accent-orange-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                    title={
                                      lang === "ar"
                                        ? "توليد تلقائي"
                                        : "Auto Generate"
                                    }
                                  />
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVariant(idx)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Row Button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddVariantRow}
                              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              {lang === "ar"
                                ? "إضافة سطر متغير جديد"
                                : "Add New Variant Row"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit / Cancel */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100 max-md:order-4 max-md:mt-6 mt-auto">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition cursor-pointer"
                      style={{
                        width: "103px",
                        borderRadius: '8px',
                        borderColor: "#b02c0a",
                        borderWidth: "0.1px",
                      }}
                    >
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-md"
                      style={{ width: "170px", borderRadius: '8px' }}
                    >
                      {isTransferMode
                        ? lang === "ar"
                          ? "حفظ إذن التحويل بالكامل"
                          : "Save transfer details"
                        : isIssueMode
                          ? lang === "ar"
                            ? "حفظ إذن الصرف بالكامل"
                            : "Save issue details"
                        : isDestructionMode
                          ? lang === "ar"
                            ? "حفظ إذن الاهلاك بالكامل"
                            : "Save destruction details"
                          : lang === "ar"
                            ? "حفظ الصنف بالكامل"
                            : "Save style details"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* MODAL 3: VIEW TRANSFER DETAIL */}
          {viewingTransfer && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header with Orange/Brown title bar style — title on the right for Arabic */}
                <div
                  style={{ height: "56px", direction: lang === "ar" ? "rtl" : "ltr" }}
                  className="px-5 border-b border-orange-600 bg-orange-500 text-white flex items-center gap-2"
                >
                  <div className="flex flex-1 items-center gap-3 justify-start">
                    <ArrowRightLeft size={18} />
                    <h3 className="text-sm font-black">
                      {lang === "ar"
                        ? isAdditionMode
                          ? `تفاصيل إذن إضافة: ${viewingTransfer.id}`
                          : isIssueMode
                            ? `تفاصيل إذن صرف: ${viewingTransfer.id}`
                            : `تفاصيل إذن تحويل: ${viewingTransfer.id}`
                        : isAdditionMode
                          ? `Addition Voucher Details: ${viewingTransfer.id}`
                          : isIssueMode
                            ? `Issue Voucher Details: ${viewingTransfer.id}`
                            : `Transfer Permit Details: ${viewingTransfer.id}`}
                    </h3>
                    <span className="text-[10px] bg-orange-600 px-2 py-0.5 rounded-md font-mono">
                      {lang === "ar"
                        ? `تاريخ: ${viewingTransfer.date}`
                        : `Date: ${viewingTransfer.date}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setViewingTransfer(null)}
                    className="p-1.5 hover:bg-orange-600 text-white rounded-lg transition cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Content body */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 font-bold">
                  {/* General metadata grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block text-[9.5px] font-bold">
                        {lang === "ar"
                          ? isAdditionMode
                            ? "من حساب"
                            : isIssueMode
                              ? "الفرع / المخزن"
                            : isDestructionMode
                              ? "الفرع / المخزن"
                              : "من فرع"
                          : isAdditionMode
                            ? "From Account"
                            : isIssueMode
                              ? "Branch / Warehouse"
                            : isDestructionMode
                              ? "Branch / Warehouse"
                              : "From Branch"}
                      </span>
                      <span className="text-xs font-black text-slate-800 block mt-1">
                        {viewingTransfer.fromBranch}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block text-[9.5px] font-bold">
                        {lang === "ar"
                          ? isAdditionMode
                            ? "الفرع / المخزن"
                            : isIssueMode
                              ? "إلى حساب"
                            : isDestructionMode
                              ? "إلى حساب"
                              : "إلى فرع"
                          : isAdditionMode
                            ? "Branch / Store"
                            : isIssueMode
                              ? "To Account"
                            : isDestructionMode
                              ? "To Account"
                              : "To Branch"}
                      </span>
                      <span className="text-xs font-black text-slate-800 block mt-1">
                        {viewingTransfer.toBranch}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block text-[9.5px] font-bold">
                        {lang === "ar"
                          ? isAdditionMode
                            ? "مسؤول الإضافة"
                            : isIssueMode
                              ? "مسؤول الصرف"
                            : isDestructionMode
                              ? "مسؤول الاهلاك"
                              : "مسؤول التحويل"
                          : "User"}
                      </span>
                      <span className="text-xs font-black text-slate-800 block mt-1">
                        {viewingTransfer.username}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block text-[9.5px] font-bold">
                        {lang === "ar" ? "الحالة" : "Status"}
                      </span>
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border mt-1",
                          viewingTransfer.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : viewingTransfer.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {viewingTransfer.status === "approved"
                          ? lang === "ar"
                            ? "تمت الموافقة"
                            : "Approved"
                          : viewingTransfer.status === "rejected"
                            ? lang === "ar"
                              ? "مرفوض"
                              : "Rejected"
                            : lang === "ar"
                              ? "قيد الانتظار"
                              : "Pending"}
                      </span>
                    </div>
                  </div>

                  {viewingTransfer.notes && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-right">
                      <span className="text-slate-400 block text-[10px] font-bold mb-1">
                        {lang === "ar" ? (isDestructionMode ? "سبب الاهلاك:" : "الملاحظات:") : (isDestructionMode ? "Destruction Reason:" : "Notes:")}
                      </span>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {viewingTransfer.notes}
                      </p>
                    </div>
                  )}

                  {/* Transfer Items Table */}
                  <div className="space-y-2">
                    <h4 className="text-[11.5px] font-black text-[#0a1945] border-b pb-1.5 flex justify-between items-center w-full">
                      {/* Left Side: Print Type Dropdown */}
                      <div
                        className="flex items-center gap-1.5 text-slate-700 font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-slate-500 font-bold">
                          {lang === "ar" ? "نوع الطباعة:" : "Print Type:"}
                        </span>
                        <select
                          value={tfPrintType}
                          onChange={(e) =>
                            setTfPrintType(
                              e.target.value as "a4" | "a5" | "thermal",
                            )
                          }
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-orange-500 text-slate-800"
                          style={{ width: "125px", marginRight: "0px", marginLeft: "16px" }}
                        >
                          <option value="a4">
                            {lang === "ar" ? "ورق A4" : "A4 Paper"}
                          </option>
                          <option value="a5">
                            {lang === "ar" ? "ورق A5" : "A5 Paper"}
                          </option>
                          <option value="thermal">
                            {lang === "ar"
                              ? "ورق حراري كاشير (80 مم)"
                              : "Thermal Cashier"}
                          </option>
                        </select>
                      </div>
                      {/* Right Side: Title */}
                      <div className="flex items-center gap-1.5 justify-end">
                        <span>
                          {lang === "ar"
                            ? "الأصناف المحولة"
                            : "Transferred Items"}
                        </span>
                        <Package size={14} className="text-orange-500" />
                      </div>
                    </h4>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[10.5px] font-black">
                            <th className="p-3 text-right">
                              {lang === "ar" ? "اسم الصنف" : "Item Name"}
                            </th>
                            <th className="p-3">
                              {lang === "ar" ? "الكود" : "Code"}
                            </th>
                            <th className="p-3">
                              {lang === "ar" ? "الباركود" : "Barcode"}
                            </th>
                            <th className="p-3">
                              {lang === "ar" ? "الكمية" : "Qty"}
                            </th>
                            <th className="p-3">
                              {lang === "ar" ? "سعر الشراء" : "Cost"}
                            </th>
                            <th className="p-3 text-left">
                              {lang === "ar" ? "إجمالي القيمة" : "Subtotal"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {viewingTransfer.items.map((item: any) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/50 transition"
                            >
                              <td className="p-3 text-right text-[#0a1945] font-black">
                                {item.nameAr}
                              </td>
                              <td className="p-3 font-mono">{item.code}</td>
                              <td className="p-3 font-mono text-slate-400">
                                {item.barcode}
                              </td>
                              <td className="p-3 font-bold text-slate-900">
                                {item.quantity}
                              </td>
                              <td className="p-3 font-mono text-slate-600">
                                {item.buyPrice} {lang === "ar" ? "ج.م" : "EGP"}
                              </td>
                              <td className="p-3 text-left font-mono text-emerald-600 font-extrabold">
                                {(
                                  item.quantity * item.buyPrice
                                ).toLocaleString()}{" "}
                                {lang === "ar" ? "ج.م" : "EGP"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-black border-t border-slate-200 text-xs text-slate-800">
                            <td
                              colSpan={3}
                              className="p-3 text-right font-black"
                            >
                              {lang === "ar" ? "الإجماليات:" : "Totals:"}
                            </td>
                            <td className="p-3 text-slate-900">
                              {viewingTransfer.items.reduce(
                                (sum: number, i: any) => sum + i.quantity,
                                0,
                              )}
                            </td>
                            <td className="p-3"></td>
                            <td className="p-3 text-left text-emerald-600 font-black">
                              {viewingTransfer.items
                                .reduce(
                                  (sum: number, i: any) =>
                                    sum + i.quantity * i.buyPrice,
                                  0,
                                )
                                .toLocaleString()}{" "}
                              {lang === "ar" ? "ج.م" : "EGP"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setViewingTransfer(null)}
                    className="w-[130px] py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-lg text-xs transition cursor-pointer flex items-center justify-center"
                  >
                    {lang === "ar" ? "إغلاق النافذة" : "Close"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printTransferOrder(viewingTransfer, tfPrintType)
                    }
                    className="w-[130px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Printer size={13} />
                    {lang === "ar" ? "طباعة" : "Print"}
                  </button>
                  {viewingTransfer.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setTransfers(
                            transfers.map((tr) =>
                              tr.id === viewingTransfer.id
                                ? { ...tr, status: "approved" }
                                : tr,
                            ),
                          );
                          setViewingTransfer(null);
                          triggerToast(
                            lang === "ar"
                              ? isAdditionMode
                                ? "تم الموافقة على إذن الإضافة بنجاح!"
                                : isIssueMode
                                  ? "تم الموافقة على إذن الصرف بنجاح!"
                                : isDestructionMode
                                  ? "تم الموافقة على إذن الاهلاك بنجاح!"
                                  : "تم الموافقة على إذن التحويل بنجاح!"
                              : "Transfer order approved!",
                          );
                        }}
                        className="w-[140px] py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center justify-center"
                      >
                        {lang === "ar" ? "موافقة المستلم" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTransfers(
                            transfers.map((tr) =>
                              tr.id === viewingTransfer.id
                                ? { ...tr, status: "rejected" }
                                : tr,
                            ),
                          );
                          setViewingTransfer(null);
                          triggerToast(
                            lang === "ar"
                              ? isAdditionMode
                                ? "تم رفض إذن الإضافة!"
                                : isIssueMode
                                  ? "تم رفض إذن الصرف!"
                                : isDestructionMode
                                  ? "تم رفض إذن الاهلاك!"
                                  : "تم رفض إذن التحويل!"
                              : "Transfer order rejected!",
                          );
                        }}
                        className="w-[120px] py-2 bg-red-500 hover:bg-red-600 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center justify-center"
                      >
                        {lang === "ar" ? "رفض الطلب" : "Reject"}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* MODAL 4: CREATE / EDIT TRANSFER ORDER */}
          {transferFormOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header resembling the attached Excel format — title on the right for Arabic */}
                <div
                  style={{ height: "56px", direction: lang === "ar" ? "rtl" : "ltr" }}
                  className="px-5 border-b border-orange-600 bg-orange-500 text-white flex items-center gap-2"
                >
                  <div className="flex flex-1 items-center gap-2 justify-start">
                    <ArrowRightLeft size={18} />
                    <h3 className="text-md font-black">
                      {transferFormEditingId
                        ? lang === "ar"
                          ? isAdditionMode
                            ? `تعديل إذن إضافة أصناف رقم: ${transferFormEditingId}`
                            : isIssueMode
                              ? `تعديل إذن صرف أصناف رقم: ${transferFormEditingId}`
                              : `تعديل إذن تحويل أصناف رقم: ${transferFormEditingId}`
                          : isAdditionMode
                            ? `Edit Item Addition Voucher: ${transferFormEditingId}`
                            : isIssueMode
                              ? `Edit Item Issue Voucher: ${transferFormEditingId}`
                              : `Edit Item Transfer Order: ${transferFormEditingId}`
                        : lang === "ar"
                          ? isAdditionMode
                            ? "إذن إضافة أصناف جديد"
                            : isIssueMode
                              ? "إذن صرف أصناف جديد"
                            : isDestructionMode
                              ? "إذن اهلاك أصناف جديد"
                              : "إذن تحويل أصناف جديد بين الفروع"
                          : isAdditionMode
                            ? "New Item Addition Voucher"
                            : isIssueMode
                              ? "New Item Issue Voucher"
                            : isDestructionMode
                              ? "New Item Destruction Voucher"
                              : "New Item Transfer Permit Between Branches"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferFormOpen(false)}
                    className="p-1.5 bg-orange-600/50 hover:bg-orange-600/80 text-white rounded-lg transition cursor-pointer shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Content body */}
                <form
                  onSubmit={handleSaveTransferOrder}
                  className="overflow-y-auto flex-1 p-6 space-y-6 text-xs text-slate-700 font-bold"
                >
                  {/* Two-row Excel Style Form Layout */}
                  <div
                    style={{ marginTop: "-18px" }}
                    className="bg-slate-50 p-3 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-3"
                  >
                    {/* Right Column: 8 columns width */}
                    <div className="md:col-span-8 space-y-3">
                      {/* From Branch dropdown */}
                      <div className={`flex items-center gap-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
                        <label className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} w-[95px]`}>
                          {lang === "ar"
                            ? isAdditionMode
                              ? "من حساب:"
                              : isIssueMode
                                ? "الفرع / المخزن:"
                              : isDestructionMode
                                ? "الفرع / المخزن:"
                                : "من فرع (المُرسل):"
                            : isAdditionMode
                              ? "From Account:"
                              : isIssueMode
                                ? "Branch / Warehouse:"
                              : isDestructionMode
                                ? "Branch / Warehouse:"
                                : "From Branch:"}
                        </label>
                        <select
                          value={tfFromBranch}
                          onChange={(e) => setTfFromBranch(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[11px]"
                          style={{ marginRight: "0px", paddingRight: "10px", paddingLeft: "2px" }}
                        >
                          {(isAdditionMode ? accountsList : branchesList).map(
                            (b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {/* To Branch dropdown */}
                      <div className={`flex items-center gap-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
                        <label className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} w-[95px]`}>
                          {lang === "ar"
                            ? isAdditionMode
                              ? "الفرع / المخزن:"
                              : isIssueMode
                                ? "إلى حساب:"
                              : isDestructionMode
                                ? "إلى حساب:"
                                : "إلى فرع (المُستقبِل):"
                            : isAdditionMode
                              ? "Branch / Warehouse:"
                              : isIssueMode
                                ? "To Account:"
                              : isDestructionMode
                                ? "To Account:"
                                : "To Branch:"}
                        </label>
                        <select
                          value={tfToBranch}
                          onChange={(e) => setTfToBranch(e.target.value)}
                          disabled={isDestructionMode}
                          className={cn(
                            "flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[11px]",
                            isDestructionMode && "bg-slate-100 cursor-not-allowed"
                          )}
                          style={{ marginRight: "0px", width: "163px", paddingRight: "10px", paddingLeft: "2px" }}
                        >
                          {isDestructionMode ? (
                            <option value="اهلاك الاصناف">
                              {lang === "ar" ? "اهلاك الاصناف" : "Item Destruction"}
                            </option>
                          ) : (
                            ((isIssueMode || isDestructionMode) ? accountsList : branchesList).map(
                              (b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ),
                            )
                          )}
                        </select>
                      </div>

                      {/* Notes input */}
                      <div className={`flex items-start gap-2 ${lang === "ar" ? "text-right" : "text-left"} w-full`}>
                        <label
                          className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} mt-1 w-[85px]`}
                          style={{ height: "17.3281px" }}
                        >
                          {lang === "ar"
                            ? isDestructionMode
                              ? "سبب الاهلاك:"
                              : "ملاحظات:"
                            : isDestructionMode
                              ? "Destruction Reason:"
                              : "Notes:"}
                        </label>
                        <textarea
                          value={tfNotes}
                          onChange={(e) => setTfNotes(e.target.value)}
                          required={isDestructionMode}
                          placeholder={
                            lang === "ar"
                              ? isDestructionMode
                                ? "اكتب سبب الاهلاك..."
                                : "ملاحظات..."
                              : isDestructionMode
                                ? "Enter destruction reason..."
                                : "Notes..."
                          }
                          className="flex-1 px-2.5 py-1 min-h-[32px] bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[11px] resize-none"
                        />
                      </div>
                    </div>

                    {/* Left Column: 4 columns width */}
                    <div className="md:col-span-4 space-y-3">
                      {/* Status Dropdown */}
                      <div className={`flex items-center gap-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
                        <label className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} w-[85px]`}>
                          {lang === "ar"
                            ? "حالة الاعتماد:"
                            : "Approval Status:"}
                        </label>
                        <select
                          value={tfStatus}
                          onChange={(e) => setTfStatus(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[11px]"
                        >
                          <option value="pending">
                            {lang === "ar" ? "قيد الانتظار" : "Pending"}
                          </option>
                          <option value="approved">
                            {lang === "ar" ? "معتمد ومقبول" : "Approved"}
                          </option>
                          <option value="rejected">
                            {lang === "ar" ? "مرفوض" : "Rejected"}
                          </option>
                        </select>
                      </div>

                      {/* Date input */}
                      <div className={`flex items-center gap-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
                        <label className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} w-[85px]`}>
                          {lang === "ar"
                            ? isAdditionMode
                              ? "تاريخ الإضافة:"
                              : isIssueMode
                                ? "تاريخ الصرف:"
                              : isDestructionMode
                                ? "تاريخ الاهلاك:"
                                : "تاريخ التحويل:"
                            : isAdditionMode
                              ? "Addition Date:"
                              : isIssueMode
                                ? "Issue Date:"
                              : isDestructionMode
                                ? "Destruction Date:"
                                : "Transfer Date:"}
                        </label>
                        <input
                          type="date"
                          required
                          value={tfDate}
                          onChange={(e) => setTfDate(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-mono text-center font-bold text-[11px]"
                          style={{ height: "33px" }}
                        />
                      </div>

                      {/* Username input */}
                      <div className={`flex items-center gap-2 ${lang === "ar" ? "text-right" : "text-left"}`}>
                        <label className={`text-[#0a1945] font-black text-[10px] shrink-0 ${lang === "ar" ? "text-right" : "text-left"} w-[85px]`}>
                          {lang === "ar" ? "مُعد الإذن:" : "Prepared By:"}
                        </label>
                        <input
                          type="text"
                          required
                          value={tfUsername}
                          onChange={(e) => setTfUsername(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[11px]"
                          style={{ width: "159px", height: "30.6406px" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add Items Sub-Screen (Interactive) */}
                  <div
                    style={{ marginTop: "-11px", marginBottom: "6px" }}
                    className="bg-[#fcf8f2] p-3 rounded-2xl border border-orange-100 space-y-2"
                  >
                    <h4
                      className="text-[12px] font-black text-orange-700 border-b border-orange-100 pb-1 flex justify-between items-center w-full"
                      style={{ direction: lang === "ar" ? "rtl" : "ltr" }}
                    >
                      {/* Right side in Arabic: Title */}
                      <div className="flex items-center gap-1.5">
                        <Plus size={14} className="text-orange-500" />
                        <span>
                          {lang === "ar" ? "اختيار الأصناف" : "Select items"}
                        </span>
                      </div>
                      {/* Left side in Arabic: Print Type */}
                      <div
                        className="flex items-center gap-1.5 text-slate-700 font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-slate-500 font-bold">
                          {lang === "ar" ? "نوع الطباعة:" : "Print Type:"}
                        </span>
                        <select
                          value={tfPrintType}
                          onChange={(e) =>
                            setTfPrintType(
                              e.target.value as "a4" | "a5" | "thermal",
                            )
                          }
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-orange-500 text-slate-800"
                          style={{ width: "125px", marginRight: "0px", marginLeft: "16px" }}
                        >
                          <option value="a4">
                            {lang === "ar" ? "ورق A4" : "A4 Paper"}
                          </option>
                          <option value="a5">
                            {lang === "ar" ? "ورق A5" : "A5 Paper"}
                          </option>
                          <option value="thermal">
                            {lang === "ar"
                              ? "ورق حراري كاشير (80 مم)"
                              : "Thermal Cashier"}
                          </option>
                        </select>
                      </div>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                      {/* Product Search Input with Autocomplete */}
                      <div className="flex items-center justify-between gap-2 md:col-span-2 relative text-right">
                        <div className="relative w-full">
                          <input
                            ref={tfProductSearchInputRef}
                            type="text"
                            value={tfProductSearchQuery}
                            onChange={(e) => {
                              setTfProductSearchQuery(e.target.value);
                              setTfSelectedProductId("");
                              setTfProductHighlightedIndex(0);
                              setTfProductSearchFocused(true);
                            }}
                            onFocus={() => {
                              setTfProductSearchFocused(true);
                              setTfProductHighlightedIndex(0);
                            }}
                            onBlur={() => {
                              // Small timeout so onMouseDown executes first
                              setTimeout(
                                () => setTfProductSearchFocused(false),
                                200,
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setTfProductHighlightedIndex((prev) =>
                                  tfFilteredProductsList.length > 0
                                    ? (prev + 1) % tfFilteredProductsList.length
                                    : 0,
                                );
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setTfProductHighlightedIndex((prev) =>
                                  tfFilteredProductsList.length > 0
                                    ? (prev -
                                        1 +
                                        tfFilteredProductsList.length) %
                                      tfFilteredProductsList.length
                                    : 0,
                                );
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                if (tfFilteredProductsList.length > 0) {
                                  const selectedProduct =
                                    tfFilteredProductsList[
                                      tfProductHighlightedIndex
                                    ];
                                  handleSelectProduct(selectedProduct);
                                }
                              } else if (e.key === "Escape") {
                                setTfProductSearchFocused(false);
                              }
                            }}
                            placeholder={
                              lang === "ar"
                                ? "ابحث بالاسم، باركود، أو موديل..."
                                : "Search by name, barcode, or model..."
                            }
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700 text-[13px]"
                          />

                          {/* Autocomplete suggestions dropdown */}
                          {tfProductSearchFocused &&
                            tfFilteredProductsList.length > 0 && (
                              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-right">
                                {tfFilteredProductsList.map(
                                  (p: any, idx: number) => (
                                    <div
                                      key={p.id}
                                      onMouseDown={() => handleSelectProduct(p)}
                                      onMouseEnter={() =>
                                        setTfProductHighlightedIndex(idx)
                                      }
                                      className={cn(
                                        "px-3 py-2 cursor-pointer text-xs flex justify-between items-center transition-colors font-bold",
                                        idx === tfProductHighlightedIndex
                                          ? "bg-orange-50 text-orange-950"
                                          : "text-slate-700 hover:bg-slate-50",
                                      )}
                                    >
                                      <div className="text-left font-mono text-slate-400 text-[10px]">
                                        {p.barcode} |{" "}
                                        {lang === "ar"
                                          ? `رصيد: ${p.qty !== undefined ? p.qty : 10}`
                                          : `Stock: ${p.qty !== undefined ? p.qty : 10}`}
                                      </div>
                                      <div className="text-right flex flex-col">
                                        <span className="text-slate-900">
                                          {p.nameAr}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                                          {p.code}
                                        </span>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Display read-only current stock/balance */}
                      <div className="flex items-center justify-between gap-2 text-center">
                        <label className="text-slate-500 font-bold text-[12px] shrink-0 text-right">
                          {lang === "ar" ? "الرصيد:" : "Stock:"}
                        </label>
                        <div className="w-[60%] px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg font-mono font-black text-slate-800 text-center text-[13px]">
                          {selectedProductObj
                            ? selectedProductObj.qty !== undefined
                              ? selectedProductObj.qty
                              : 10
                            : 0}{" "}
                          {lang === "ar" ? "قطعة" : "pcs"}
                        </div>
                      </div>

                      {/* Quantity input to transfer */}
                      <div className="flex items-center justify-between gap-2 text-center">
                        <label className="text-slate-500 font-bold text-[12px] shrink-0 text-right">
                          {lang === "ar" ? "الكمية:" : "Qty:"}
                        </label>
                        <input
                          ref={tfQtyInputRef}
                          type="number"
                          min="1"
                          value={tfItemQty || ""}
                          onChange={(e) =>
                            setTfItemQty(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault(); // Prevents saving the main order form
                              handleAddItemToTransfer();
                            }
                          }}
                          className="w-[60%] px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-mono text-center font-bold text-[13px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transfer Items Table */}
                  <div className="space-y-2">
                    <h4 className="text-[11.5px] font-black text-slate-800 border-b pb-1.5 text-right">
                      {lang === "ar"
                        ? isAdditionMode
                          ? "جدول بنود الإضافة"
                          : isIssueMode
                            ? "جدول بنود الصرف"
                          : isDestructionMode
                            ? "جدول بنود الاهلاك"
                            : "جدول بنود التحويل"
                        : isAdditionMode
                          ? "Addition Items Log"
                          : isIssueMode
                            ? "Issue Items Log"
                          : isDestructionMode
                            ? "Destruction Items Log"
                            : "Transfer Items Log"}
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[10.5px] font-black">
                            <th className="p-2.5 text-right">
                              {lang === "ar" ? "اسم الصنف" : "Item Name"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar" ? "الكود" : "Code"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar" ? "الباركود" : "Barcode"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar"
                                ? "الكمية المحولة"
                                : "Transfer Qty"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar" ? "سعر الشراء" : "Purchase Cost"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar" ? "إجمالي القيمة" : "Total Value"}
                            </th>
                            <th className="p-2.5">
                              {lang === "ar"
                                ? isAdditionMode
                                  ? "الرصيد قبل الإضافة"
                                  : isIssueMode
                                    ? "الرصيد قبل الصرف"
                                  : isDestructionMode
                                    ? "الرصيد قبل الاهلاك"
                                    : "الرصيد قبل التحويل"
                                : "Stock Before"}
                            </th>
                            <th className="p-2.5 w-[50px]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {tfItems.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="p-8 text-center text-slate-400 font-bold"
                              >
                                {lang === "ar"
                                  ? "يرجى اختيار وإضافة أصناف لجدول التحويل أعلاه"
                                  : "No items added to this permit yet"}
                              </td>
                            </tr>
                          ) : (
                            tfItems.map((item, index) => (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-50/50 transition"
                              >
                                <td className="p-2.5 text-right text-[#0a1945] font-black">
                                  {item.nameAr}
                                </td>
                                <td className="p-2.5 font-mono">{item.code}</td>
                                <td className="p-2.5 font-mono text-slate-400">
                                  {item.barcode}
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity || ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? "" : Math.max(1, Number(e.target.value));
                                      const updated = [...tfItems];
                                      updated[index].quantity = val;
                                      setTfItems(updated);
                                    }}
                                    className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold"
                                  />
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">
                                  {item.buyPrice}{" "}
                                  {lang === "ar" ? "ج.م" : "EGP"}
                                </td>
                                <td className="p-2.5 font-mono text-emerald-600">
                                  {(
                                    item.quantity * item.buyPrice
                                  ).toLocaleString()}{" "}
                                  {lang === "ar" ? "ج.م" : "EGP"}
                                </td>
                                <td className="p-2.5 font-mono text-slate-400">
                                  {item.currentStock}{" "}
                                  {lang === "ar" ? "قطعة" : "pcs"}
                                </td>
                                <td className="p-2.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTfItems(
                                        tfItems.filter((i) => i.id !== item.id),
                                      )
                                    }
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                    title={
                                      lang === "ar"
                                        ? "حذف من التحويل"
                                        : "Remove from transfer"
                                    }
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-black border-t border-slate-200 text-xs text-slate-800">
                            <td
                              colSpan={3}
                              className="p-3 text-right font-black"
                            >
                              {lang === "ar" ? "الإجماليات:" : "Totals:"}
                            </td>
                            <td className="p-3 text-slate-900">
                              {tfItems.reduce((sum, i) => sum + i.quantity, 0)}{" "}
                              {lang === "ar" ? "قطع" : "pcs"}
                            </td>
                            <td className="p-3"></td>
                            <td className="p-3 text-emerald-600">
                              {tfItems
                                .reduce(
                                  (sum, i) => sum + i.quantity * i.buyPrice,
                                  0,
                                )
                                .toLocaleString()}{" "}
                              {lang === "ar" ? "ج.م" : "EGP"}
                            </td>
                            <td colSpan={2} className="p-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Form actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTransferFormOpen(false)}
                      className="w-[120px] py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      {lang === "ar" ? "إلغاء وإغلاق" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="w-[120px] py-2 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-md"
                    >
                      {lang === "ar" ? "حفظ" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAndPrintTransferOrder}
                      className="w-[150px] py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Printer size={13} />
                      {lang === "ar" ? "حفظ وطباعة" : "Save & Print"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 animate-bounce flex items-center gap-2 text-xs font-bold font-sans">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container Header */}
      <div
        className={cn(
          "bg-white border border-[#eaeff2] rounded-3xl p-6 shadow-xs",
          lang === "ar" && "rtl font-[Cairo]",
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#eaeff2] pb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-orange-500 w-5 h-5" />
              <span>
                {lang === "ar"
                  ? "تصنيفات وتكويد المنتجات"
                  : "Product Classifications Matrix"}
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {lang === "ar"
                ? "إدارة الأقسام والبراندات ومجموعات الأصناف، المقاسات والألوان بالتفصيل لتسهيل فرز المخازن وفواتير المبيعات."
                : "Manage product divisions, brands, collections, sizes and colors globally for seamless warehousing filtering."}
            </p>
          </div>

          <div className="flex gap-2">
            <span
              className="bg-orange-50 text-orange-600 text-xs font-black px-3 py-1.5 rounded-xl border border-orange-100"
              style={{ textAlign: "center" }}
            >
              {lang === "ar" ? "6 تصنيفات رئيسية" : "6 Core Metrics"}
            </span>
          </div>
        </div>

        {/* 6 Grid Classifications Layout (Replicating Org Structure format) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Card 1: الأقسام */}
          {(!maximizedBox || maximizedBox === "division") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "division" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("division")}
                      className={maximizedBox === "division" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "division" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "division" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("division")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.division ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.division ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("division")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "الأقسام الرئيسية" : "Divisions"}
                    </h4>
                    <span className="bg-blue-50 text-[#0a1945] text-[11.5px] font-bold px-2 py-0.5 rounded border border-blue-100">
                      {divisions.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.division && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchDivision}
                      onChange={(e) => setSearchDivision(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchDivision && (
                      <button
                        type="button"
                        onClick={() => setSearchDivision("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.division && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredDivisions.map((div) => (
                    <div
                      key={div.id}
                      dir="ltr"
                      className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit("division", div)}
                          className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("division", div.id)}
                          className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-bold text-slate-800">
                          {lang === "ar" ? div.nameAr : div.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {div.id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Card 2: المجموعات */}
          {(!maximizedBox || maximizedBox === "group") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "group" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("group")}
                      className={maximizedBox === "group" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "group" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "group" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("group")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.group ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.group ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("group")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "المجموعات الفرعية" : "Product Groups"}
                    </h4>
                    <span className="bg-purple-50 text-purple-700 text-[11.5px] font-bold px-2 py-0.5 rounded border border-purple-100">
                      {groups.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.group && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchGroup}
                      onChange={(e) => setSearchGroup(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchGroup && (
                      <button
                        type="button"
                        onClick={() => setSearchGroup("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.group && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredGroups.map((grp) => (
                    <div
                      key={grp.id}
                      dir="ltr"
                      className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit("group", grp)}
                          className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("group", grp.id)}
                          className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                        <div className="text-right min-w-0">
                          <p className="font-bold text-slate-800">
                            {lang === "ar" ? grp.nameAr : grp.nameEn}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {grp.id}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full shrink-0",
                            grp.color,
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Card 3: العلامات التجارية */}
          {(!maximizedBox || maximizedBox === "brand") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "brand" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("brand")}
                      className={maximizedBox === "brand" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "brand" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "brand" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("brand")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.brand ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.brand ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("brand")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "العلامات التجارية" : "Brands"}
                    </h4>
                    <span className="bg-amber-50 text-amber-700 text-[11.5px] font-bold px-2 py-0.5 rounded border border-amber-100">
                      {brands.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.brand && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchBrand}
                      onChange={(e) => setSearchBrand(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchBrand && (
                      <button
                        type="button"
                        onClick={() => setSearchBrand("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.brand && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredBrands.map((brd) => (
                    <div
                      key={brd.id}
                      dir="ltr"
                      className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit("brand", brd)}
                          className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("brand", brd.id)}
                          className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-bold text-slate-800">
                          {lang === "ar" ? brd.nameAr : brd.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {lang === "ar"
                            ? `البلد الأصلي: ${brd.country}`
                            : `Origin: ${brd.country}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Card 4: البند */}
          {(!maximizedBox || maximizedBox === "item") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "item" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("item")}
                      className={maximizedBox === "item" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "item" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "item" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("item")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.item ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.item ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("item")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "البند والأصناف" : "Items"}
                    </h4>
                    <span className="bg-emerald-50 text-emerald-750 text-[11.5px] font-bold px-2 py-0.5 rounded border border-emerald-100">
                      {items.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.item && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchItem}
                      onChange={(e) => setSearchItem(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchItem && (
                      <button
                        type="button"
                        onClick={() => setSearchItem("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.item && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredItems.map((item) => {
                    const div = divisions.find((d) => d.id === item.divisionId);
                    const divLabel = div
                      ? lang === "ar"
                        ? div.nameAr
                        : div.nameEn
                      : "";
                    return (
                      <div
                        key={item.id}
                        dir="ltr"
                        className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit("item", item)}
                            className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                            title={lang === "ar" ? "تعديل" : "Edit"}
                          >
                            <Edit2 size={11} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete("item", item.id)}
                            className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                            title={lang === "ar" ? "حذف" : "Delete"}
                          >
                            <Trash2 size={11} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="flex-1 text-right min-w-0">
                          <p className="font-bold text-slate-800">
                            {lang === "ar" ? item.nameAr : item.nameEn}
                          </p>
                          <p className="text-[10px] text-orange-500 font-semibold">
                            {lang === "ar"
                              ? `القسم: ${divLabel}`
                              : `Division: ${divLabel}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Card 5: المقاسات */}
          {(!maximizedBox || maximizedBox === "size") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "size" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("size")}
                      className={maximizedBox === "size" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "size" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "size" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("size")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.size ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.size ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("size")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "المقاسات المتاحة" : "Sizes"}
                    </h4>
                    <span className="bg-rose-50 text-rose-700 text-[11.5px] font-bold px-2 py-0.5 rounded border border-rose-100">
                      {sizes.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.size && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchSize}
                      onChange={(e) => setSearchSize(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchSize && (
                      <button
                        type="button"
                        onClick={() => setSearchSize("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.size && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredSizes.map((sz) => (
                    <div
                      key={sz.id}
                      dir="ltr"
                      className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit("size", sz)}
                          className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("size", sz.id)}
                          className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-bold text-slate-800">
                          {lang === "ar" ? sz.nameAr : sz.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {sz.id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Card 6: الالوان */}
          {(!maximizedBox || maximizedBox === "color") && (
            <div
              className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all ${maximizedBox === "color" ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCatMaximize("color")}
                      className={maximizedBox === "color" ? catCircleBtnFill : catCircleBtnOutline}
                      title={maximizedBox === "color" ? (lang === "ar" ? "تصغير" : "Minimize") : (lang === "ar" ? "تكبير" : "Maximize")}
                    >
                      {maximizedBox === "color" ? (
                        <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatData("color")}
                      className={catCircleBtnFill}
                      title={catDataCollapsed.color ? (lang === "ar" ? "عرض البيانات" : "Show data") : (lang === "ar" ? "إخفاء البيانات" : "Hide data")}
                    >
                      {catDataCollapsed.color ? (
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("color")}
                      className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.8px] font-black text-slate-700">
                      {lang === "ar" ? "الألوان المتوفرة" : "Colors"}
                    </h4>
                    <span className="bg-indigo-50 text-indigo-700 text-[11.5px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                      {colors.length}
                    </span>
                  </div>
                </div>

                {catSearchOpen.color && (
                <div className="pt-2">
                  <div className="relative w-full" dir="ltr">
                    <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                    <input
                      type="text"
                      value={searchColor}
                      onChange={(e) => setSearchColor(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "البحث والتصفية..."
                          : "Search and filter..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                      autoFocus
                    />
                    {searchColor && (
                      <button
                        type="button"
                        onClick={() => setSearchColor("")}
                        className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                )}

                {!catDataCollapsed.color && (
                <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                  {filteredColors.map((clr) => (
                    <div
                      key={clr.id}
                      dir="ltr"
                      className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit("color", clr)}
                          className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("color", clr.id)}
                          className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                          title={lang === "ar" ? "حذف" : "Delete"}
                        >
                          <Trash2 size={11} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                        <div className="text-right min-w-0">
                          <p className="font-bold text-slate-800">
                            {lang === "ar" ? clr.nameAr : clr.nameEn}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {clr.hex}
                          </p>
                        </div>
                        <span
                          className="w-4 h-4 rounded-md border border-slate-200 shadow-xs shrink-0"
                          style={{ backgroundColor: clr.hex }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP OVERLAY MODAL - Styled identically to Employees Org Hierarchy Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-200">
            {/* Modal Header */}
            <div
              className="bg-orange-500 text-white px-5 flex items-center gap-2"
              style={{ height: "56px", direction: lang === "ar" ? "rtl" : "ltr" }}
            >
              <div className="flex flex-1 items-center gap-2 justify-start">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  {(() => {
                    const isEdit = !!editingId;
                    if (activeModal === "division") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات القسم"
                          : "Edit Division Details"
                        : lang === "ar"
                          ? "إضافة قسم جديد"
                          : "Add New Division";
                    }
                    if (activeModal === "group") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات المجموعة"
                          : "Edit Group Details"
                        : lang === "ar"
                          ? "إضافة مجموعة جديدة"
                          : "Add New Group";
                    }
                    if (activeModal === "brand") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات العلامة التجارية"
                          : "Edit Brand Details"
                        : lang === "ar"
                          ? "إضافة علامة تجارية جديدة"
                          : "Add New Brand";
                    }
                    if (activeModal === "item") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات البند"
                          : "Edit Item Details"
                        : lang === "ar"
                          ? "إضافة بند جديد"
                          : "Add New Item";
                    }
                    if (activeModal === "size") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات المقاس"
                          : "Edit Size Details"
                        : lang === "ar"
                          ? "إضافة مقاس جديد"
                          : "Add New Size";
                    }
                    if (activeModal === "color") {
                      return isEdit
                        ? lang === "ar"
                          ? "تعديل بيانات اللون"
                          : "Edit Color Details"
                        : lang === "ar"
                          ? "إضافة لون جديد"
                          : "Add New Color";
                    }
                    return "";
                  })()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              onSubmit={handleSaveItem}
              className="p-6 space-y-4 text-right"
            >
              {/* Generic Name Input */}
              <div className="space-y-1" style={{ height: "66px" }}>
                <label className="text-xs font-bold text-slate-500 block text-right">
                  {lang === "ar"
                    ? "الاسم بالكامل"
                    : "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    lang === "ar"
                      ? "مثال: ملابس أطفال قطنية"
                      : "e.g. Kids cotton apparel"
                  }
                  value={modalNameAr}
                  onChange={(e) => {
                    setModalNameAr(e.target.value);
                    setModalNameEn(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition text-right"
                />
              </div>

              {/* Specific Field for Group: Color Dot selection */}
              {activeModal === "group" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block text-right">
                    {lang === "ar"
                      ? "اللون المميز للمجموعة"
                      : "Assigned Collection Dot Color"}
                  </label>
                  <div className="flex gap-2 justify-end">
                    {[
                      { value: "bg-rose-500", name: "Rose" },
                      { value: "bg-amber-500", name: "Amber" },
                      { value: "bg-emerald-500", name: "Emerald" },
                      { value: "bg-blue-500", name: "Blue" },
                      { value: "bg-purple-500", name: "Purple" },
                      { value: "bg-indigo-500", name: "Indigo" },
                      { value: "bg-slate-400", name: "Gray" },
                    ].map((colorDot) => (
                      <button
                        key={colorDot.value}
                        type="button"
                        onClick={() => setSelectedColor(colorDot.value)}
                        className={cn(
                          "w-6 h-6 rounded-lg border transition cursor-pointer relative flex items-center justify-center",
                          colorDot.value,
                          selectedColor === colorDot.value
                            ? "border-slate-800 scale-110"
                            : "border-transparent",
                        )}
                      >
                        {selectedColor === colorDot.value && (
                          <Check size={11} className="text-white font-black" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specific Field for Brand: Country of Origin */}
              {activeModal === "brand" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block text-right">
                    {lang === "ar" ? "البلد المنشأ" : "Country of Origin"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Germany, USA, Egypt"
                    value={brandCountry}
                    onChange={(e) => setBrandCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition text-right"
                  />
                </div>
              )}

              {/* Specific Field for Item: Link to Division */}
              {activeModal === "item" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block text-right">
                    {lang === "ar"
                      ? "القسم التابع له البند"
                      : "Associated Apparel Division"}
                  </label>
                  <select
                    value={itemDivisionId}
                    onChange={(e) => setItemDivisionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition text-right"
                  >
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>
                        {lang === "ar" ? div.nameAr : div.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specific Field for Color: Hex Palette picker */}
              {activeModal === "color" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block text-right">
                    {lang === "ar" ? "اختر درجة اللون" : "Assign HEX Color"}
                  </label>
                  <div className="flex gap-3 items-center justify-end">
                    <input
                      type="text"
                      placeholder="#000000"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center uppercase"
                    />
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {lang === "ar" ? "حفظ البيانات" : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
