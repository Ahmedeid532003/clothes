import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, Edit, Save, X, Search, FileDown, CheckCircle2, Phone, MessageCircle, MapPin, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { SupplierPaymentNotesContainer } from './SupplierPaymentNotesContainer';
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

interface SupplierPaymentNotesTabProps {
  lang: "ar" | "en";
  suppliers: SupplierItem[];
  setSuppliers: (items: SupplierItem[]) => void;
  products: any[];
  groups?: any[];
}

export function SupplierPaymentNotesTab({ lang, suppliers: compositeItems, setSuppliers: setCompositeItems, products, groups = [] }: SupplierPaymentNotesTabProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<SupplierItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [documentType, setDocumentType] = useState("نقدى");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [checks, setChecks] = useState([{ id: Date.now().toString(), checkNo: '', dueDate: '', accountNo: '', checkAmount: '' }]);
  
  const addCheck = () => {
    setChecks([...checks, { id: Date.now().toString(), checkNo: '', dueDate: '', accountNo: '', checkAmount: '' }]);
  };
  
  const removeCheck = (id: string) => {
    if (checks.length > 1) {
      setChecks(checks.filter(c => c.id !== id));
    }
  };
  
  const updateCheck = (id: string, field: string, value: string) => {
    setChecks(checks.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const checksTotal = checks.reduce((sum, c) => sum + (Number(c.checkAmount) || 0), 0);
  
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [isColumnFiltersOpen, setIsColumnFiltersOpen] = useState(false);
  const [advName, setAdvName] = useState("");
  const [advPhone, setAdvPhone] = useState("");
  const [advType, setAdvType] = useState("");
  const [advGroup, setAdvGroup] = useState("");

  const isAr = lang === "ar";

  const mappedCompositeItems = useMemo(() => {
    return (compositeItems || []).map((item, index) => {
      const groupObj = groups.find(g => g.id === item.groupId);
      const groupName = groupObj 
        ? (isAr ? groupObj.nameAr : groupObj.nameEn) 
        : (isAr ? "غير محدد" : "Unassigned");
      
      return {
        ...item,
        group: groupName,
        documentNo: `${123456 + index}`,
        supplierName: item.name,
        documentValue: Math.floor(Math.random() * 5000) + 1000,
        documentDate: new Date().toISOString().split('T')[0],
        documentType: index % 3 === 0 ? 'نقدى' : index % 3 === 1 ? 'شيك' : 'حافظه شيكات',
        user: 'أحمد علي',
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
      if (advType && p.documentType !== advType) return false;
      if (advGroup && p.groupId !== advGroup) return false;
      
      return true;
    });
  }, [mappedCompositeItems, prodSearchQuery, advName, advPhone, advType, advGroup]);


  const handleAddComposite = () => {
    if (!supplierName) {
      alert(isAr ? "يرجى اختيار المورد." : "Please select a supplier.");
      return;
    }
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم حفظ إشعار الخصم بنجاح" : "Discount note saved successfully");
  };

  const handleUpdateComposite = () => {
    if (!supplierName) return;
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم تحديث إشعار الخصم بنجاح" : "Discount note updated successfully");
  };

  const handleDeleteComposite = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      setCompositeItems(compositeItems.filter(item => item.id !== id));
    }
  };

  const handleEditComposite = (item: SupplierItem) => {
    setEditingId(item.id);
    setSupplierName(item.name);
    setDocumentValue("");
    setDocumentType("نقدى");
    setChecks([{ id: Date.now().toString(), checkNo: '', dueDate: '', accountNo: '', checkAmount: '' }]);
    setNotes("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setSupplierName("");
    setDocumentValue("");
    setDocumentType("نقدى");
    setChecks([{ id: Date.now().toString(), checkNo: '', dueDate: '', accountNo: '', checkAmount: '' }]);
    setNotes("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(false);
  };

  return (
    <div className={cn("space-y-6", isAr ? "rtl font-[Cairo]" : "ltr")}>
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Users className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "اذون دفع موردين" : "Supplier Payment Permits"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "انشاء اذون دفع للموردين سواء نقداً او شيكات" : "Create payment notes for suppliers (cash or checks)"}
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
                {isAr ? "إضافة إذن دفع جديد" : "Add New"}
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
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {editingId 
                          ? (isAr ? "تعديل إذن دفع مورد" : "Edit Supplier Payment Note")
                          : (isAr ? "إضافة إذن دفع جديد" : "Add New Payment Note")
                        }
                      </h3>
                      <p className="text-[10px] text-orange-50 font-bold uppercase tracking-widest opacity-90">
                        {isAr ? "إدارة أذون دفع الموردين" : "Manage supplier payment notes"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all text-white active:scale-95"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-4 md:p-6 max-h-[60vh] sm:max-h-[72vh] overflow-y-auto space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <SearchableSelect
                      label={isAr ? "المورد" : "Supplier"}
                      placeholder={isAr ? "اختر المورد..." : "Select Supplier..."}
                      options={compositeItems.map(s => s.name)}
                      value={supplierName}
                      onChange={(val) => setSupplierName(val)}
                      isAr={isAr}
                    />

                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "نوع الدفع" : "Payment Type"}</label>
                      <select
                        value={documentType}
                        onChange={e => {
                          const val = e.target.value;
                          setDocumentType(val);
                          if (val === 'حافظه شيكات' && checks.length < 2) {
                            setChecks([...checks, { id: Date.now().toString() + '1', checkNo: '', dueDate: '', accountNo: '', checkAmount: '' }]);
                          }
                        }}
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold"
                      >
                        <option value="نقدى">{isAr ? "نقدى" : "Cash"}</option>
                        <option value="شيك">{isAr ? "شيك" : "Check"}</option>
                        <option value="حافظه شيكات">{isAr ? "حافظه شيكات" : "Check Portfolio"}</option>
                      </select>
                    </div>

                    {documentType === 'نقدى' && (<div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "قيمه الدفع" : "Payment Value"}</label>
                      <input 
                        type="number" 
                        value={documentValue} 
                        onChange={e => setDocumentValue(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                        placeholder="0"
                      />
                    </div>)}

                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "التاريخ" : "Date"}</label>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>
                    
                    
                    {(documentType === 'شيك' || documentType === 'حافظه شيكات') && (
                      <div className="col-span-1 md:col-span-2 space-y-3 mt-2 border-t border-gray-200 pt-4">
                        {checks.slice(0, documentType === 'شيك' ? 1 : undefined).map((check, index) => (
                          <div key={check.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg border border-orange-300">
                            
                            <div className="space-y-1.5 w-full">
                              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "رقم الشيك" : "Check No."}</label>
                              <input type="text" value={check.checkNo} onChange={(e) => updateCheck(check.id, 'checkNo', e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-white transition-all shadow-sm font-bold" />
                            </div>
                            <div className="space-y-1.5 w-full">
                              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "تاريخ الاستحقاق" : "Due Date"}</label>
                              <input type="date" value={check.dueDate} onChange={(e) => updateCheck(check.id, 'dueDate', e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-white transition-all shadow-sm font-bold" />
                            </div>
                            <div className="space-y-1.5 w-full">
                              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "رقم الحساب" : "Account No."}</label>
                              <select value={check.accountNo} onChange={(e) => updateCheck(check.id, 'accountNo', e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-white transition-all shadow-sm font-bold">
                                <option value="">{isAr ? "اختر الحساب..." : "Select Account..."}</option>
                                <option value="222550 حساب بنك مصر">222550 حساب بنك مصر</option>
                                <option value="حساب البنك الاهلى 1">حساب البنك الاهلى 1</option>
                              </select>
                            </div>
                            <div className="space-y-1.5 w-full">
                              <div className="flex justify-between items-center h-[14px]">
                                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "مبلغ الشيك" : "Check Amount"}</label>
                                {(documentType === 'حافظه شيكات' && checks.length > 1) && (
                                  <button onClick={() => removeCheck(check.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded transition-colors -my-1 z-10" title={isAr ? "حذف" : "Delete"}>
                                    <Trash2 size={13} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                              <input type="number" value={check.checkAmount} onChange={(e) => updateCheck(check.id, 'checkAmount', e.target.value)} className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-white transition-all shadow-sm font-bold" />
                            </div>
                          </div>
                        ))}

                        {documentType === 'حافظه شيكات' && (
                          <div className="flex justify-between items-center mt-3 bg-white p-3 rounded-lg border border-gray-200">
                            <button onClick={addCheck} className="flex items-center gap-1.5 text-xs text-white font-extrabold bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95">
                              <Plus size={14} /> {isAr ? "إضافة شيك آخر" : "Add Another Check"}
                            </button>
                            <div className="font-extrabold text-slate-700 flex items-center gap-2">
                              {isAr ? "إجمالي الحافظة:" : "Portfolio Total:"} 
                              <span className="text-orange-600 ml-2 rtl:ml-0 rtl:mr-2 text-xl font-mono bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 shadow-inner">${checksTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
<div className="space-y-1.5 w-full md:col-span-2">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{isAr ? "ملاحظات" : "Notes"}</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="w-full h-[80px] border border-gray-300 rounded-lg py-2 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold resize-none" 
                        placeholder={isAr ? "اكتب ملاحظاتك هنا..." : "Write your notes here..."}
                      />
                    </div>
                  </div>

                </div>

                <div 
                  className="px-6 bg-slate-50 border-t border-black flex justify-end items-center gap-3 py-3 w-full"
                >
                  <button 
                    onClick={resetForm} 
                    className="px-6 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 text-[12px] h-[32px] font-bold flex items-center justify-center"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button 
                    onClick={editingId ? handleUpdateComposite : handleAddComposite} 
                    className="px-8 py-1 rounded-lg text-white bg-orange-500 font-extrabold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 flex items-center justify-center gap-2 text-[12px] h-[32px]"
                  >
                    <Save className="w-4 h-4" />
                    {isAr ? "حفظ" : "Save"}
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
                <div className="px-4 border-b border-[#ff6900] flex items-center justify-between bg-[#ff6900] text-white h-[55px]">
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

        <div className="mt-0">
          <SupplierPaymentNotesContainer
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
            setViewingSupplier={(p) => {
              handleEditComposite(p);
            }}
            openEditSupplierModal={(p) => handleEditComposite(p)}
            handleDeleteSupplier={(id) => handleDeleteComposite(id)}
            triggerToast={() => {}}
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
              documentNo: true,
              supplierName: true,
              documentDate: true,
              documentValue: true,
              documentType: true,
              user: true
            }}
          />
        </div>
      </div>
    </div>
  );
}
