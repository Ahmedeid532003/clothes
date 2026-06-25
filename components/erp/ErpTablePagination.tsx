import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { getVisiblePageNumbers } from '@/components/erp/useTablePagination';

export type ErpTablePaginationProps = {
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

export function ErpTablePagination({
  page,
  pageCount,
  pageSize,
  shown,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  className,
}: ErpTablePaginationProps) {
  const { isRtl } = useLanguage();
  const pages = getVisiblePageNumbers(page, pageCount);
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <footer className={cn('erp-table-footer', className)} aria-label={isRtl ? 'ترقيم الجدول' : 'Table pagination'}>
      <div className="erp-table-footer-summary">
        <span className="erp-table-footer-summary-label">{isRtl ? 'عرض' : 'Showing'}</span>
        <span className="erp-table-footer-badge is-shown">{shown}</span>
        <span className="erp-table-footer-summary-mid">{isRtl ? 'من أصل' : 'of'}</span>
        <span className="erp-table-footer-badge is-total">{total}</span>
      </div>

      <div className="erp-table-pagination" role="navigation" aria-label={isRtl ? 'صفحات الجدول' : 'Table pages'}>
        <button
          type="button"
          className="erp-table-page-btn is-nav"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label={isRtl ? 'الصفحة السابقة' : 'Previous page'}
        >
          <PrevIcon className="h-4 w-4" aria-hidden />
        </button>
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={cn('erp-table-page-btn', pageNumber === page && 'is-active')}
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="erp-table-page-btn is-nav"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label={isRtl ? 'الصفحة التالية' : 'Next page'}
        >
          <NextIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <label className="erp-table-footer-pagesize">
        <span>{isRtl ? 'عرض' : 'Show'}</span>
        <span className="erp-table-footer-select-wrap">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label={isRtl ? 'عدد الصفوف في الصفحة' : 'Rows per page'}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="erp-table-footer-select-icon" aria-hidden />
        </span>
      </label>
    </footer>
  );
}
