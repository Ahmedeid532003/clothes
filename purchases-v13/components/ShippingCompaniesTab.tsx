import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Edit3, Trash2, CheckCircle2, AlertCircle, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportDataButton } from './ui/ExportDataButton';
import { ProductsListContainer } from './ProductsListContainer';

export interface ShippingCompany {
  id: string;
  companyName: string;
  officeNum1: string;
  officeNum2: string;
  repName: string;
  repPhone: string;
}

interface ShippingCompaniesTabProps {
  lang: "ar" | "en";
  shippingCompanies: ShippingCompany[];
  setShippingCompanies: (items: ShippingCompany[]) => void;
}

export function ShippingCompaniesTab({ lang, shippingCompanies, setShippingCompanies }: ShippingCompaniesTabProps) {
  const isAr = lang === "ar";
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [officeNum1, setOfficeNum1] = useState("");
  const [officeNum2, setOfficeNum2] = useState("");
  const [repName, setRepName] = useState("");
  const [repPhone, setRepPhone] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Filters State
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [advCode, setAdvCode] = useState("");
  const [advBarcode, setAdvBarcode] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resetForm = () => {
    setEditingId(null);
    setCompanyName("");
    setOfficeNum1("");
    setOfficeNum2("");
    setRepName("");
    setRepPhone("");
    setIsModalOpen(false);
  };

  const handleEditComposite = (item: any) => {
    setEditingId(item.id);
    setCompanyName(item.companyName);
    setOfficeNum1(item.officeNum1);
    setOfficeNum2(item.officeNum2);
    setRepName(item.repName);
    setRepPhone(item.repPhone);
    setIsModalOpen(true);
  };

  const handleAddComposite = () => {
    if (!companyName) {
      alert(isAr ? "يرجى إدخال اسم الشركة" : "Please enter company name");
      return;
    }
    const newItem: ShippingCompany = {
      id: "SHIP-" + Date.now(),
      companyName,
      officeNum1,
      officeNum2,
      repName,
      repPhone
    };
    setShippingCompanies([...shippingCompanies, newItem]);
    resetForm();
    triggerToast(isAr ? "تم إضافة شركة الشحن بنجاح" : "Shipping company added successfully");
  };

  const handleUpdateComposite = () => {
    if (!companyName) return;
    setShippingCompanies(shippingCompanies.map(item => 
      item.id === editingId 
        ? { ...item, companyName, officeNum1, officeNum2, repName, repPhone }
        : item
    ));
    resetForm();
    triggerToast(isAr ? "تم تحديث شركة الشحن بنجاح" : "Shipping company updated successfully");
  };

  const handleDeleteComposite = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف هذه الشركة؟" : "Are you sure you want to delete this company?")) {
      setShippingCompanies(shippingCompanies.filter(item => item.id !== id));
      triggerToast(isAr ? "تم حذف الشركة بنجاح" : "Company deleted successfully");
    }
  };

  const mappedCompositeItems = useMemo(() => {
    return shippingCompanies.map(item => {
      return {
        ...item,
        nameAr: item.companyName,
        nameEn: item.companyName,
        costPrice: 0,
        sellPrice: 0,
        profitMargin: 0,
        brandId: '',
        groupId: '',
        group: item.repPhone,
        colorId: '',
        sizeId: '',
        promoPrice: null,
        status: 'In Stock',
        barcode: item.officeNum1 || '',
        code: item.officeNum2 || '',
        supplierName: item.repName,
      };
    });
  }, [shippingCompanies, isAr]);

  const filteredMappedItems = useMemo(() => {
    let result = [...mappedCompositeItems];
    if (prodSearchQuery) {
      const q = prodSearchQuery.toLowerCase();
      result = result.filter(item => 
        (item.nameAr && item.nameAr.toLowerCase().includes(q)) ||
        (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q)) ||
        (item.group && item.group.toLowerCase().includes(q))
      );
    }
    return result;
  }, [mappedCompositeItems, prodSearchQuery]);

  return (
    <div className={cn("space-y-6 flex-1", isAr ? "rtl font-[Cairo]" : "ltr")} dir={isAr ? "rtl" : "ltr"}>
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Truck className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "شركات الشحن" : "Shipping Companies"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "اضافه شركات الشحن  وارقام هواتف المندوبين" : "Add shipping companies and representative phone numbers"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="px-3 w-[190px] bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider h-[36px]"
            >
              <Plus size={15} />
              <span className="text-[11px] whitespace-nowrap font-black hidden sm:inline-block">
                {isAr ? "اضافه شركه شحن" : "Add Shipping Company"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ProductsListContainer
          extraToolbarAction={
            <ExportDataButton
              hideText={true}
              lang={lang}
              onToast={triggerToast}
              onCopy={() => triggerToast(isAr ? "تم نسخ البيانات إلى الحافظة" : "Data copied to clipboard!")}
              onPrint={() => triggerToast(isAr ? "تم فتح خيارات الطباعة للجدول" : "Print dialog opened!")}
              className="w-[32px] h-[32px]"
            />
          }
          lang={lang}
          nameFirst={true}
          filteredProducts={filteredMappedItems}
          richProducts={mappedCompositeItems}
          brands={[]}
          groups={[]}
          colors={[]}
          sizes={[]}
          divisions={[]}
          items={[]}
          setViewingProduct={(p) => {
            setViewingItem(p);
            setIsViewModalOpen(true);
          }}
          openEditProductModal={(p) => handleEditComposite(p)}
          handleDeleteProduct={(id) => handleDeleteComposite(id)}
          triggerToast={() => {}}
          prodSearchQuery={prodSearchQuery}
          setProdSearchQuery={setProdSearchQuery}
          isColumnFiltersOpen={isColumnFiltersOpen}
          setIsColumnFiltersOpen={setIsColumnFiltersOpen}
          advCode={advCode}
          setAdvCode={setAdvCode}
          advBarcode={advBarcode}
          setAdvBarcode={setAdvBarcode}
          advBrandId={""} setAdvBrandId={() => {}}
          advGroupId={""} setAdvGroupId={() => {}}
          advColorId={""} setAdvColorId={() => {}}
          advSizeId={""} setAdvSizeId={() => {}}
          advDivisionId={""} setAdvDivisionId={() => {}}
          advItemId={""} setAdvItemId={() => {}}
          advSupplierName={""} setAdvSupplierName={() => {}}
          initialViewMode={window.innerWidth <= 1024 ? "kanban" : "table"}
          customColumnLabels={{
            name: { en: 'Company Name', ar: 'اسم الشركة' },
            barcode: { en: 'Office Number 1', ar: 'رقم المكتب 1' },
            code: { en: 'Office Number 2', ar: 'رقم 2' },
            supplierName: { en: 'Rep Name', ar: 'اسم المندوب' },
            group: { en: 'Rep Phone', ar: 'هاتف المندوب' }
          }}
          defaultVisibleColumns={{
            name: true,
            barcode: true,
            code: true,
            supplierName: true,
            group: true
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 h-[50px] border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                <h3 className="text-xl font-bold">{editingId ? (isAr ? "تعديل بيانات الشركة" : "Edit Shipping Company") : (isAr ? "اضافه شركه شحن جديده" : "Add New Shipping Company")}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-orange-600 p-1.5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <div className="flex flex-col gap-4 w-full">
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "اسم الشركة" : "Company Name"}</label>
                      <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" placeholder={isAr ? "اسم الشركة" : "Company Name"} />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "اسم المندوب" : "Representative Name"}</label>
                      <input type="text" value={repName} onChange={e => setRepName(e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" placeholder={isAr ? "اسم المندوب" : "Rep Name"} />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "هاتف المندوب" : "Representative Phone"}</label>
                      <input type="text" value={repPhone} onChange={e => setRepPhone(e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" placeholder={isAr ? "هاتف المندوب" : "Rep Phone"} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "رقم المكتب 1" : "Office Number 1"}</label>
                      <input type="text" value={officeNum1} onChange={e => setOfficeNum1(e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" placeholder={isAr ? "رقم المكتب 1" : "Office Num 1"} />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "رقم المكتب 2" : "Office Number 2"}</label>
                      <input type="text" value={officeNum2} onChange={e => setOfficeNum2(e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm" placeholder={isAr ? "رقم المكتب 2" : "Office Num 2"} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 bg-slate-50 border-t border-gray-300 flex justify-end items-center gap-3 py-3 w-full">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 text-[12px] h-[32px] font-bold flex items-center justify-center">
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={editingId ? handleUpdateComposite : handleAddComposite} className="px-6 py-2 text-sm font-bold text-white bg-[#FF6900] rounded-lg hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {editingId ? (isAr ? "تحديث" : "Update") : (isAr ? "حفظ" : "Save")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {isViewModalOpen && viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsViewModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col">
              <div className="px-4 h-[50px] border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                <h3 className="text-xl font-bold">{isAr ? "عرض بيانات شركة الشحن" : "View Shipping Company Details"}</h3>
                <button onClick={() => setIsViewModalOpen(false)} className="text-white hover:bg-orange-600 p-1.5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-2xl font-black text-slate-800">{viewingItem?.companyName}</h4>
                      <p className="text-slate-500 font-bold">{viewingItem?.repName} | {viewingItem?.repPhone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-gray-300">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? "رقم المكتب 1" : "Office Number 1"}</span>
                        <span className="text-lg font-black text-slate-700">{viewingItem?.officeNum1}</span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <span className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider">{isAr ? "رقم المكتب 2" : "Office Number 2"}</span>
                        <span className="text-lg font-black text-orange-600">{viewingItem?.officeNum2}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
