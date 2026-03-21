'use client';

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  getRowHref?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  renderSubRow?: (row: Row<TData>) => React.ReactNode;
}

export default function DataTable<TData>({
  columns,
  data,
  pageSize = 25,
  getRowHref,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  type ColMeta = { width?: string };
  const gridTemplateColumns = table
    .getAllColumns()
    .map((col) => (col.columnDef.meta as ColMeta | undefined)?.width ?? '1fr')
    .join(' ');

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  // Collapsed page numbers: show first, last, current ±1, and ellipses
  function getPageNumbers(): (number | '...')[] {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const pages: (number | '...')[] = [];
    const around = new Set([0, pageCount - 1, pageIndex, pageIndex - 1, pageIndex + 1].filter((p) => p >= 0 && p < pageCount));
    let prev = -1;
    for (const p of [...around].sort((a, b) => a - b)) {
      if (prev !== -1 && p - prev > 1) pages.push('...');
      pages.push(p);
      prev = p;
    }
    return pages;
  }

  return (
    <div>
      <div className="data-table">
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} className="data-table-header" style={{ gridTemplateColumns }}>
            {hg.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const sorted = header.column.getIsSorted();
              return (
                <button
                  key={header.id}
                  disabled={!canSort}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`flex items-center gap-1 text-left text-[11px] font-display font-medium uppercase tracking-wider text-[var(--text-muted)] transition-colors ${canSort ? 'hover:text-[var(--text-primary)] cursor-pointer' : 'cursor-default'}`}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {canSort && (
                    <span className="text-[9px] opacity-40 ml-0.5">
                      {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '⇅'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div>
          {table.getRowModel().rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--text-muted)]">No results.</div>
          ) : (
            table.getRowModel().rows.map((row) => {
              const href = getRowHref?.(row.original);

              if (href) {
                return (
                  <a
                    key={row.id}
                    href={href}
                    className="data-table-row group"
                    style={{ gridTemplateColumns }}>
                    {row.getVisibleCells().map((cell) => (
                      <div key={cell.id} className="min-w-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </a>
                );
              }

              return (
                <div
                  key={row.id}
                  className={`data-table-row ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{ gridTemplateColumns }}
                  onClick={() => onRowClick?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-[var(--text-muted)]">
            {pageIndex * pagination.pageSize + 1}–{Math.min((pageIndex + 1) * pagination.pageSize, data.length)}{' '}
            <span className="opacity-50">of {data.length}</span>
          </span>
          <div className="flex items-center gap-0.5">
            <button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-2.5 py-1.5 rounded text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
              ←
            </button>
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-2 text-xs text-[var(--text-muted)] opacity-40">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p)}
                  className={`min-w-[32px] px-2 py-1.5 rounded text-xs transition-colors ${
                    p === pageIndex
                      ? 'bg-[var(--accent)] text-white font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}>
                  {p + 1}
                </button>
              )
            )}
            <button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-2.5 py-1.5 rounded text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
