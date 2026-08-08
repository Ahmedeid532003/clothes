import React, { useState } from 'react';
import { Search, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  headerCellClassName?: string;
  cellClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface ReusableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T | ((item: T) => string);
  lang?: 'en' | 'ar';
  headerActions?: React.ReactNode;
  rowKey: (item: T) => string | number;
  itemsPerPage?: number;
}

export function ReusableTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchKey,
  lang = 'ar',
  headerActions,
  rowKey,
  itemsPerPage = 10
}: ReusableTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter based on search query if specified
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim() || !searchKey) return data;
    
    return data.filter(item => {
      let val = '';
      if (typeof searchKey === 'function') {
        val = searchKey(item);
      } else {
        val = String(item[searchKey] || '');
      }
      return val.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [data, searchQuery, searchKey]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  return (
    <div className="bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5">
      {/* Top Toolbar */}
      <div className={cn(
        "flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-2",
        lang === 'ar' ? 'md:flex-row-reverse' : ''
      )}>
        {/* Search */}
        {searchKey && (
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full text-xs p-2.5 bg-slate-50 border border-gray-300 rounded-xl outline-none focus:border-orange-400 focus:bg-white transition",
                lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              )}
            />
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4",
              lang === 'ar' ? 'right-3' : 'left-3'
            )} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer",
                  lang === 'ar' ? 'left-3' : 'right-3'
                )}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Custom Actions */}
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto border border-gray-300 rounded-2xl">
        <table className="w-full text-left rtl:text-right text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-gray-300">
            <tr className={cn(lang === 'ar' ? 'text-right' : 'text-left')}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn("py-3 px-4 font-black text-[#0a1945]", col.headerCellClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 text-slate-750 font-sans">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <tr key={rowKey(item)} className="hover:bg-slate-50/40 transition">
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cn("py-3.5 px-4 font-medium", col.cellClassName, lang === 'ar' ? 'text-right' : 'text-left')}
                    >
                      {col.render ? col.render(item, index) : String((item as any)[col.key] || '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                  {lang === 'ar' ? 'لا توجد سجلات مطابقة للبحث' : 'No matching records found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={cn(
          "flex justify-between items-center text-xs text-slate-550 pt-2 border-t border-black",
          lang === 'ar' ? 'flex-row-reverse' : ''
        )}>
          <div>
            <span>
              {lang === 'ar'
                ? `عرض صفحة ${currentPage} من أصل ${totalPages}`
                : `Showing page ${currentPage} of ${totalPages}`}
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 px-2 border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition disabled:opacity-40 disabled:hover:text-inherit disabled:hover:border-gray-300 cursor-pointer"
            >
              {lang === 'ar' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 px-2 border border-gray-300 rounded-lg hover:border-orange-400 hover:text-orange-500 transition disabled:opacity-40 disabled:hover:text-inherit disabled:hover:border-gray-300 cursor-pointer"
            >
              {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
