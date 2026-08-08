import React, { useState, useEffect } from 'react';
import { Package, X, Plus, Trash2, CheckCircle2, Search, ChevronDown, ChevronUp, Camera, ImageIcon, } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';


function SearchableSelect({ value, onChange, options, placeholder, isAr, id, onKeyDown }: any) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (opt: any) => opt.label || (isAr ? opt.nameAr : opt.nameEn) || opt.name || opt.id || opt;
  const getValue = (opt: any) => opt.value || opt.id || opt;

  const filteredOptions = options?.filter((opt: any) =>
    (getLabel(opt) || "").toString().toLowerCase().includes(search.toLowerCase())
  ) || [];

  const foundOption = options?.find((opt: any) => getValue(opt) === value);
  const selectedLabel = foundOption ? getLabel(foundOption) : placeholder;

  return (
    <div ref={wrapperRef} className="relative w-full h-[40px]">
      <div
        id={id}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isOpen) {
             if (onKeyDown) onKeyDown(e);
             else setIsOpen(true);
          } else if (e.key === "Enter" && isOpen) {
             setIsOpen(false);
          }
        }}
        className="w-full h-full border border-gray-300 rounded-[8px] px-2 bg-slate-50 flex justify-between items-center cursor-pointer outline-none focus:border-orange-500 hover:border-[#FF6900] transition-colors"
      >
        <span className={cn("text-[13px] truncate font-bold", !value && "text-gray-400")}>{selectedLabel}</span>
        <div className="flex items-center gap-1">
          {value && (
            <X 
              className="w-3.5 h-3.5 text-red-400 hover:text-red-600 cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            />
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? "بحث..." : "Search..."}
                className="w-full border border-gray-300 rounded px-1.5 h-[34px] text-[13px] outline-none focus:border-[#FF6900]"
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any, idx: number) => {
                  const optVal = opt.value || opt.id || opt;
                  const optLabel = opt.label || (isAr ? opt.nameAr : opt.nameEn) || opt.name || opt.id || opt;
                  return (
                  <div
                    key={optVal || idx}
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "px-3 py-2 text-[13px] cursor-pointer transition-colors hover:bg-orange-50 font-bold truncate",
                      value === optVal ? "bg-orange-50 text-[#FF6900]" : "text-gray-700"
                    )}
                  >
                    {optLabel}
                  </div>
                )})
              ) : (
                <div className="px-3 py-2 text-[12px] text-gray-500 text-center font-bold">
                  {isAr ? "لا توجد نتائج" : "No results"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AddProductModal({ isOpen, onClose, lang, onSave, initialData }: any) {
  const isAr = lang === 'ar';
  
  // State
  const costPriceRef = React.useRef<HTMLInputElement>(null);
  const modelRef = React.useRef<HTMLInputElement>(null);
  const descRef = React.useRef<HTMLTextAreaElement>(null);

  const quantityRef = React.useRef<HTMLInputElement>(null);
  const saveBtnRef = React.useRef<HTMLButtonElement>(null);
  const [formCode, setFormCode] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formAutoBarcode, setFormAutoBarcode] = useState(true);
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formQuantity, setFormQuantity] = useState<number | "">("");
  const [formMainImage, setFormMainImage] = useState<string | null>(null);
  const [formSubImages, setFormSubImages] = useState<(string | null)[]>([null, null, null]);
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
  const [formSeason, setFormSeason] = useState("");
  const [formIsCustomReorder, setFormIsCustomReorder] = useState(false);
  const [formReorderPoint, setFormReorderPoint] = useState(5);
  const [formQty, setFormQty] = useState(0);
  const [formReorderSalePercent, setFormReorderSalePercent] = useState(65);
  const [formIsReorderSaleActive, setFormIsReorderSaleActive] = useState(false);
  const [formHasVariants, setFormHasVariants] = useState(false);
  const [formVariants, setFormVariants] = useState<any[]>([{
    sizeId: "SZ1",
    colorId: "CLR1",
    costPrice: 0,
    sellPrice: 0,
    barcode: "",
    autoBarcode: true,
  }]);
  
  const brands = [{id: "BRD1", nameAr: "براند 1", nameEn: "Brand 1"}];
  const groups = [{id: "GRP1", nameAr: "مجموعة 1", nameEn: "Group 1"}];
  const colors = [{id: "CLR1", nameAr: "أحمر", nameEn: "Red"}];
  const sizes = [{id: "SZ1", nameAr: "صغير", nameEn: "Small"}];
  const divisions = [{id: "DIV1", nameAr: "قسم 1", nameEn: "Division 1"}];
  const items = [{id: "ITM1", nameAr: "بند 1", nameEn: "Item 1"}];
  const globalReorderLimit = 5;

  useEffect(() => {
    if (isOpen) {
      setFormCode(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
      setFormBarcode(`2026${Math.floor(10000000 + Math.random() * 90000000)}`);
      
      if (initialData) {
        if (initialData.brand) {
          const b = brands.find(x => x.nameAr === initialData.brand || x.nameEn === initialData.brand || x.id === initialData.brand || initialData.brand.includes("Brand 1") || initialData.brand.includes("براند 1"));
          if (b) setFormBrandId(b.id);
        }
        if (initialData.group) {
          const g = groups.find(x => x.nameAr === initialData.group || x.nameEn === initialData.group || x.id === initialData.group || initialData.group.includes("Group 1") || initialData.group.includes("مجموعة 1"));
          if (g) setFormGroupId(g.id);
        }
        if (initialData.division) {
          const d = divisions.find(x => x.nameAr === initialData.division || x.nameEn === initialData.division || x.id === initialData.division || initialData.division.includes("Category") || initialData.division.includes("Division"));
          if (d) setFormDivisionId(d.id);
        }
        if (initialData.season) {
          const s = initialData.season.toLowerCase();
          if (s.includes("summer") || s.includes("صيف")) setFormSeason("صيفي");
          else if (s.includes("winter") || s.includes("شتو")) setFormSeason("شتوي");
          else if (s.includes("fall") || s.includes("خريف")) setFormSeason("خريفي");
          else if (s.includes("spring") || s.includes("ربيع")) setFormSeason("ربيعي");
          else setFormSeason(initialData.season);
        }
        if (initialData.supplier) {
          const s = initialData.supplier.toLowerCase();
          if (s.includes("supplier 1") || s.includes("مورد 1")) setFormSupplierName("مورد 1");
          else if (s.includes("supplier 2") || s.includes("مورد 2")) setFormSupplierName("مورد 2");
          else setFormSupplierName(initialData.supplier);
        }
      }

      setFormIsReorderSaleActive(true);
      setFormReorderSalePercent(65);

      setTimeout(() => {
        costPriceRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "F4") {
        e.preventDefault();
        onSave && onSave();
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onSave, onClose]);

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // mock implementation
  };

  const handleSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    // mock implementation
  };
  
  const handleSaveProduct = (e: any) => {
    e.preventDefault();
    const productPayload = {
      id: `P${Math.floor(1000 + Math.random() * 9000)}`,
      code: formCode,
      barcode: formBarcode,
      nameAr: formNameAr || formNameEn,
      nameEn: formNameEn || formNameAr,
      costPrice: formCostPrice,
      sellPrice: formSellPrice,
      quantity: formQuantity || 0,
      mainImage: formMainImage,
      supplierName: formSupplierName,
      profitMargin: formProfitMargin,
      promoPrice: formPromoPrice,
    };
    onSave && onSave(productPayload);
    onClose();
  };

  
  const handleSaveProductForm = (e: any) => {
    e.preventDefault();
    handleSaveProduct(e);
  };
  
  const handleAutoBarcodeChange = (e: any) => {
    setFormAutoBarcode(e.target.checked);
  };

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formVariants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormVariants(newVariants);
  };

  const handleVariantKeyDown = (e: any, index: number, field?: string) => {
    //
  };

  const handleDeleteVariant = (index: number) => {
    const newVariants = [...formVariants];
    newVariants.splice(index, 1);
    setFormVariants(newVariants);
  };

  const handleAddVariantRow = () => {
    setFormVariants([
      ...formVariants,
      {
        sizeId: sizes[0]?.id || "SZ1",
        colorId: colors[0]?.id || "CLR1",
        costPrice: 0,
        sellPrice: 0,
        barcode: "",
        autoBarcode: true,
      },
    ]);
  };

  const editingProduct = "NEW" as any;

  const isTransferMode = false;
  const isIssueMode = false;
  const isDestructionMode = false;
  const isAdditionMode = false;

  return (
    <AnimatePresence>
                {isOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-[95vw] md:max-w-none md:w-[774px] border border-gray-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{ maxWidth: "100%", marginRight: "0px", paddingRight: "0px", paddingLeft: "0px" }}
              >
                {/* Header */}
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
                            ? "انشاء صنف جديد"
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
                    onClick={() => onClose()}
                    className="p-1.5 hover:bg-black/10 text-[#eceff5] rounded-lg transition cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleSaveProductForm}
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
                    {/* Financial Inputs Above Images */}
                    <div className="flex flex-row md:flex-col gap-2 mx-auto md:mx-0 w-full md:w-[180px] mb-3">
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
                          className="bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold text-[14px] px-1 outline-none focus:border-orange-500 text-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ height: "36px", width: "74px" }}
                        />
                      </div>

                      <div className="flex flex-row justify-between items-center gap-2">
                        {/* Offer Price */}
                        <div
                          className="space-y-1 flex flex-col items-center shrink-0"
                          style={{
                            width: "80px",
                            height: "61px",
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
                            className="bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold text-[16px] px-1 outline-none focus:border-orange-500 text-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{
                              height: "42px",
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
                            height: "61px",
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
                            className="bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold text-[16px] px-1 outline-none focus:border-orange-500 text-[#0a1945] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{
                              height: "42px",
                              width: "71.6667px",
                              paddingBottom: "0px",
                              marginBottom: "3px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Main Image */}
                    <label className="aspect-square bg-slate-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-orange-500 hover:text-orange-500 transition cursor-pointer relative overflow-hidden group block mx-auto md:mx-0 w-full md:w-[180px] md:h-[180px] mb-[9px]">
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
                          className="aspect-square bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-slate-300 hover:border-orange-400 hover:text-orange-400 transition cursor-pointer relative overflow-hidden group block"
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

                    
                  </div>

                  <div className="flex-1 flex flex-col gap-4 max-md:order-1 min-w-[280px]">
                    {/* Form Inputs Grid */}
                    <div className="flex flex-wrap lg:flex-nowrap gap-6 content-start justify-end">
                      {/* Combined Inputs Block - 3 columns */}
                      <div
                        className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 shrink-0 w-full md:w-[542.667px]"
                        style={{ marginLeft: "0px", paddingLeft: "0px" }}
                      >
                        {/* Barcode */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-1">
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
                                "w-full h-full border border-gray-300 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[15px] pl-2 pr-7 transition-colors",
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
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-2">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "سعر الشراء" : "Purchase Price"}
                          </label>
                          <input ref={costPriceRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quantityRef.current?.focus(); } }}
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
                            className="w-full h-[34px] bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold text-[14px] px-2 outline-none focus:border-orange-500 text-slate-800"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-3">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "الكمية" : "Quantity"}
                          </label>
                          <input ref={quantityRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); modelRef.current?.focus(); } }}
                            type="number"
                            required
                            min="0"
                            step="1"
                            value={formQuantity || ""}
                            onChange={(e) => {
                              const qty = e.target.value;
                              setFormQuantity(qty === "" ? "" : Number(qty));
                            }}
                            className="w-full h-[34px] bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold text-[14px] px-2 outline-none focus:border-orange-500 text-slate-800"
                          />
                        </div>

                        {/* Code */}
                        <div className="space-y-1 flex flex-col items-start text-start col-span-2 md:col-span-1 max-md:order-5">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "كود الموديل / SKU" : "Style Code"}
                          </label>
                          <input ref={modelRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); descRef.current?.focus(); } }}
                            type="text"
                            required
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-gray-300 rounded-[8px] font-mono text-center font-bold outline-none focus:border-orange-500 text-[14px] px-2"
                            style={{ height: "48px" }}
                          />
                        </div>

                        {/* Name (Both Languages) */}
                        <div className="space-y-1 flex flex-col items-start text-start col-span-2 md:col-span-2 max-md:order-4">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "الوصف" : "Description"}
                          </label>
                          <textarea ref={descRef} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtnRef.current?.focus(); } }}
                            required
                            value={formNameAr}
                            onChange={(e) => {
                              setFormNameAr(e.target.value);
                              setFormNameEn(e.target.value);
                            }}
                            className="w-full bg-slate-50 border border-gray-300 rounded-[8px] text-right font-bold outline-none focus:border-orange-500 text-[11px] px-2 py-2 resize-none"
                            style={{ height: "48px" }}
                          />
                        </div>

                        
                        
                        
                        
                        {/* Supplier Name Dropdown */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-8">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "اسم المورد" : "Supplier Name"}
                          </label>
                          <SearchableSelect
                            value={formSupplierName}
                            onChange={setFormSupplierName}
                            options={[
                              { id: "مورد عام", nameAr: "مورد عام", nameEn: "مورد عام" },
                              { id: "شركة النسيج العربية", nameAr: "شركة النسيج العربية", nameEn: "شركة النسيج العربية" },
                              { id: "محلات المصطفى", nameAr: "محلات المصطفى", nameEn: "محلات المصطفى" },
                              { id: "مؤسسة التوحيد", nameAr: "مؤسسة التوحيد", nameEn: "مؤسسة التوحيد" },
                              { id: "استيراد دولي", nameAr: "استيراد دولي", nameEn: "استيراد دولي" }
                            ]}
                            placeholder={lang === "ar" ? "اختر المورد..." : "Select Supplier..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Division */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-11">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "القسم الرئيسي" : "Division"}
                          </label>
                          <SearchableSelect
                            value={formDivisionId}
                            onChange={setFormDivisionId}
                            options={divisions}
                            placeholder={lang === "ar" ? "اختر القسم..." : "Select Division..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Season */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-9">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "الموسم" : "Season"}
                          </label>
                          <SearchableSelect
                            value={formSeason}
                            onChange={setFormSeason}
                            options={[
                              { id: "صيفي", nameAr: "صيفي", nameEn: "Summer" },
                              { id: "شتوي", nameAr: "شتوي", nameEn: "Winter" },
                              { id: "خريفي", nameAr: "خريفي", nameEn: "Autumn" },
                              { id: "ربيعي", nameAr: "ربيعي", nameEn: "Spring" },
                              { id: "محير (All seasons)", nameAr: "محير (All seasons)", nameEn: "All Seasons" }
                            ]}
                            placeholder={lang === "ar" ? "اختر الموسم..." : "Select Season..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Brand */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-10">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "العلامة التجارية" : "Brand"}
                          </label>
                          <SearchableSelect
                            value={formBrandId}
                            onChange={setFormBrandId}
                            options={brands}
                            placeholder={lang === "ar" ? "اختر العلامة التجارية..." : "Select Brand..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Group */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-12">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "مجموعة الصنف" : "Item Group"}
                          </label>
                          <SearchableSelect
                            value={formGroupId}
                            onChange={setFormGroupId}
                            options={groups}
                            placeholder={lang === "ar" ? "اختر المجموعة..." : "Select Group..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Item category */}
                        <div className="space-y-1 flex flex-col items-start text-start max-md:order-13">
                          <label className="text-slate-500 block">
                            {lang === "ar" ? "البند التابع له" : "Category"}
                          </label>
                          <SearchableSelect
                            value={formItemId}
                            onChange={setFormItemId}
                            options={items}
                            placeholder={lang === "ar" ? "اختر البند..." : "Select Category..."}
                            isAr={lang === "ar"}
                          />
                        </div>

                        {/* Reorder settings */}
                        <div
                          className="bg-slate-50/50 p-2.5 rounded-2xl border border-gray-300 text-right w-full col-span-2 md:col-span-3 max-md:order-14"
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
                                  : "bg-white border-gray-300 hover:border-orange-200",
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
                                      ? "border-gray-300"
                                      : "border-gray-300 text-slate-400 bg-slate-50",
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
                                  : "bg-white border-gray-300 hover:border-orange-200",
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
                                      ? "border-gray-300"
                                      : "border-gray-300 text-slate-400 bg-slate-50",
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
                  <div className="w-full mt-2 bg-slate-50 rounded-xl border border-gray-300 overflow-hidden text-xs font-bold text-slate-700 max-md:order-3">
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
                      <div className="p-4 border-t border-black bg-white space-y-3 overflow-x-auto">
                        <div className="min-w-[600px]">
                          {/* Table Headers */}
                          <div className="grid grid-cols-12 gap-2 text-center text-slate-500 font-extrabold text-[11px] border-b border-gray-300 pb-2 rtl:flex-row-reverse">
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
                                    className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg px-1 font-bold outline-none focus:border-orange-500 text-[11px]"
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
                                    className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg px-1 font-bold outline-none focus:border-orange-500 text-[11px]"
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
                                    className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg text-center font-bold outline-none focus:border-orange-500 font-mono text-[14px]"
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
                                    className="w-full h-8 bg-slate-50 border border-gray-300 rounded-lg text-center font-bold outline-none focus:border-orange-500 font-mono text-[14px]"
                                  />
                                </div>

                                {/* Barcode input with auto checkbox */}
                                <div className="col-span-3 flex items-center gap-1.5 bg-slate-50 border border-gray-300 rounded-lg px-1.5 h-8">
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
                  <div className="flex gap-3 pt-4 border-t border-black max-md:order-4 max-md:mt-6 mt-auto">
                    <button
                      type="button"
                      onClick={onClose}
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
                    <button ref={saveBtnRef} type="submit"
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
        </AnimatePresence>
  );
}
