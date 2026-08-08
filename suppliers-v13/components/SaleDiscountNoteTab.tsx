import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Search, 
  FileDown, 
  CheckCircle2, 
  Phone, 
  MessageCircle, 
  MapPin, 
  User,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SaleDiscountNoteContainer } from './SaleDiscountNoteContainer';
import SaleDiscountNoteCanvas from './SaleDiscountNoteCanvas';
import { motion, AnimatePresence } from 'motion/react';
import { ExportDataButton } from './ui/ExportDataButton';
import { SearchableSelect } from './ui/SearchableSelect';

export interface SupplierItem {
  id: string;
  name: string;
  type: string;
  groupId: string;
  phone: string;
  whatsapp: string;
  inventoryDay: string;
  autoSendInventory: boolean;
  address: string;
  contactPerson: string;
  checkName: string;
  departments: string[];
}

interface SaleDiscountNoteTabProps {
  lang: "ar" | "en";
  suppliers: SupplierItem[];
  setSuppliers: (items: SupplierItem[]) => void;
  products: any[];
  groups?: any[];
}

export function SaleDiscountNoteTab({ lang, suppliers: compositeItems, setSuppliers: setCompositeItems, products, groups = [] }: SaleDiscountNoteTabProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<SupplierItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("كل المواسم ...");
  const [groupId, setGroupId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [inventoryDay, setInventoryDay] = useState("السبت");
  const [autoSendInventory, setAutoSendInventory] = useState(false);
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [fixedDiscountValue, setFixedDiscountValue] = useState("10");
  const [isFixedDiscount, setIsFixedDiscount] = useState(true);
  const [fixedDiscountType, setFixedDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [autoLoadItems, setAutoLoadItems] = useState(true);
  
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [advName, setAdvName] = useState("");
  const [advPhone, setAdvPhone] = useState("");
  const [advType, setAdvType] = useState("");
  const [advGroup, setAdvGroup] = useState("");

  const isAr = lang === "ar";

  const mappedCompositeItems = useMemo(() => {
    return (compositeItems || []).map(item => {
      const groupObj = groups.find(g => g.id === item.groupId);
      const groupName = groupObj 
        ? (isAr ? groupObj.nameAr : groupObj.nameEn) 
        : (isAr ? "غير محدد" : "Unassigned");
      
      return {
        ...item,
        group: groupName
      };
    });
  }, [compositeItems, groups, isAr]);

  const filteredMappedItems = useMemo(() => {
    return mappedCompositeItems.filter((p: any) => {
      const search = prodSearchQuery.toLowerCase().trim();
      if (search) {
        const matchesGlobal =
          p.name.toLowerCase().includes(search) ||
          p.phone.toLowerCase().includes(search) ||
          p.whatsapp.toLowerCase().includes(search);
        if (!matchesGlobal) return false;
      }
      
      if (advName && !p.name.toLowerCase().includes(advName.toLowerCase())) return false;
      if (advPhone && !p.phone.toLowerCase().includes(advPhone.toLowerCase())) return false;
      if (advType && p.type !== advType) return false;
      if (advGroup && p.groupId !== advGroup) return false;
      
      return true;
    });
  }, [mappedCompositeItems, prodSearchQuery, advName, advPhone, advType, advGroup]);


  const handleAddComposite = () => {
    if (!name) {
      alert(isAr ? "يرجى تعبئة اسم المورد." : "Please fill supplier name.");
      return;
    }
    // Open the full-screen canvas as requested
    setIsModalOpen(false);
    setIsCanvasOpen(true);
    triggerToast(isAr ? "تم تنفيذ الخصم بنجاح" : "Discount applied successfully");
  };

  const handleUpdateComposite = () => {
    if (!name) return;
    // Placeholder logic for now
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم تحديث الخصم بنجاح" : "Discount updated successfully");
  };

  const handleDeleteComposite = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      setCompositeItems(compositeItems.filter(item => item.id !== id));
    }
  };

  const handleEditComposite = (item: SupplierItem) => {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type || "كل المواسم ...");
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("كل المواسم ...");
    setGroupId("");
    setPhone("");
    setWhatsapp("");
    setInventoryDay("السبت");
    setAutoSendInventory(false);
    setAddress("");
    setContactPerson("");
    setIsFixedDiscount(true);
    setFixedDiscountType('percentage');
    setFixedDiscountValue("10");
    setIsModalOpen(false);
  };

  return (
    <div className={cn("space-y-6", isAr ? "rtl font-[Cairo]" : "ltr")}>
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Users className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "إشعار خصم أوكازيون" : "Sale Discount Note"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "إدارة إشعار خصم أوكازيون والتعاملات الخاصة بهم" : "Manage sale discount notes"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="px-3 w-[56px] h-[34px] sm:w-[190px] sm:h-[36px] bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Plus size={15} />
              <span className="text-[11px] whitespace-nowrap font-black hidden sm:inline-block">
                {isAr ? "إضافة خصم أوكازيون جديد" : "Create New"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-[20px]">
        {/* Modal Form */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={resetForm}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-300"
              >
                <div className="h-[50px] border-b border-orange-600 flex items-center justify-between bg-[#FF6900] text-white rounded-t-[12px] px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-black tracking-tight leading-tight">
                        {isAr ? "إضافة خصم أوكازيون جديد" : "Add New Sale Discount Note"}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white active:scale-95 group"
                  >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>

                <div className="p-4 md:p-6 max-h-[60vh] sm:max-h-[72vh] overflow-y-auto space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <SearchableSelect 
                      label={isAr ? "اسم المورد" : "Supplier Name"}
                      placeholder={isAr ? "اختر المورد..." : "Select Supplier..."}
                      options={compositeItems.map(s => s.name)}
                      value={name}
                      onChange={setName}
                      isAr={isAr}
                    />

                    <SearchableSelect 
                      label={isAr ? "الموسم" : "Season"}
                      placeholder={isAr ? "اختر الموسم..." : "Select Season..."}
                      options={[
                        "كل المواسم ...",
                        "شتوى 2026",
                        "صيفى 2026",
                        "صيفى 2025",
                        "شتوى 2025",
                        "ربيع 2026",
                        "خريف 2026"
                      ]}
                      value={type}
                      onChange={setType}
                      isAr={isAr}
                    />
                  </div>

                  {/* Auto-load Bar (Moved from Canvas) */}
                  <div className="bg-[#f0f4f8] border border-gray-300 rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    onClick={() => {
                      const newVal = !autoLoadItems;
                      setAutoLoadItems(newVal);
                      if (!newVal) {
                        setIsFixedDiscount(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <div 
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            autoLoadItems ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-400"
                          )}
                        >
                          {autoLoadItems && <Check size={14} strokeWidth={4} />}
                        </div>
                      </div>
                      <span className="text-[13px] font-black text-[#0a1945]">
                        {isAr ? "تحميل كل اصناف المورد للموسم المحدد" : "Auto-load all supplier items for the selected season"}
                      </span>
                    </div>
                  </div>

                  {/* Fixed Discount Bar */}
                  <div className="space-y-4">
                    <div 
                      onClick={() => {
                        if (autoLoadItems) {
                          setIsFixedDiscount(!isFixedDiscount);
                        }
                      }}
                      className={cn(
                        "border border-gray-300 rounded-lg p-3 flex items-center justify-between shadow-sm select-none transition-colors",
                        autoLoadItems ? "bg-slate-50 cursor-pointer hover:bg-slate-100" : "bg-gray-100 opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox"
                            checked={isFixedDiscount}
                            readOnly
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-[1px] border border-gray-300 bg-white checked:border-orange-500 checked:bg-orange-500 transition-all shadow-sm"
                          />
                          <CheckCircle2 className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[13px] font-black text-[#0a1945]">
                          {isAr ? "تطبيق خصم ثابت على كل الأصناف" : "Apply fixed discount to all items"}
                        </span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isFixedDiscount && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="overflow-hidden bg-orange-50/30 border border-orange-100 rounded-xl p-5 shadow-sm"
                        >
                          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-10">
                            {/* Type Selection Column - Two boxes on top of each other */}
                            <div className="flex flex-col gap-2 min-w-[180px]">
                              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                {isAr ? "نوع الخصم" : "Discount Type"}
                              </label>
                              
                              <div 
                                onClick={() => setFixedDiscountType('percentage')}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3 h-[40px] border-2 rounded-lg cursor-pointer transition-all hover:bg-white",
                                  fixedDiscountType === 'percentage' 
                                    ? "border-orange-500 bg-white shadow-sm" 
                                    : "border-gray-200 bg-slate-50/50 hover:border-gray-300"
                                )}
                              >
                                <span className={cn(
                                  "text-[12px] font-bold",
                                  fixedDiscountType === 'percentage' ? "text-orange-600" : "text-slate-600"
                                )}>
                                  {isAr ? "نسبة مئوية (%)" : "Percentage (%)"}
                                </span>
                                <div className={cn(
                                  "w-5 h-5 rounded-[1px] flex items-center justify-center border-2 transition-all",
                                  fixedDiscountType === 'percentage' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white"
                                )}>
                                  {fixedDiscountType === 'percentage' && <Check size={12} strokeWidth={4} />}
                                </div>
                              </div>

                              <div 
                                onClick={() => setFixedDiscountType('amount')}
                                className={cn(
                                  "flex items-center justify-between gap-3 px-3 h-[40px] border-2 rounded-lg cursor-pointer transition-all hover:bg-white",
                                  fixedDiscountType === 'amount' 
                                    ? "border-orange-500 bg-white shadow-sm" 
                                    : "border-gray-200 bg-slate-50/50 hover:border-gray-300"
                                )}
                              >
                                <span className={cn(
                                  "text-[12px] font-bold",
                                  fixedDiscountType === 'amount' ? "text-orange-600" : "text-slate-600"
                                )}>
                                  {isAr ? "مبلغ ثابت" : "Fixed Amount"}
                                </span>
                                <div className={cn(
                                  "w-5 h-5 rounded-[1px] flex items-center justify-center border-2 transition-all",
                                  fixedDiscountType === 'amount' ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white"
                                )}>
                                  {fixedDiscountType === 'amount' && <Check size={12} strokeWidth={4} />}
                                </div>
                              </div>
                            </div>

                            {/* Value Input Column - Separate clearly */}
                            <div className="flex flex-col gap-2 flex-1">
                              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                {isAr ? "قيمة الخصم" : "Discount Value"}
                              </label>
                              <div className="relative group">
                                <input 
                                  type="number"
                                  value={fixedDiscountValue}
                                  onChange={(e) => setFixedDiscountValue(e.target.value)}
                                  placeholder={isAr ? "ادخل القيمة..." : "Enter value..."}
                                  className="w-full h-[40px] border-2 border-gray-300 rounded-lg py-1 px-3 text-[15px] focus:border-orange-500 outline-none bg-white font-normal transition-colors pr-12 rtl:pl-12 rtl:pr-4"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 rtl:left-3 rtl:right-auto bg-slate-100 px-2 py-1 rounded border border-gray-200 text-[#0a1945] font-black text-xs transition-all group-focus-within:border-orange-200 group-focus-within:bg-orange-50">
                                  {fixedDiscountType === 'percentage' ? '%' : (isAr ? 'ج.م' : 'EGP')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div 
                  className="px-6 bg-slate-50 border-t border-black flex justify-end items-center gap-3 py-3 w-full"
                >
                  <button 
                    onClick={resetForm} 
                    className="px-6 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 text-[12px] h-[40px] font-bold flex items-center justify-center"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button 
                    onClick={editingId ? handleUpdateComposite : handleAddComposite} 
                    className="px-10 py-1 rounded-lg text-white bg-orange-500 font-black hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 flex items-center justify-center gap-2 text-[13px] h-[40px] min-w-[160px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isAr ? "تنفيذ الخصم" : "Apply Discount"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {isViewModalOpen && viewingItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsViewModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-300"
              >
                <div className="p-4 border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <h3 className="text-lg font-black">{isAr ? "عرض بيانات المورد" : "View Supplier Details"}</h3>
                  </div>
                  <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-24 h-24 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 text-3xl font-black shrink-0 shadow-inner">
                      {viewingItem.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-2xl font-black text-slate-800">{viewingItem.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded border border-gray-300">
                            {viewingItem.type || '-'}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">
                            {groups.find(g => g.id === viewingItem.groupId)?.nameAr || viewingItem.groupId || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-2">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{isAr ? "الهاتف" : "Phone"}</span>
                            <span className="text-sm font-bold text-slate-700">{viewingItem.phone || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{isAr ? "واتساب" : "WhatsApp"}</span>
                            <span className="text-sm font-bold text-emerald-600">{viewingItem.whatsapp || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{isAr ? "العنوان" : "Address"}</span>
                            <span className="text-sm font-bold text-slate-700">{viewingItem.address || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-slate-300" />
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{isAr ? "المسئول" : "Contact Person"}</span>
                            <span className="text-sm font-bold text-slate-700">{viewingItem.contactPerson || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-300 flex flex-col justify-between">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isAr ? "يوم الجرد" : "Inventory Day"}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-700">{viewingItem.inventoryDay || '-'}</span>
                        {viewingItem.autoSendInventory && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-black rounded">{isAr ? "إرسال آلي" : "Auto"}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-300 md:col-span-2">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isAr ? "اسم الشيكات" : "Check Name"}</span>
                      <span className="text-sm font-black text-slate-700">{viewingItem.checkName || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-300">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{isAr ? "أقسام المورد" : "Supplier Departments"}</span>
                    <div className="flex flex-wrap gap-2">
                      {viewingItem.departments && viewingItem.departments.length > 0 ? (
                        viewingItem.departments.map((dept: string) => (
                          <span key={dept} className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-black rounded-lg border border-orange-200">
                            {dept}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-bold italic">{isAr ? "لم يتم تحديد أقسام" : "No departments specified"}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsViewModalOpen(false)}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-black hover:bg-slate-300 transition-all active:scale-95"
                    >
                      {isAr ? "إغلاق" : "Close"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-6 z-[200] bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="font-bold text-sm">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isCanvasOpen && (
          <SaleDiscountNoteCanvas
            lang={lang}
            products={products}
            supplierName={name}
            season={type}
            autoLoadItems={autoLoadItems}
            onClose={() => setIsCanvasOpen(false)}
            onSave={(items) => {
              console.log("Saving sale discount items:", items);
              // Removed view switching as per user request to make buttons "unlinked from screens"
              triggerToast(isAr ? "تم حفظ الخصم بنجاح" : "Discount saved successfully");
            }}
            onSaveAndPrint={(items) => {
              console.log("Saving and printing sale discount items:", items);
              // Removed view switching as per user request to make buttons "unlinked from screens"
              triggerToast(isAr ? "تم حفظ وطباعة الخصم بنجاح" : "Discount saved and printed successfully");
            }}
          />
        )}

        <div className="mt-0">
          <SaleDiscountNoteContainer
            extraToolbarAction={
              <ExportDataButton
                hideText={true}
                lang={lang}
                onToast={triggerToast}
                onCopy={() =>
                  triggerToast(
                    lang === 'ar'
                      ? "تم نسخ البيانات إلى الحافظة"
                      : "Data copied to clipboard!",
                  )
                }
                onPrint={() =>
                  triggerToast(
                    lang === 'ar'
                      ? "تم فتح خيارات الطباعة للجدول"
                      : "Print dialog opened!",
                  )
                }
                className="w-[32px] h-[32px]"
              />
            }
            lang={lang}
            filteredSuppliers={filteredMappedItems}
            richSuppliers={mappedCompositeItems}
            groups={groups}
            brands={[]}
            colors={[]}
            sizes={[]}
            divisions={[]}
            items={[]}
            setViewingSupplier={setViewingItem}
            openEditSupplierModal={handleEditComposite}
            handleDeleteSupplier={handleDeleteComposite}
            triggerToast={triggerToast}
            prodSearchQuery={prodSearchQuery}
            setProdSearchQuery={setProdSearchQuery}
            isColumnFiltersOpen={isColumnFiltersOpen}
            setIsColumnFiltersOpen={setIsColumnFiltersOpen}
            advName={advName}
            setAdvName={setAdvName}
            advPhone={advPhone}
            setAdvPhone={setAdvPhone}
            advType={advType}
            setAdvType={setAdvType}
            advGroup={advGroup}
            setAdvGroup={setAdvGroup}
            initialViewMode={window.innerWidth < 768 ? "kanban" : "table"}
            defaultVisibleColumns={{
              docNo: true,
              date: true,
              name: true,
              season: true,
              discountValue: true
            }}
          />
        </div>
      </div>
    </div>
  );
}
