import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, Edit, Save, X, Search, FileDown, CheckCircle2, Phone, MessageCircle, MapPin, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { SupplierListContainer } from './SupplierListContainer';
import { motion, AnimatePresence } from 'motion/react';
import { ExportDataButton } from './ui/ExportDataButton';
import { SearchableSelect } from './ui/SearchableSelect';
import { SupplierStatementReport } from './SupplierStatementReport';

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
  shortName?: string;
  printShortName?: boolean;
  notes?: string;
  balance?: number;
}

interface SupplierDataTabProps {
  lang: "ar" | "en";
  suppliers: SupplierItem[];
  setSuppliers: (items: SupplierItem[]) => void;
  groups?: any[];
}

export function SupplierDataTab({ lang, suppliers: compositeItems, setSuppliers: setCompositeItems, groups = [] }: SupplierDataTabProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<SupplierItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [statementSupplier, setStatementSupplier] = useState<SupplierItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [groupId, setGroupId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [inventoryDay, setInventoryDay] = useState("السبت");
  const [autoSendInventory, setAutoSendInventory] = useState(false);
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [shortName, setShortName] = useState("");
  const [printShortName, setPrintShortName] = useState(false);
  const [checkName, setCheckName] = useState("");
  const [notes, setNotes] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  
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
    const newItem: SupplierItem = {
      id: "SUP-" + Date.now(),
      name,
      type,
      groupId,
      phone,
      whatsapp,
      inventoryDay,
      autoSendInventory,
      address,
      contactPerson,
      shortName,
      printShortName,
      checkName,
      notes,
      departments
    };
    setCompositeItems([...compositeItems, newItem]);
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تمت إضافة المورد بنجاح" : "Supplier added successfully");
  };

  const handleUpdateComposite = () => {
    if (!name) return;
    setCompositeItems(compositeItems.map(item => 
      item.id === editingId 
        ? { ...item, name, type, groupId, phone, whatsapp, inventoryDay, autoSendInventory, address, contactPerson, shortName, printShortName, checkName, notes, departments }
        : item
    ));
    resetForm();
    setIsModalOpen(false);
    triggerToast(isAr ? "تم تحديث بيانات المورد بنجاح" : "Supplier data updated successfully");
  };

  const handleDeleteComposite = (id: string) => {
    if (confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      setCompositeItems(compositeItems.filter(item => item.id !== id));
    }
  };

  const handleEditComposite = (item: SupplierItem) => {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type || "مكتب");
    setGroupId(item.groupId || "");
    setPhone(item.phone || "");
    setWhatsapp(item.whatsapp || "");
    setInventoryDay(item.inventoryDay || "السبت");
    setAutoSendInventory(item.autoSendInventory || false);
    setAddress(item.address || "");
    setContactPerson(item.contactPerson || "");
    setShortName(item.shortName || "");
    setPrintShortName(item.printShortName || false);
    setCheckName(item.checkName || "");
    setNotes(item.notes || "");
    setDepartments(item.departments || []);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("");
    setGroupId("");
    setPhone("");
    setWhatsapp("");
    setInventoryDay("السبت");
    setAutoSendInventory(false);
    setAddress("");
    setContactPerson("");
    setShortName("");
    setPrintShortName(false);
    setCheckName("");
    setNotes("");
    setDepartments([]);
    setIsModalOpen(false);
  };

  return (
    <div className={cn("space-y-6", isAr ? "rtl font-[Cairo]" : "ltr")}>
      <div className="bg-white shadow-sm border border-gray-300 rounded-[12px] h-[76px] pt-[9px] pb-[9px] px-[10px] my-0 -mx-[8px]">
        <div className="flex items-center justify-between h-full gap-4">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
              <Users className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="truncate">{isAr ? "بيانات الموردين" : "Supplier Data"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {isAr ? "إدارة بيانات الموردين والتعاملات الخاصة بهم" : "Manage supplier data and their transactions"}
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
                {isAr ? "إضافة مورد جديد" : "Create New"}
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
                <div className="h-[50px] border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">
                        {editingId 
                          ? (isAr ? "تعديل بيانات مورد" : "Edit Supplier Data")
                          : (isAr ? "إضافة مورد جديد" : "Add New Supplier")
                        }
                      </h3>
                      <p className="text-[10px] text-orange-50 font-bold uppercase tracking-widest opacity-90">
                        {isAr ? "إدارة بيانات الموردين والجهات الموردة" : "Manage supplier profiles and entities"}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {/* Row 1 */}
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "اسم المورد" : "Supplier Name"}</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                        placeholder={isAr ? "اسم الشركة أو المورد" : "Company or Supplier Name"}
                      />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <SearchableSelect 
                        label={isAr ? "نوع المورد" : "Supplier Type"}
                        placeholder={isAr ? "اختر نوع المورد ..." : "Select supplier type..."}
                        options={["مكتب", "مصنع", "مكتب + مصنع"]}
                        value={type}
                        onChange={setType}
                        isAr={isAr}
                      />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <SearchableSelect 
                        label={isAr ? "مجموعة المورد" : "Supplier Group"}
                        placeholder={isAr ? "اختر مجموعة المورد ..." : "Select group..."}
                        options={["امانات", "نقدى", "اجل و مرتجعات بمواعيد", "اجل بدون مرتجعات"]}
                        value={groupId}
                        onChange={setGroupId}
                        isAr={isAr}
                      />
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "هاتف المورد" : "Supplier Phone"}</label>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                        placeholder="010..."
                      />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "هاتف واتس اب لارسال الجرود" : "WhatsApp for Inventory"}</label>
                      <input 
                        type="text" 
                        value={whatsapp} 
                        onChange={e => setWhatsapp(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                        placeholder="011..."
                      />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "يوم ارسال الجرد" : "Inventory Send Day"}</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={autoSendInventory}
                            onChange={e => setAutoSendInventory(e.target.checked)}
                            className="accent-orange-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-black text-orange-600">{isAr ? "ارسال الجرود آلياً" : "Auto Send"}</span>
                        </label>
                      </div>
                      <select
                        value={inventoryDay}
                        onChange={e => setInventoryDay(e.target.value)}
                        disabled={!autoSendInventory}
                        className={cn(
                          "w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs outline-none transition-all shadow-sm font-bold",
                          autoSendInventory ? "bg-slate-50 focus:bg-white focus:border-orange-500" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        {["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"].map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Row 3 */}
                    <div className="space-y-1.5 w-full md:col-span-2">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "عنوان المورد" : "Supplier Address"}</label>
                      <input 
                        type="text" 
                        value={address} 
                        onChange={e => setAddress(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "الشخص المسئول" : "Contact Person"}</label>
                      <input 
                        type="text" 
                        value={contactPerson} 
                        onChange={e => setContactPerson(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "اسم مختصر للمورد" : "Supplier Short Name"}</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={printShortName}
                            onChange={e => setPrintShortName(e.target.checked)}
                            className="accent-orange-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-black text-orange-600">{isAr ? "طباعه الاسم على الباركود" : "Print on Barcode"}</span>
                        </label>
                      </div>
                      <input 
                        type="text" 
                        value={shortName} 
                        onChange={e => setShortName(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>

                    {/* Row 4 */}
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "الاسم المستخدم لكتابه الشيكات" : "Name for Checks"}</label>
                      <input 
                        type="text" 
                        value={checkName} 
                        onChange={e => setCheckName(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>
                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "ملاحظات" : "Notes"}</label>
                      <input 
                        type="text" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm font-bold" 
                      />
                    </div>

                    <div className="space-y-1.5 w-full">
                      <label className="block text-[11px] font-extrabold text-[#0b0b0b] uppercase tracking-wider">{isAr ? "قسم المورد" : "Supplier Department"}</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["حريمى", "رجالى", "اطفال", "احذيه وشنط"].map(dept => (
                          <label key={dept} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-gray-300 cursor-pointer hover:bg-orange-50 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={departments.includes(dept)}
                              onChange={e => {
                                if (e.target.checked) setDepartments([...departments, dept]);
                                else setDepartments(departments.filter(d => d !== dept));
                              }}
                              className="accent-orange-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600">{dept}</span>
                          </label>
                        ))}
                      </div>
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
                          <span className="text-slate-700 text-[11px] font-bold">
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
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-300">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isAr ? "اسم الشيكات" : "Check Name"}</span>
                      <span className="text-sm font-black text-slate-700">{viewingItem.checkName || '-'}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-300">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isAr ? "ملاحظات" : "Notes"}</span>
                      <span className="text-sm font-black text-slate-700">{viewingItem.notes || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-300">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{isAr ? "أقسام المورد" : "Supplier Departments"}</span>
                    <div className="flex flex-wrap gap-2 text-slate-700 text-sm font-bold">
                      {viewingItem.departments && viewingItem.departments.length > 0 ? (
                        viewingItem.departments.join(' - ')
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
          <SupplierListContainer
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
              setViewingItem(p);
              setIsViewModalOpen(true);
            }}
            onOpenStatement={(p) => setStatementSupplier(p)}
            onAddPayment={(p) => triggerToast(lang === 'ar' ? 'سيتم إضافة شاشة تسجيل الدفعة قريباً' : 'Payment recording screen coming soon')}
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
              name: true,
              phone: true,
              departments: true,
              group: true,
              balance: true,
              type: false,
              whatsapp: false,
              inventoryDay: false,
              address: false,
              contactPerson: false,
              checkName: false
            }}
          />
        </div>

        {/* Statement Report Canvas */}
        <AnimatePresence>
          {statementSupplier && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[150] flex flex-col bg-slate-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#FF6900] p-4 flex justify-between items-center shrink-0 h-[56px] shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStatementSupplier(null)} className="text-white/80 hover:text-white transition-colors cursor-pointer p-2 hover:bg-white/10 rounded-full">
                    <X size={20} />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {isAr ? 'كشف حساب مورد' : 'Supplier Statement Report'}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto bg-slate-50 relative">
                <SupplierStatementReport lang={lang} supplier={statementSupplier} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
