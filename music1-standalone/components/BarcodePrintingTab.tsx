import React, { useState, useMemo } from "react";
import {
  Printer,
  Search,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Barcode,
  Tag,
  FileText,
  Percent,
  Maximize2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface BarcodePrintingTabProps {
  lang: "ar" | "en";
  products: any[];
  selectedBranches: string[];
}

export function BarcodePrintingTab({
  lang,
  products,
  selectedBranches,
}: BarcodePrintingTabProps) {
  const [selectedSize, setSelectedSize] = useState("38x25");
  const [searchQuery, setSearchQuery] = useState("");
  const [printList, setPrintList] = useState<any[]>([]);
  
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const [promoId, setPromoId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  
  const [startRow, setStartRow] = useState(1);
  const [startCol, setStartCol] = useState(1);

  const t = {
    title: lang === "ar" ? "طباعة باركود" : "Print Barcode",
    size: lang === "ar" ? "مقاس الطباعة" : "Barcode Size",
    searchPlaceholder: lang === "ar" ? "بحث بكود أو اسم أو باركود..." : "Search by code, name, or barcode...",
    code: lang === "ar" ? "الكود" : "Code",
    name: lang === "ar" ? "اسم الصنف" : "Item Name",
    stock: lang === "ar" ? "الرصيد" : "Stock",
    printQty: lang === "ar" ? "كمية الطباعة" : "Print Qty",
    actions: lang === "ar" ? "إجراءات" : "Actions",
    print: lang === "ar" ? "طباعة" : "Print",
    printPromo: lang === "ar" ? "طباعة باركود عرض / اوكازيون" : "Print Promo Barcode",
    printInvoice: lang === "ar" ? "طباعة باركود فاتورة" : "Print Invoice Barcode",
    promoModalTitle: lang === "ar" ? "ادخل رقم العرض / الاوكازيون" : "Enter Promotion ID",
    invoiceModalTitle: lang === "ar" ? "ادخل رقم فاتورة الشراء" : "Enter Invoice ID",
    fetch: lang === "ar" ? "استعراض" : "Fetch",
    preview: lang === "ar" ? "معاينة الطباعة" : "Print Preview",
    row: lang === "ar" ? "رقم الصف" : "Row Number",
    col: lang === "ar" ? "رقم العمود" : "Column Number",
    cancel: lang === "ar" ? "إلغاء" : "Cancel",
  };

  const barcodeSizes = [
    { id: "38x25", label: "38mm x 25mm" },
    { id: "50x30", label: "50mm x 30mm" },
    { id: "100x50", label: "100mm x 50mm" },
  ];

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
    ).slice(0, 10);
  }, [searchQuery, products]);

  const addToPrintList = (product: any) => {
    setPrintList((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, printQty: item.printQty + 1 } : item
        );
      }
      return [...prev, { ...product, printQty: product.qty || 1 }];
    });
    setSearchQuery("");
  };

  const removeFromPrintList = (id: string) => {
    setPrintList((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePrintQty = (id: string, qty: number) => {
    setPrintList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, printQty: Math.max(0, qty) } : item))
    );
  };

  const getStockForBranch = (product: any) => {
    if (selectedBranches.includes("all")) return product.qty || 0;
    // Simulate branch stock: if multiple branches selected, sum them up or just return a fraction for demo
    const branchCount = selectedBranches.length;
    const totalQty = product.qty || 0;
    if (branchCount === 1) {
      // Just a deterministic mock: use product id hash or something
      const seed = product.id.charCodeAt(product.id.length - 1);
      return Math.floor((totalQty * (seed % 10 + 1)) / 15);
    }
    return Math.floor(totalQty / 2); // default for multi-branch
  };

  const handleFetchPromo = () => {
    // Mock fetching promo items
    const promoItems = products.slice(0, 3).map(p => ({ ...p, printQty: 10 }));
    setPrintList([...printList, ...promoItems]);
    setIsPromoModalOpen(false);
    setPromoId("");
  };

  const handleFetchInvoice = () => {
    // Mock fetching invoice items
    const invoiceItems = products.slice(2, 5).map(p => ({ ...p, printQty: p.qty || 5 }));
    setPrintList([...printList, ...invoiceItems]);
    setIsInvoiceModalOpen(false);
    setInvoiceId("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center md:bg-white md:p-4 md:rounded-2xl md:border md:border-slate-100 md:shadow-sm gap-4 md:gap-0">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto md:bg-transparent md:p-0 md:rounded-none md:border-none md:shadow-none">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Printer className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t.title}</h2>
            <p className="text-xs text-slate-400">
              {lang === "ar" ? "إدارة وتصميم وطباعة ملصقات الباركود" : "Manage and print barcode labels"}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsPromoModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-blue-50 text-blue-600 rounded-xl md:rounded-[8px] text-xs md:text-[11px] leading-[14px] font-bold hover:bg-blue-100 transition-colors shadow-sm w-full md:w-[216px]"
          >
            <Percent className="w-4 h-4 shrink-0" />
            <span>{t.printPromo}</span>
          </button>
          <button 
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-[8px] text-xs md:text-[11px] leading-[14px] font-bold hover:bg-emerald-100 transition-colors shadow-sm w-full md:w-[216px]"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>{t.printInvoice}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Barcode Size Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Maximize2 className="w-3 h-3" />
                  {t.size}
                </label>
                <div className="relative">
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-colors cursor-pointer"
                  >
                    {barcodeSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Search Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  {lang === "ar" ? "إضافة صنف للقائمة" : "Add item to list"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 transition-colors"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => addToPrintList(p)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left rtl:text-right"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                              {getStockForBranch(p)} {lang === "ar" ? "قطعة" : "pcs"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-slate-400 italic">
                          {lang === "ar" ? "لا توجد نتائج" : "No results found"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Print List Table */}
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">{t.code}</th>
                    <th className="py-3 px-4">{t.name}</th>
                    <th className="py-3 px-4 text-center">{t.stock}</th>
                    <th className="py-3 px-4 text-center">{t.printQty}</th>
                    <th className="py-3 px-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {printList.length > 0 ? (
                    printList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{item.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">{item.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-slate-400 font-mono font-bold">{getStockForBranch(item)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => updatePrintQty(item.id, item.printQty - 1)}
                              className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              value={item.printQty}
                              onChange={(e) => updatePrintQty(item.id, parseInt(e.target.value) || 0)}
                              className="w-12 text-center bg-transparent border-b border-slate-200 outline-none font-bold text-slate-800 text-xs py-0.5"
                            />
                            <button 
                              onClick={() => updatePrintQty(item.id, item.printQty + 1)}
                              className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => removeFromPrintList(item.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <Barcode className="w-8 h-8 opacity-20" />
                          {lang === "ar" ? "القائمة فارغة، أضف أصنافاً للبدء" : "List is empty, add items to start"}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Summary & Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 sticky top-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-4">
              {lang === "ar" ? "ملخص الطباعة" : "Print Summary"}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{lang === "ar" ? "عدد الأصناف:" : "Items Count:"}</span>
                <span className="font-bold text-slate-700">{printList.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{lang === "ar" ? "إجمالي الملصقات:" : "Total Labels:"}</span>
                <span className="font-bold text-orange-600 text-sm">
                  {printList.reduce((acc, curr) => acc + curr.printQty, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{lang === "ar" ? "المقاس المحدد:" : "Selected Size:"}</span>
                <span className="font-bold text-slate-700">{barcodeSizes.find(s => s.id === selectedSize)?.label}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPreviewModalOpen(true)}
              disabled={printList.length === 0}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Promotion Modal */}
      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPromoModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-blue-500" />
                    {t.promoModalTitle}
                  </h3>
                  <button onClick={() => setIsPromoModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={promoId}
                    onChange={(e) => setPromoId(e.target.value)}
                    placeholder="#PROM-2026-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleFetchPromo}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all"
                  >
                    {t.fetch}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInvoiceModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    {t.invoiceModalTitle}
                  </h3>
                  <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    placeholder="#PINV-1001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleFetchInvoice}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition-all"
                  >
                    {t.fetch}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Printer className="w-6 h-6 text-orange-500" />
                  <h3 className="text-xl font-black text-slate-800">{t.preview}</h3>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Controls Sidebar */}
                <div className="w-full lg:w-72 border-r rtl:border-r-0 rtl:border-l border-slate-100 p-6 space-y-6 overflow-y-auto bg-slate-50/30">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">{t.row}</label>
                      <input
                        type="number"
                        min={1}
                        value={startRow}
                        onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-500 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500">{t.col}</label>
                      <input
                        type="number"
                        min={1}
                        value={startCol}
                        onChange={(e) => setStartCol(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                      <p className="text-[10px] text-orange-600 font-bold mb-1 uppercase tracking-wider">
                        {lang === "ar" ? "نصيحة الطباعة" : "Print Tip"}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {lang === "ar" 
                          ? "تأكد من معايرة طابعتك جيداً واختيار مقاس الورق الصحيح في إعدادات نظام التشغيل."
                          : "Ensure your printer is properly calibrated and the correct paper size is selected in system settings."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Sheet Area */}
                <div className="flex-1 bg-slate-200/50 p-8 overflow-y-auto flex justify-center">
                  <div className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-12 relative overflow-hidden">
                     {/* Visual Grid for preview (simulated) */}
                     <div className="grid grid-cols-4 gap-4 opacity-10 absolute inset-0 pointer-events-none">
                        {Array.from({ length: 40 }).map((_, i) => (
                           <div key={i} className="border border-black flex items-center justify-center text-[10px]">
                              {Math.floor(i / 4) + 1} - {(i % 4) + 1}
                           </div>
                        ))}
                     </div>

                     <div className="relative z-10 space-y-8">
                        <div className="text-center space-y-2">
                           <h4 className="text-2xl font-black text-slate-800 tracking-tight">{t.title}</h4>
                           <p className="text-slate-400 font-mono text-sm">Job ID: #PRNT-{Date.now().toString().slice(-6)}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 pt-8">
                           {printList.map((item, idx) => (
                              <div key={idx} className="border-2 border-slate-800 p-4 rounded-lg flex flex-col items-center gap-2 bg-white">
                                 <p className="text-[10px] font-black uppercase text-center">{item.name}</p>
                                 <Barcode className="w-full h-12" />
                                 <p className="text-[10px] font-mono font-bold">{item.code}</p>
                                 <div className="flex justify-between w-full pt-1 border-t border-slate-100">
                                    <span className="text-[10px] font-bold">Qty: {item.printQty}</span>
                                    <span className="text-[10px] font-bold">${item.sellPrice}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50/50">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    alert(lang === "ar" ? "جارٍ الإرسال للطابعة..." : "Sending to printer...");
                    setIsPreviewModalOpen(false);
                  }}
                  className="px-8 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t.print}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
