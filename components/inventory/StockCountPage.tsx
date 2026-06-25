import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  deleteStockCount,
  fetchStockCounts,
  type StockCountDto,
} from '@/lib/api/inventory';
import { ErpDataTable, type ErpColumn } from '@/components/erp/ErpDataTable';
import { Button } from '@/components/ui/button';
import { StockCountWorkspace } from '@/components/inventory/StockCountWorkspace';
import { fmtMoney } from '@/components/accounting/AccountingUi';

type View = 'list' | 'workspace';

export function StockCountPage() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rows, setRows] = useState<StockCountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchStockCounts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') load();
  }, [view, load]);

  const statusLabel = (s: string) => {
    if (s === 'approved') return t('inventory.statusApproved');
    if (s === 'cancelled') return t('inventory.statusCancelled');
    return t('inventory.statusDraft');
  };

  const openNew = () => {
    setActiveId(null);
    setView('workspace');
  };

  const openRow = (id: string) => {
    setActiveId(id);
    setView('workspace');
  };

  const onDelete = async (row: StockCountDto) => {
    if (row.status !== 'draft') return;
    if (!window.confirm(t('stockCountRecon.deleteConfirm'))) return;
    await deleteStockCount(row.id);
    load();
  };

  const columns: ErpColumn<StockCountDto>[] = [
    {
      key: 'code',
      header: t('inventory.code'),
      render: (r) => <span className="font-mono text-xs font-bold text-violet-800">{r.code}</span>,
      exportValue: (r) => r.code,
      sortable: true,
    },
    {
      key: 'warehouse',
      header: t('inventory.warehouse'),
      render: (r) => r.warehouse_name,
      exportValue: (r) => r.warehouse_name,
    },
    {
      key: 'mode',
      header: t('stockCountRecon.countMode'),
      render: (r) => r.count_mode_label || r.count_mode,
      exportValue: (r) => r.count_mode_label || r.count_mode,
    },
    {
      key: 'scope',
      header: t('stockCountRecon.scope'),
      render: (r) =>
        r.supplier_name ||
        r.supplier_group_name ||
        r.section_name ||
        r.brand_name ||
        '—',
    },
    {
      key: 'items',
      header: t('scanOrders.items'),
      render: (r) => r.line_count ?? r.lines?.length ?? 0,
      align: 'center',
    },
    {
      key: 'variance',
      header: t('stockCountRecon.totalVariance'),
      render: (r) => fmtMoney(r.total_variance_value || '0'),
      align: 'end',
    },
    {
      key: 'status',
      header: t('inventory.status'),
      render: (r) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{statusLabel(r.status)}</span>
      ),
      exportValue: (r) => statusLabel(r.status),
    },
    {
      key: 'date',
      header: t('purchases.date'),
      render: (r) => r.created_at.slice(0, 10),
      exportValue: (r) => r.created_at.slice(0, 10),
      sortable: true,
    },
  ];

  if (view === 'workspace') {
    return (
      <StockCountWorkspace
        countId={activeId}
        onBack={() => {
          setView('list');
          setActiveId(null);
        }}
        onSaved={load}
      />
    );
  }

  return (
    <ErpDataTable
      title={t('stockCountRecon.title')}
      description={t('stockCountRecon.desc')}
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      loading={loading}
      emptyMessage={t('inventory.empty')}
      searchValue={search}
      onSearchChange={setSearch}
      onAdd={openNew}
      addLabel={t('stockCountRecon.newCount')}
      renderRowActions={(row) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openRow(row.id)} title={t('erpTable.view')}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {row.status === 'draft' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openRow(row.id)} title={t('erpTable.edit')}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(row)} title={t('erpTable.delete')}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </>
          )}
        </div>
      )}
    />
  );
}
