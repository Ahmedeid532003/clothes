import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

function getVisiblePageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: Math.max(total, 1) }, (_, index) => index + 1);
  }
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export type ProductTablePaginationProps = {
  lang: 'ar' | 'en';
  page: number;
  pageCount: number;
  pageSize: number;
  shown: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

/**
 * Product-module pagination bar — matches ERP reference:
 * [Show size] … [pages navy-active] … [عرض N من أصل M] in RTL.
 */
export function ProductTablePagination({
  lang,
  page,
  pageCount,
  pageSize,
  shown,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  className,
}: ProductTablePaginationProps) {
  const isAr = lang === 'ar';
  const pages = getVisiblePageNumbers(page, Math.max(1, pageCount));
  const safePage = Math.min(Math.max(1, page), Math.max(1, pageCount));

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={cn(
        'w-full grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3',
        'bg-white border border-gray-200 rounded-2xl text-xs font-extrabold text-slate-500',
        className,
      )}
      aria-label={isAr ? 'ترقيم الجدول' : 'Table pagination'}
    >
      <div className="flex items-center gap-1.5 justify-self-start flex-wrap font-sans">
        <span>{isAr ? 'عرض' : 'Showing'}</span>
        <span className="inline-grid place-items-center min-w-[28px] h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono font-black text-[12px]">
          {shown}
        </span>
        <span>{isAr ? 'من أصل' : 'of'}</span>
        <span className="inline-grid place-items-center min-w-[28px] h-7 px-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 font-mono font-black text-[12px]">
          {total}
        </span>
      </div>

      <div className="flex items-center gap-1.5 justify-self-center select-none" role="navigation">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="h-9 w-9 inline-grid place-items-center border border-gray-200 rounded-lg bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
        >
          {isAr ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
        </button>

        {pages.map((pageNumber) => {
          const isActive = pageNumber === safePage;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'h-9 min-w-9 px-2 inline-grid place-items-center rounded-lg border font-mono font-black text-xs transition cursor-pointer',
                isActive
                  ? 'bg-[#0a1945] text-white border-[#0a1945] shadow-sm'
                  : 'bg-white text-slate-700 border-gray-200 hover:border-slate-300 hover:text-slate-900',
              )}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
          className="h-9 w-9 inline-grid place-items-center border border-gray-200 rounded-lg bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
        >
          {isAr ? <ChevronLeft size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
        </button>
      </div>

      <label className="flex items-center gap-2 justify-self-end font-sans">
        <span>{isAr ? 'عرض' : 'Show'}</span>
        <span className="relative inline-flex items-center">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={isAr ? 'عدد الصفوف في الصفحة' : 'Rows per page'}
            className="appearance-none h-9 min-w-[52px] pl-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-xs font-black text-slate-800 outline-none cursor-pointer focus:border-slate-300"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute end-2 text-slate-400 pointer-events-none" aria-hidden />
        </span>
      </label>
    </div>
  );
}
