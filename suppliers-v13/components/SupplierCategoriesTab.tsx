import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Maximize2,
  Minimize2,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "../lib/utils";

interface SupplierCategoriesTabProps {
  lang: "ar" | "en";
}

type CatKey = "type" | "group" | "department";

export function SupplierCategoriesTab({ lang }: SupplierCategoriesTabProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [maximizedBox, setMaximizedBox] = useState<string | null>(null);
  const [catSearchOpen, setCatSearchOpen] = useState<Record<string, boolean>>({});
  const [catDataCollapsed, setCatDataCollapsed] = useState<Record<string, boolean>>({});

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const [types, setTypes] = useState([
    { id: "TYP1", nameAr: "مصنع", nameEn: "Factory" },
    { id: "TYP2", nameAr: "مكتب", nameEn: "Office" },
    { id: "TYP3", nameAr: "مصنع ومكتب", nameEn: "Factory & Office" },
  ]);

  const [groups, setGroups] = useState([
    { id: "GRP1", nameAr: "امانات", nameEn: "Consignment" },
    { id: "GRP2", nameAr: "نقدى", nameEn: "Cash" },
    { id: "GRP3", nameAr: "اجل مرتجعات بمواعيد", nameEn: "Credit with Scheduled Returns" },
    { id: "GRP4", nameAr: "اجل بدون مرتجعات", nameEn: "Credit without Returns" },
  ]);

  const [departments, setDepartments] = useState([
    { id: "DEP1", nameAr: "رجالى", nameEn: "Men" },
    { id: "DEP2", nameAr: "حريمى", nameEn: "Women" },
    { id: "DEP3", nameAr: "اطفال", nameEn: "Kids" },
    { id: "DEP4", nameAr: "احذيه", nameEn: "Shoes" },
    { id: "DEP5", nameAr: "شنط", nameEn: "Bags" },
  ]);

  const [searchType, setSearchType] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchGroup, setSearchGroup] = useState("");

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalNameAr, setModalNameAr] = useState("");
  const [modalNameEn, setModalNameEn] = useState("");

  const filteredTypes = types.filter((t) => {
    const term = searchType.toLowerCase().trim();
    if (!term) return true;
    return t.nameAr.includes(term) || t.nameEn.toLowerCase().includes(term) || t.id.toLowerCase().includes(term);
  });

  const filteredGroups = groups.filter((g) => {
    const term = searchGroup.toLowerCase().trim();
    if (!term) return true;
    return g.nameAr.includes(term) || g.nameEn.toLowerCase().includes(term) || g.id.toLowerCase().includes(term);
  });

  const filteredDepartments = departments.filter((d) => {
    const term = searchDepartment.toLowerCase().trim();
    if (!term) return true;
    return d.nameAr.includes(term) || d.nameEn.toLowerCase().includes(term) || d.id.toLowerCase().includes(term);
  });

  const handleOpenAdd = (box: string) => {
    setActiveModal(box);
    setEditingId(null);
    setModalNameAr("");
    setModalNameEn("");
  };

  const handleOpenEdit = (box: string, item: { id: string; nameAr: string; nameEn: string }) => {
    setActiveModal(box);
    setEditingId(item.id);
    setModalNameAr(item.nameAr);
    setModalNameEn(item.nameEn);
  };

  const handleDelete = (box: string, id: string) => {
    if (confirm(lang === "ar" ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      if (box === "type") setTypes(types.filter((t) => t.id !== id));
      else if (box === "group") setGroups(groups.filter((g) => g.id !== id));
      else setDepartments(departments.filter((d) => d.id !== id));
      triggerToast(lang === "ar" ? "تم الحذف بنجاح" : "Deleted successfully");
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNameAr.trim()) return;

    if (activeModal === "type") {
      if (editingId) {
        setTypes(types.map((t) => (t.id === editingId ? { ...t, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr } : t)));
        triggerToast(lang === "ar" ? "تم التعديل بنجاح" : "Updated successfully");
      } else {
        setTypes([...types, { id: `TYP${types.length + 1}`, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr }]);
        triggerToast(lang === "ar" ? "تم الإضافة بنجاح" : "Added successfully");
      }
    } else if (activeModal === "group") {
      if (editingId) {
        setGroups(groups.map((g) => (g.id === editingId ? { ...g, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr } : g)));
        triggerToast(lang === "ar" ? "تم التعديل بنجاح" : "Updated successfully");
      } else {
        setGroups([...groups, { id: `GRP${groups.length + 1}`, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr }]);
        triggerToast(lang === "ar" ? "تم الإضافة بنجاح" : "Added successfully");
      }
    } else if (activeModal === "department") {
      if (editingId) {
        setDepartments(departments.map((d) => (d.id === editingId ? { ...d, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr } : d)));
        triggerToast(lang === "ar" ? "تم التعديل بنجاح" : "Updated successfully");
      } else {
        setDepartments([...departments, { id: `DEP${departments.length + 1}`, nameAr: modalNameAr, nameEn: modalNameEn || modalNameAr }]);
        triggerToast(lang === "ar" ? "تم الإضافة بنجاح" : "Added successfully");
      }
    }
    setActiveModal(null);
  };

  const cards: Array<{
    key: CatKey;
    titleAr: string;
    titleEn: string;
    count: number;
    countClass: string;
    search: string;
    setSearch: (v: string) => void;
    items: Array<{ id: string; nameAr: string; nameEn: string }>;
  }> = [
    {
      key: "type",
      titleAr: "انواع الموردين",
      titleEn: "Supplier Types",
      count: types.length,
      countClass: "bg-blue-50 text-[#0a1945] border-blue-100",
      search: searchType,
      setSearch: setSearchType,
      items: filteredTypes,
    },
    {
      key: "group",
      titleAr: "مجموعات الموردين",
      titleEn: "Supplier Groups",
      count: groups.length,
      countClass: "bg-blue-50 text-[#0a1945] border-blue-100",
      search: searchGroup,
      setSearch: setSearchGroup,
      items: filteredGroups,
    },
    {
      key: "department",
      titleAr: "أقسام الموردين",
      titleEn: "Supplier Departments",
      count: departments.length,
      countClass: "bg-blue-50 text-[#0a1945] border-blue-100",
      search: searchDepartment,
      setSearch: setSearchDepartment,
      items: filteredDepartments,
    },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-5 left-5 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 animate-bounce flex items-center gap-2 text-xs font-bold font-sans">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div
        className={cn(
          "bg-white border border-[#eaeff2] rounded-3xl p-6 shadow-xs",
          lang === "ar" && "rtl font-[Cairo]",
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#eaeff2] pb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-orange-500 w-5 h-5" />
              <span>{lang === "ar" ? "تصنيفات الموردين" : "Supplier Classifications"}</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {lang === "ar"
                ? "إدارة أنواع ومجموعات الموردين لتسهيل عمليات الشراء والتقارير."
                : "Manage supplier types and groups for streamlined procurement and reporting."}
            </p>
          </div>
          <div className="flex gap-2">
            <span
              className="bg-orange-50 text-orange-600 text-xs font-black px-3 py-1.5 rounded-xl border border-orange-100"
              style={{ textAlign: "center" }}
            >
              {lang === "ar" ? "3 تصنيفات رئيسية" : "3 Core Categories"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {cards.map((card) => {
            if (maximizedBox && maximizedBox !== card.key) return null;
            return (
              <div
                key={card.key}
                className={cn(
                  "bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all",
                  maximizedBox === card.key && "col-span-1 md:col-span-2 lg:col-span-3",
                )}
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-2.5" dir="ltr">
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCatMaximize(card.key)}
                        className={maximizedBox === card.key ? catCircleBtnFill : catCircleBtnOutline}
                        title={
                          maximizedBox === card.key
                            ? lang === "ar"
                              ? "تصغير"
                              : "Minimize"
                            : lang === "ar"
                              ? "تكبير"
                              : "Maximize"
                        }
                      >
                        {maximizedBox === card.key ? (
                          <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCatData(card.key)}
                        className={catCircleBtnFill}
                        title={
                          catDataCollapsed[card.key]
                            ? lang === "ar"
                              ? "عرض البيانات"
                              : "Show data"
                            : lang === "ar"
                              ? "إخفاء البيانات"
                              : "Hide data"
                        }
                      >
                        {catDataCollapsed[card.key] ? (
                          <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.75} />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(card.key)}
                        className="text-[11.5px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Plus size={12} strokeWidth={3} />
                        <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13.8px] font-black text-slate-700">
                        {lang === "ar" ? card.titleAr : card.titleEn}
                      </h4>
                      <span className={cn("text-[11.5px] font-bold px-2 py-0.5 rounded border", card.countClass)}>
                        {card.count}
                      </span>
                    </div>
                  </div>

                  {catSearchOpen[card.key] && (
                    <div className="pt-2">
                      <div className="relative w-full" dir="ltr">
                        <Search className="absolute top-2.5 left-2.5 text-slate-400 pointer-events-none" size={12} />
                        <input
                          type="text"
                          value={card.search}
                          onChange={(e) => card.setSearch(e.target.value)}
                          placeholder={lang === "ar" ? "البحث والتصفية..." : "Search and filter..."}
                          className="w-full h-8 pl-8 pr-3 text-[11.5px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-orange-500 transition-all font-sans text-right"
                          autoFocus
                        />
                        {card.search && (
                          <button
                            type="button"
                            onClick={() => card.setSearch("")}
                            className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!catDataCollapsed[card.key] && (
                    <div className="max-h-[480px] overflow-y-auto space-y-1.5 pt-3">
                      {card.items.map((item) => (
                        <div
                          key={item.id}
                          dir="ltr"
                          className="p-2.5 border border-slate-100 bg-slate-50/60 rounded-xl text-[12.7px] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1 bg-white border border-slate-150 shadow-xs rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(card.key, item)}
                              className="p-1 hover:bg-slate-50 text-sky-600 rounded-lg transition cursor-pointer"
                              title={lang === "ar" ? "تعديل" : "Edit"}
                            >
                              <Edit2 size={11} strokeWidth={3} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(card.key, item.id)}
                              className="p-1 hover:bg-slate-50 text-rose-600 rounded-lg transition cursor-pointer"
                              title={lang === "ar" ? "حذف" : "Delete"}
                            >
                              <Trash2 size={11} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="flex-1 text-right min-w-0">
                            <p className="font-bold text-slate-800">{lang === "ar" ? item.nameAr : item.nameEn}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {item.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-orange-500 text-white flex justify-between items-center">
              <h3 className="font-bold">
                {editingId
                  ? lang === "ar"
                    ? "تعديل التصنيف"
                    : "Edit Category"
                  : lang === "ar"
                    ? "إضافة تصنيف جديد"
                    : "Add New Category"}
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">{lang === "ar" ? "الاسم" : "Name"}</label>
                <input
                  type="text"
                  required
                  value={modalNameAr}
                  onChange={(e) => {
                    setModalNameAr(e.target.value);
                    setModalNameEn(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer">
                  {lang === "ar" ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
