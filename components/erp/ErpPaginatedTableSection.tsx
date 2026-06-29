import React from 'react';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { cn } from '@/lib/utils';

type Props<T> = {
  rows: T[];
  children: (pagedRows: T[]) => React.ReactNode;
  className?: string;
  initialPageSize?: number;
  /** When false, skip the employee-style card shell (legacy embeds). */
  unifiedShell?: boolean;
};

export function ErpPaginatedTableSection<T>({
  rows,
  children,
  className,
  initialPageSize = 10,
  unifiedShell = true,
}: Props<T>) {
  const pagination = useTablePagination(rows, initialPageSize);

  if (!unifiedShell) {
    return (
      <div className={className}>
        {children(pagination.pagedRows)}
        <ErpTablePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          shown={pagination.shown}
          total={pagination.total}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    );
  }

  return (
    <div className={cn('emp-data-main-card mahaly-unified-table', className)}>
      <div className="emp-data-table-scroll">{children(pagination.pagedRows)}</div>
      <ErpTablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        shown={pagination.shown}
        total={pagination.total}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}
