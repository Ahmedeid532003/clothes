import React, { useId, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  Columns3,
  Copy,
  FileDown,
  FileSpreadsheet,
  FileText,
  Import,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { ErpAddButton } from '@/components/erp/ErpAddButton';
import { ErpSearchBar } from '@/components/erp/ErpSearchBar';
import { ErpTablePagination } from '@/components/erp/ErpTablePagination';
import { useTablePagination } from '@/components/erp/useTablePagination';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export type ErpColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
  align?: 'start' | 'center' | 'end';
  defaultVisible?: boolean;
  searchable?: boolean;
  sortable?: boolean;
};

type SortState = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

type Props<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: ErpColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
  onImport?: () => void;
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  advancedFilters?: React.ReactNode;
  addLabel?: string;
  importLabel?: string;
  bulkActions?: (selectedRows: T[], clearSelection: () => void) => React.ReactNode;
};

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function safeCell(value: React.ReactNode) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function normalizeSortValue(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  const stringValue = String(value ?? '').trim();
  const numericValue = Number(stringValue.replace(/,/g, ''));
  return Number.isFinite(numericValue) && stringValue !== '' ? numericValue : stringValue.toLowerCase();
}

function statusTone(value: React.ReactNode) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (['active', 'completed', 'paid', 'approved', 'success', 'in stock', 'available', 'نشط', 'مكتمل', 'مدفوع', 'معتمد', 'متاح', 'متوفر'].includes(normalized)) {
    return 'success';
  }
  if (['pending', 'draft', 'waiting', 'low stock', 'partial', 'partially paid', 'معلق', 'مسودة', 'بانتظار', 'قيد الانتظار', 'مخزون منخفض', 'جزئي'].includes(normalized)) {
    return 'pending';
  }
  if (['cancelled', 'canceled', 'inactive', 'failed', 'rejected', 'out of stock', 'overdue', 'unpaid', 'غير نشط', 'ملغي', 'مرفوض', 'فشل', 'غير متوفر', 'نفذ المخزون', 'متأخر', 'غير مدفوع'].includes(normalized)) {
    return 'danger';
  }
  if (['processing', 'open', 'in progress', 'reserved', 'on hold', 'جاري', 'مفتوح', 'قيد التنفيذ', 'محجوز', 'مؤجل'].includes(normalized)) {
    return 'info';
  }
  return null;
}

function renderPremiumCell(value: React.ReactNode) {
  const tone = statusTone(value);
  if (!tone) return value;

  return (
    <span className="erp-status-pill" data-tone={tone}>
      {value}
    </span>
  );
}

export function ErpDataTable<T>({
  title,
  description,
  rows,
  columns,
  getRowId,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  searchValue,
  onSearchChange,
  onAdd,
  onImport,
  onRowClick,
  renderRowActions,
  advancedFilters,
  addLabel = 'إضافة جديد',
  importLabel = 'استيراد بيانات',
  bulkActions,
}: Props<T>) {
  const { t, dir, isRtl } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const filtersId = useId();
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false])),
  );
  const [draftVisible, setDraftVisible] = useState<Record<string, boolean>>(visible);

  const visibleColumns = columns.filter((column) => visible[column.key] !== false);
  const selectedRows = rows.filter((row) => selectedIds.has(getRowId(row)));
  const showSelection = Boolean(bulkActions);
  const activeColumnFilters = Object.entries(columnFilters).filter(([, value]) => value.trim());

  const filteredRows = useMemo(() => {
    if (activeColumnFilters.length === 0) return rows;

    return rows.filter((row) =>
      activeColumnFilters.every(([key, value]) => {
        const column = columns.find((item) => item.key === key);
        if (!column) return true;
        const cellValue = column.exportValue ? column.exportValue(row) : safeCell(column.render(row));
        return String(cellValue ?? '').toLowerCase().includes(value.trim().toLowerCase());
      }),
    );
  }, [activeColumnFilters, columns, rows]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aValue = normalizeSortValue(column.exportValue ? column.exportValue(a) : safeCell(column.render(a)));
      const bValue = normalizeSortValue(column.exportValue ? column.exportValue(b) : safeCell(column.render(b)));
      const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sort.direction === 'asc' ? result : -result;
    });
  }, [columns, filteredRows, sort]);

  const {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    shown,
    total,
    pagedRows,
  } = useTablePagination(sortedRows);
  const pagedRowIds = pagedRows.map((row) => getRowId(row));
  const allPageSelected = pagedRowIds.length > 0 && pagedRowIds.every((id) => selectedIds.has(id));
  const tableColumnCount = visibleColumns.length + (renderRowActions ? 1 : 0) + (showSelection ? 1 : 0);

  const clearSelection = () => setSelectedIds(new Set());

  const exportRows = (sourceRows = rows) =>
    sourceRows.map((row) =>
      visibleColumns.map((column) => {
        const value = column.exportValue ? column.exportValue(row) : safeCell(column.render(row));
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
      }),
    );

  const exportCsv = (sourceRows = rows, suffix = '') => {
    const header = visibleColumns.map((column) => `"${column.header}"`).join(',');
    downloadFile(`${title}${suffix}.csv`, [header, ...exportRows(sourceRows).map((r) => r.join(','))].join('\n'), 'text/csv;charset=utf-8');
  };

  const copyVisible = async (sourceRows = rows) => {
    const header = visibleColumns.map((column) => column.header).join('\t');
    const body = exportRows(sourceRows).map((row) => row.map((cell) => cell.replace(/^"|"$/g, '')).join('\t')).join('\n');
    await navigator.clipboard?.writeText([header, body].join('\n'));
  };

  const exportExcel = (sourceRows = rows, suffix = '') => {
    const header = visibleColumns.map((column) => `<th>${column.header}</th>`).join('');
    const body = exportRows(sourceRows)
      .map((row) => `<tr>${row.map((cell) => `<td>${cell.replace(/^"|"$/g, '')}</td>`).join('')}</tr>`)
      .join('');
    downloadFile(`${title}${suffix}.xls`, `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`, 'application/vnd.ms-excel;charset=utf-8');
  };

  const printVisible = (sourceRows = rows) => {
    const html = `
      <html dir="${dir}" lang="${isRtl ? 'ar' : 'en'}">
        <head>
          <title>${title}</title>
          <style>
            body{font-family:Cairo,Arial;color:#111827;padding:24px}
            table{width:100%;border-collapse:collapse}
            th{background:#f8fafc;color:#667085;font-size:12px;text-transform:uppercase}
            th,td{border:1px solid #edf0f5;padding:12px 14px;text-align:start}
          </style>
        </head>
        <body><h2>${title}</h2><table><thead><tr>${visibleColumns.map((c) => `<th>${c.header}</th>`).join('')}</tr></thead><tbody>${exportRows(sourceRows).map((r) => `<tr>${r.map((c) => `<td>${c.replace(/^"|"$/g, '')}</td>`).join('')}</tr>`).join('')}</tbody></table></body>
      </html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
    win?.print();
  };

  const toggleColumnsPopover = () => {
    setDraftVisible(visible);
    setShowColumns((value) => !value);
  };

  const resetColumns = () => {
    setDraftVisible(Object.fromEntries(columns.map((column) => [column.key, true])));
  };

  const cancelColumns = () => {
    setDraftVisible(visible);
    setShowColumns(false);
  };

  const applyColumns = () => {
    setVisible(draftVisible);
    setShowColumns(false);
  };

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const toggleRow = (rowId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pagedRowIds.forEach((id) => {
        if (allPageSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  return (
    <section
      className={cn('erp-table-shell erp-premium-table-card erp-enterprise-grid', isFullscreen && 'erp-grid-fullscreen')}
      dir={dir}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={loading}
    >
      <div className="erp-table-header">
        <div>
          <span className="erp-grid-eyebrow">
            {isRtl ? `${sortedRows.length} سجل` : `${sortedRows.length} records`}
          </span>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <div className="erp-table-primary-actions">
          {onAdd ? (
            <ErpAddButton onClick={onAdd}>{addLabel}</ErpAddButton>
          ) : null}
          {onImport ? (
            <Button size="sm" variant="outline" onClick={onImport}>
              <Import className="h-4 w-4" />
              {importLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="erp-table-toolbar">
        <div className="erp-table-toolbar-primary">
          {onAdd ? (
            <ErpAddButton onClick={onAdd}>{addLabel}</ErpAddButton>
          ) : null}
          {onImport ? (
            <Button size="sm" variant="outline" onClick={onImport}>
              <Import className="h-4 w-4" />
              {importLabel}
            </Button>
          ) : null}
        </div>
        <ErpSearchBar
          value={searchValue}
          onChange={(value) => {
            onSearchChange(value);
            setPage(1);
          }}
          advancedOpen={showFilters}
          onAdvancedToggle={() => setShowFilters((v) => !v)}
        />
        <div className="erp-table-tools">
          <div className="relative">
            <Button size="sm" variant="outline" className="erp-columns-button" onClick={toggleColumnsPopover} aria-expanded={showColumns} aria-label={t('erpTable.columns')}>
              <Columns3 className="h-4 w-4" />
              <span>{t('erpTable.columns')}</span>
            </Button>
            {showColumns ? (
              <div className="erp-columns-popover" role="dialog" aria-label={isRtl ? 'إظهار الأعمدة' : 'Visible columns'}>
                <strong>{isRtl ? 'اختيار الأعمدة' : 'Choose Columns'}</strong>
                {columns.map((column) => (
                  <label key={column.key}>
                    <input
                      type="checkbox"
                      checked={draftVisible[column.key] !== false}
                      onChange={(event) => setDraftVisible((value) => ({ ...value, [column.key]: event.target.checked }))}
                    />
                    <span>{column.header}</span>
                  </label>
                ))}
                <div className="erp-columns-popover-actions">
                  <button type="button" onClick={resetColumns}>{isRtl ? 'إعادة' : 'Reset'}</button>
                  <button type="button" onClick={cancelColumns}>{isRtl ? 'إلغاء' : 'Cancel'}</button>
                  <button type="button" onClick={applyColumns}>{isRtl ? 'تطبيق' : 'Apply'}</button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <Button size="sm" variant="outline" className="erp-export-button" onClick={() => setShowExport((value) => !value)} aria-expanded={showExport}>
              <span>{isRtl ? 'تصدير' : 'Export'}</span>
              <FileDown className="h-4 w-4" />
            </Button>
            {showExport ? (
              <div className="erp-export-popover" role="menu" aria-label={isRtl ? 'تصدير الجدول' : 'Export table'}>
                <button type="button" role="menuitem" onClick={() => { void copyVisible(sortedRows); setShowExport(false); }}>
                  <Copy className="h-4 w-4" />
                  <span>{isRtl ? 'نسخ' : 'Copy'}</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { exportCsv(sortedRows); setShowExport(false); }}>
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { exportExcel(sortedRows, '-excel'); setShowExport(false); }}>
                  <FileDown className="h-4 w-4" />
                  <span>Excel</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { printVisible(sortedRows); setShowExport(false); }}>
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { printVisible(sortedRows); setShowExport(false); }}>
                  <Printer className="h-4 w-4" />
                  <span>{isRtl ? 'طباعة' : 'Print'}</span>
                </button>
              </div>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="erp-fullscreen-button"
            onClick={() => setIsFullscreen((value) => !value)}
            aria-pressed={isFullscreen}
            aria-label={isRtl ? (isFullscreen ? 'إغلاق التكبير' : 'تكبير الجدول') : (isFullscreen ? 'Exit fullscreen table' : 'Fullscreen table')}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span>{isRtl ? (isFullscreen ? 'تصغير' : 'تكبير') : (isFullscreen ? 'Exit' : 'Fullscreen')}</span>
          </Button>
        </div>
      </div>

      {showFilters && advancedFilters ? <div id={filtersId} className="erp-advanced-filters">{advancedFilters}</div> : null}

      {showSelection && selectedRows.length > 0 ? (
        <div className="erp-bulk-actions-bar">
          <div>
            <CheckSquare className="h-4 w-4" />
            <strong>{selectedRows.length}</strong>
            <span>{isRtl ? 'صفوف محددة' : 'rows selected'}</span>
          </div>
          <div className="erp-bulk-actions">
            {bulkActions ? bulkActions(selectedRows, clearSelection) : null}
            <Button size="sm" variant="outline" onClick={() => void copyVisible(selectedRows)}><Copy className="h-4 w-4" />Copy</Button>
            <Button size="sm" variant="outline" onClick={() => exportCsv(selectedRows, '-selected')}><FileSpreadsheet className="h-4 w-4" />Export</Button>
            <Button size="sm" variant="outline" onClick={clearSelection}><X className="h-4 w-4" />Clear</Button>
          </div>
        </div>
      ) : null}

      <div className="erp-table-scroll erp-premium-table-scroll">
        <table className="erp-premium-table" aria-rowcount={sortedRows.length}>
          <caption className="sr-only">{description ? `${title}. ${description}` : title}</caption>
          <thead>
            <tr>
              {renderRowActions ? <th className="erp-actions-cell text-center" scope="col"><Settings className="mx-auto h-4 w-4" /><span className="sr-only">{t('erpTable.actions')}</span></th> : null}
              {showSelection ? (
                <th className="erp-selection-cell" scope="col">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    aria-label={isRtl ? 'تحديد الصفحة' : 'Select page'}
                  />
                </th>
              ) : null}
              {visibleColumns.map((column) => {
                const sortable = column.sortable !== false;
                const sorted = sort?.key === column.key ? sort.direction : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : ''}
                  >
                    <button
                      type="button"
                      className="erp-sort-button"
                      disabled={!sortable}
                      data-sorted={sorted ?? undefined}
                      aria-label={sortable ? `${column.header}: ${isRtl ? 'ترتيب' : 'sort'}` : column.header}
                      onClick={() => sortable && toggleSort(column.key)}
                    >
                      <span>{column.header}</span>
                      {sortable ? (
                        sorted === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : sorted === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
            {showFilters ? (
              <tr className="erp-column-filter-row">
                {renderRowActions ? <th aria-hidden="true" /> : null}
                {showSelection ? <th aria-hidden="true" /> : null}
                {visibleColumns.map((column) => (
                  <th key={`${column.key}-filter`}>
                    <div className="erp-column-filter-input">
                      <Search className="h-3.5 w-3.5" />
                      <input
                        value={columnFilters[column.key] ?? ''}
                        onChange={(event) => {
                          setColumnFilters((value) => ({ ...value, [column.key]: event.target.value }));
                          setPage(1);
                        }}
                        placeholder={`${isRtl ? 'بحث' : 'Search'} ${column.header}`}
                        aria-label={`${isRtl ? 'بحث' : 'Search'} ${column.header}`}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="erp-skeleton-row" aria-hidden="true">
                  {Array.from({ length: tableColumnCount }).map((__, cellIndex) => (
                    <td key={`skeleton-${rowIndex}-${cellIndex}`}>
                      <span
                        className="erp-skeleton-line"
                        style={{ width: `${cellIndex === 0 ? 52 : 44 + ((rowIndex + cellIndex) % 4) * 12}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : pagedRows.length === 0 ? (
              <tr><td colSpan={tableColumnCount} className="erp-table-empty" aria-live="polite">{emptyMessage}</td></tr>
            ) : (
              pagedRows.map((row) => {
                const rowId = getRowId(row);
                const selected = selectedIds.has(rowId);
                return (
                  <tr
                    key={rowId}
                    data-selected={selected ? 'true' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(event) => {
                      if (!onRowClick) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }}
                    className={onRowClick ? 'cursor-pointer' : ''}
                  >
                    {renderRowActions ? <td className="erp-actions-cell text-center" onClick={(event) => event.stopPropagation()}>{renderRowActions(row)}</td> : null}
                    {showSelection ? (
                      <td className="erp-selection-cell" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRow(rowId)}
                          aria-label={isRtl ? `تحديد الصف ${rowId}` : `Select row ${rowId}`}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((column) => {
                      const cellValue = column.render(row);
                      return (
                        <td key={column.key} className={column.align === 'end' ? 'text-end' : column.align === 'center' ? 'text-center' : ''}>
                          {renderPremiumCell(cellValue)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ErpTablePagination
        page={safePage}
        pageCount={pageCount}
        pageSize={pageSize}
        shown={shown}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}
