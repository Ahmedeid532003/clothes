import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers2, User, Camera, Image as ImageIcon, Boxes, DollarSign, Percent, Tag, History, Calendar, Shirt, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export function ProductViewModal({ product, lang, onClose, categories=[], brands=[], groups=[], items=[], divisions=[], colors=[], sizes=[] }: any) {
  const [viewingTab, setViewingTab] = useState<"specs" | "movement" | "promotions">("specs");
  
  // Extra states needed for movement tab
  const [movementBranch, setMovementBranch] = useState("all");
  const [movementStartDate, setMovementStartDate] = useState("2026-06-01");
  const [movementEndDate, setMovementEndDate] = useState("2026-06-30");

  const viewingProduct = product;
  const isTransferMode = false;
  const isIssueMode = false;
  const isDestructionMode = false;

  const setViewingProduct = (val: any) => {
     if (val === null) onClose();
  };
  const setNewPromoOfferNo = (val: any) => {};
  const setNewPromoDiscount = (val: any) => {};

  if (!viewingProduct) return null;


              // Dynamic movements builder
              const dynamicMovements = [
                {
                  date: "2026-05-16",
                  docNo: "383838",
                  descAr: "فاتوره مشتريات - هانى محاسب",
                  descEn: "Purchase Invoice - Hany Accountant",
                  inQty: 10,
                  inPrice: Number(((viewingProduct.costPrice || 0) * 0.95).toFixed(2)),
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
                  outPrice: Number(Number(viewingProduct.sellPrice || 0).toFixed(2)),
                  balance: 9,
                  branch: "giza",
                },
                {
                  date: "2026-06-01",
                  docNo: "TRF-4402",
                  descAr: "تحويل مخزني وارد",
                  descEn: "Incoming Stock Transfer",
                  inQty: 5,
                  inPrice: Number(Number(viewingProduct.costPrice || 0).toFixed(2)),
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
                  outPrice: Number(Number(viewingProduct.sellPrice || 0).toFixed(2)),
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
                  prevBuyPrice: (viewingProduct.costPrice || 0) * 1.05,
                  discount: (viewingProduct.sellPrice || 0) * 0.1,
                  currBuyPrice: Number(viewingProduct.costPrice || 0),
                  promoPrice: (viewingProduct.sellPrice || 0) * 0.9,
                },
                {
                  date: "2026-05-01",
                  docNo: "PRM-7712",
                  user: lang === "ar" ? "ليلى حسن" : "Layla Hassan",
                  qty: 100,
                  prevBuyPrice: (viewingProduct.costPrice || 0) * 1.1,
                  discount: (viewingProduct.sellPrice || 0) * 0.15,
                  currBuyPrice: Number(viewingProduct.costPrice || 0),
                  promoPrice: (viewingProduct.sellPrice || 0) * 0.85,
                },
              ];

              return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl w-full max-w-4xl border border-gray-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {/* Header */}
                    <div
                      className="p-5 border-b border-gray-300 flex justify-between items-center rtl:flex-row-reverse"
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
                    <div className="flex bg-slate-100 border-b border-gray-300 p-1 gap-1 rtl:flex-row-reverse">
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
                            <div className="bg-slate-50 p-3 rounded-2xl border border-gray-300 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "سعر الشراء"
                                    : "Purchase Cost"}
                                </span>
                                <span className="text-sm font-black text-slate-800 font-mono block mt-0.5">
                                  ${Number(viewingProduct.costPrice || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <DollarSign size={16} />
                              </div>
                            </div>

                            {/* Card 2: Selling Price */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-gray-300 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar"
                                    ? "سعر البيع"
                                    : "Selling Price"}
                                </span>
                                <span className="text-sm font-black text-[#0a1945] font-mono block mt-0.5">
                                  ${Number(viewingProduct.sellPrice || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Tag size={16} />
                              </div>
                            </div>

                            {/* Card 3: Promo Price */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-gray-300 flex items-center justify-between rtl:flex-row-reverse">
                              <div className="text-right">
                                <span className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "سعر العرض" : "Promo Price"}
                                </span>
                                <span className="text-sm font-black text-rose-600 font-mono block mt-0.5">
                                  {viewingProduct.promoPrice ||
                                  (viewingProduct.promoDetails &&
                                    viewingProduct.promoDetails.length > 0)
                                    ? `$${Number(viewingProduct.promoPrice || viewingProduct.promoDetails?.[0]?.promoSellPrice || 0).toFixed(2)}`
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
                            <div className="bg-slate-50 p-3 rounded-2xl border border-gray-300 flex items-center justify-between rtl:flex-row-reverse">
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
                              <div className="w-[178px] h-[178px] bg-slate-100 border border-gray-300 rounded-2xl flex items-center justify-center text-slate-300 relative overflow-hidden">
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
                                    className="aspect-square bg-slate-50 border border-gray-300 rounded-xl flex items-center justify-center overflow-hidden"
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-slate-800 text-[13px]">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-slate-800 text-[13px]">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-mono font-bold text-emerald-600 text-[13px]">
                                  {(viewingProduct.costPrice || 0) > 0
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
                                <div className="w-full min-h-[50px] bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-start p-2 font-bold text-slate-800 text-xs text-right">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {viewingProduct.season ||
                                    (lang === "ar" ? "محير" : "All seasons")}
                                </div>
                              </div>

                              {/* Brand */}
                              <div className="space-y-1 flex flex-col items-start text-start">
                                <label className="text-slate-400 block text-[10px] font-extrabold">
                                  {lang === "ar" ? "العلامة التجارية" : "Brand"}
                                </label>
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
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
                                <div className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg flex items-center justify-center px-2 font-bold text-slate-800 text-xs">
                                  {items.find(
                                    (i) => i.id === viewingProduct.itemId,
                                  )?.[lang === "ar" ? "nameAr" : "nameEn"] ||
                                    "General"}
                                </div>
                              </div>

                              {/* Reorder preferences */}
                              <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2.5 rounded-lg border border-gray-300 text-right w-full mt-1">
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
                                    <div className="border border-gray-300 rounded-xl overflow-hidden overflow-x-auto">
                                      <table
                                        className="w-full text-center border-collapse text-xs font-bold text-slate-700"
                                        dir={lang === "ar" ? "rtl" : "ltr"}
                                      >
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-gray-300">
                                            <th className="p-2 border-gray-300">
                                              {lang === "ar"
                                                ? "اللون"
                                                : "Color"}
                                            </th>
                                            <th className="p-2 border-gray-300">
                                              {lang === "ar"
                                                ? "المقاس"
                                                : "Size"}
                                            </th>
                                            <th className="p-2 border-gray-300">
                                              {lang === "ar"
                                                ? "كود الصنف"
                                                : "Code"}
                                            </th>
                                            <th className="p-2 border-gray-300">
                                              {lang === "ar"
                                                ? "الباركود"
                                                : "Barcode"}
                                            </th>
                                            <th className="p-2">
                                              {lang === "ar" ? "الكمية" : "Qty"}
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-300">
                                          {viewingProduct.variants.map(
                                            (v: any, idx: number) => (
                                              <tr
                                                key={idx}
                                                className="hover:bg-slate-50/50"
                                              >
                                                <td className="p-2 border-gray-300">
                                                  {colors.find(
                                                    (c: any) =>
                                                      c.id === v.colorId,
                                                  )?.[
                                                    lang === "ar"
                                                      ? "nameAr"
                                                      : "nameEn"
                                                  ] || "-"}
                                                </td>
                                                <td className="p-2 border-gray-300">
                                                  {sizes.find(
                                                    (s: any) =>
                                                      s.id === v.sizeId,
                                                  )?.[
                                                    lang === "ar"
                                                      ? "nameAr"
                                                      : "nameEn"
                                                  ] || "-"}
                                                </td>
                                                <td className="p-2 border-gray-300 font-mono text-[13px]">
                                                  {v.code || "-"}
                                                </td>
                                                <td className="p-2 border-gray-300 font-mono text-[13px]">
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
                          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-gray-300 w-full lg:h-[90px]">
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
                                  className="h-8 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-500 text-[13px] font-bold font-mono text-slate-700 flex-1 sm:w-auto"
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
                                  className="h-8 px-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-500 text-[13px] font-bold font-mono text-slate-700 flex-1 sm:w-auto"
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
                                className="h-[64px] lg:h-[46px] w-full lg:w-[370px] px-3 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-500 text-xs font-black text-slate-700 text-center"
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
                            <div className="hidden md:block border border-gray-300 rounded-2xl overflow-hidden overflow-x-auto">
                              <table
                                dir={lang === "ar" ? "rtl" : "ltr"}
                                className="w-full text-center border-collapse border border-gray-300 text-xs font-bold text-slate-700"
                              >
                                <thead>
                                  <tr className="bg-slate-100 border-b border-gray-300">
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-28 text-center"
                                    >
                                      {lang === "ar" ? "تاريخ" : "Date"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-28 text-center"
                                    >
                                      {lang === "ar"
                                        ? "رقم المستند"
                                        : "Doc No."}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 text-right pr-4"
                                    >
                                      {lang === "ar" ? "بيان" : "Description"}
                                    </th>
                                    <th
                                      colSpan={2}
                                      className="p-2 border-r border-gray-300 text-center"
                                    >
                                      {lang === "ar" ? "وارد" : "Inward"}
                                    </th>
                                    <th
                                      colSpan={2}
                                      className="p-2 border-r border-gray-300 text-center"
                                    >
                                      {lang === "ar" ? "صادر" : "Outward"}
                                    </th>
                                    <th
                                      rowSpan={2}
                                      className="p-2 border-r border-gray-300 w-24 text-center"
                                    >
                                      {lang === "ar" ? "الرصيد" : "Balance"}
                                    </th>
                                  </tr>
                                  <tr className="bg-slate-50 border-b border-gray-300 text-[10px] text-slate-500 font-extrabold">
                                    {/* Under Inward */}
                                    <th className="p-1 border-r border-gray-300 w-16 text-center">
                                      {lang === "ar" ? "كمية" : "Qty"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 w-16 text-center">
                                      {lang === "ar" ? "سعر" : "Price"}
                                    </th>
                                    {/* Under Outward */}
                                    <th className="p-1 border-r border-gray-300 w-16 text-center">
                                      {lang === "ar" ? "كمية" : "Qty"}
                                    </th>
                                    <th className="p-1 border-r border-gray-300 w-16 text-center">
                                      {lang === "ar" ? "سعر" : "Price"}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
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
                                        className="hover:bg-slate-50 text-slate-700 text-[11px] font-bold border-b border-gray-300"
                                      >
                                        {/* تاريخ */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-slate-600">
                                          {m.date}
                                        </td>

                                        {/* رقم المستند */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center">
                                          <button 
                                            onClick={() => window.open('https://images.unsplash.com/photo-1568283094598-8f813bf69b32?w=800&auto=format&fit=crop', '_blank')}
                                            className="text-orange-500 hover:text-orange-600 hover:underline font-black cursor-pointer transition-colors"
                                          >
                                            {m.docNo}
                                          </button>
                                        </td>

                                        {/* بيان */}
                                        <td className="p-2.5 border-r border-gray-300 text-[13px] text-right pr-4 text-slate-800">
                                          {lang === "ar" ? m.descAr : m.descEn}
                                        </td>

                                        {/* وارد - كمية */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-emerald-600 font-black">
                                          {m.inQty !== null ? m.inQty : ""}
                                        </td>
                                        {/* وارد - سعر */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-emerald-600">
                                          {m.inPrice !== null
                                            ? `$${m.inPrice.toFixed(2)}`
                                            : ""}
                                        </td>

                                        {/* صادر - كمية */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-red-600 font-black">
                                          {m.outQty !== null ? m.outQty : ""}
                                        </td>
                                        {/* صادر - سعر */}
                                        <td className="p-2.5 border-r border-gray-300 font-mono text-[13px] text-center text-red-600">
                                          {m.outPrice !== null
                                            ? `$${m.outPrice.toFixed(2)}`
                                            : ""}
                                        </td>

                                        {/* الرصيد */}
                                        <td className="p-2.5 border-r border-gray-300 bg-slate-50 font-mono text-[13px] text-center text-slate-900">
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
                                <div className="p-6 text-center text-slate-400 bg-slate-50 border border-gray-300 rounded-2xl font-bold">
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
                                          <button 
                                            onClick={() => window.open('https://images.unsplash.com/photo-1568283094598-8f813bf69b32?w=800&auto=format&fit=crop', '_blank')}
                                            className="font-mono text-[13px] text-orange-500 hover:text-orange-600 hover:underline font-black cursor-pointer transition-colors"
                                          >
                                            {m.docNo}
                                          </button>
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
                              <table className="w-full text-center border-collapse border border-gray-300 text-xs font-bold text-slate-700">
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
                                <tbody className="divide-y divide-gray-300">
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
                                        className="hover:bg-orange-50/20 text-slate-700 font-mono text-[13px] font-bold border-b border-gray-300"
                                      >
                                        <td className="p-2.5 border border-gray-300 font-sans">
                                          {p.date}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 text-slate-900 font-sans font-black">
                                          {p.docNo}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 font-sans">
                                          {p.user}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 text-slate-800">
                                          {p.qty}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 text-slate-500">
                                          ${p.prevBuyPrice.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 text-red-600 font-black">
                                          -${p.discount.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 text-emerald-600 font-black">
                                          ${p.currBuyPrice.toFixed(2)}
                                        </td>
                                        <td className="p-2.5 border border-gray-300 bg-orange-50/30 text-orange-600 font-black">
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
                                <div className="p-6 text-center text-slate-400 bg-slate-50 border border-gray-300 rounded-2xl font-bold">
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
                    <div className="p-4 border-t border-gray-300 bg-slate-50 flex justify-end">
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
            
}
