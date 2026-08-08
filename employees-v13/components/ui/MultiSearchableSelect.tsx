import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check, Square, CheckSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MultiSearchableSelectProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  isAr: boolean;
  triggerClassName?: string;
  containerClassName?: string;
}

export function MultiSearchableSelect({ label, placeholder, options, value, onChange, isAr, triggerClassName, containerClassName }: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  const displayText = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return value[0];
    return isAr ? `${value.length} مختارات` : `${value.length} selected`;
  }, [value, placeholder, isAr]);

  return (
    <div className={cn("space-y-1.5 w-full relative", containerClassName)} ref={dropdownRef}>
      <label className="block text-[13px] font-extrabold text-[#0a0a0a] uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn("w-full h-[35px] border border-gray-300 rounded-lg py-1 px-3 text-xs focus:border-orange-500 outline-none bg-slate-50 hover:bg-white transition-all shadow-sm font-bold flex items-center justify-between cursor-pointer", triggerClassName)}
      >
        <span className={cn("truncate", value.length === 0 && "text-slate-400 font-normal")}>
          {displayText}
        </span>
        <div className="flex items-center gap-1">
          {value.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-[110] mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="p-2.5 border-b border-gray-200 bg-slate-100/80 sticky top-0 z-10">
              <div className="relative group">
                <input 
                  type="text" 
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? 'بحث سريع...' : 'Quick search...'}
                  className="w-full bg-white border-2 border-gray-200 rounded-lg py-2 px-9 text-[13px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 font-bold transition-all placeholder:text-slate-400"
                />
                <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                {search && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                    className="absolute top-1/2 -translate-y-1/2 right-3 rtl:left-3 rtl:right-auto text-slate-300 hover:text-orange-500 transition-colors p-0.5 hover:bg-slate-100 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-slate-50/50">
              <button 
                onClick={() => onChange(options)}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
              >
                {isAr ? 'تحديد الكل' : 'Select All'}
              </button>
              <button 
                onClick={() => onChange([])}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-600 transition-colors"
              >
                {isAr ? 'إلغاء التحديد' : 'Clear All'}
              </button>
            </div>
            
            <div className="p-1 max-h-[200px] overflow-auto">
              {filteredOptions.length > 0 ? filteredOptions.map(opt => {
                const isSelected = value.includes(opt);
                return (
                  <div 
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={cn(
                      "px-3 py-2 text-xs font-bold cursor-pointer rounded-lg transition-colors flex items-center gap-2 group",
                      isSelected ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {isSelected ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0 text-slate-300" />}
                    <span className="truncate">{opt}</span>
                  </div>
                );
              }) : (
                <div className="p-4 text-center text-slate-400 text-xs font-bold italic">
                  {isAr ? 'لا توجد نتائج' : 'No results found'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
