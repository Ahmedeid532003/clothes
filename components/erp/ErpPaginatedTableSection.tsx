import React from 'react';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';

type Props<T> = {
  rows: T[];
  children: (pagedRows: T[]) => React.ReactNode;
  className?: string;
  initialPageSize?: number;
};

export function ErpPaginatedTableSection<T>({
  rows,
  children,
  className,
  initialPageSize = 10,
}: Props<T>) {
  const pagination = useTablePagination(rows, initialPageSize);

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
