'use client';

import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/DataTable';

type StageRow = {
  id: string;
  tournament_id: string;
  name: string;
  stage_type: string;
  status: string;
  stage_order: number;
  matchCount: number;
  tournamentName: string;
};

type StagesClientProps = {
  stages: StageRow[];
};

const TYPE_LABEL: Record<string, string> = { group: 'Group', elimination: 'Elim', finals: 'Finals' };
const TYPE_COLOR: Record<string, string> = {
  group: 'var(--accent)',
  elimination: 'var(--amber)',
  finals: 'var(--red)',
};

export default function StagesClient({ stages }: StagesClientProps) {
  const columns = useMemo<ColumnDef<StageRow, unknown>[]>(() => [
    {
      id: 'order',
      header: '#',
      meta: { width: '44px' },
      accessorKey: 'stage_order',
      cell: ({ getValue }) => (
        <span className="text-[12px] font-mono text-[var(--text-muted)] tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Stage',
      meta: { width: '1.4fr' },
      cell: ({ row }) => {
        const s = row.original;
        const color = TYPE_COLOR[s.stage_type] ?? 'var(--text-muted)';
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate group-hover:text-white transition-colors">
              {s.name}
            </span>
          </div>
        );
      },
    },
    {
      id: 'type',
      header: 'Type',
      meta: { width: '90px' },
      accessorKey: 'stage_type',
      cell: ({ getValue }) => {
        const t = getValue() as string;
        const color = TYPE_COLOR[t] ?? 'var(--text-muted)';
        return (
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
            style={{ color, borderColor: color + '40', backgroundColor: color + '10' }}>
            {TYPE_LABEL[t] ?? t}
          </span>
        );
      },
    },
    {
      accessorKey: 'tournamentName',
      header: 'Tournament',
      meta: { width: '1.2fr' },
      cell: ({ getValue }) => (
        <span className="text-[13px] text-[var(--text-muted)] truncate">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'matchCount',
      header: 'Matches',
      meta: { width: '80px' },
      cell: ({ getValue }) => (
        <span className="text-[13px] font-mono tabular-nums text-[var(--text-secondary)]">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '100px' },
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const color = s === 'active' ? 'var(--accent)' : s === 'completed' ? 'var(--text-muted)' : 'var(--amber)';
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
            {s === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 6px rgba(0,255,195,0.5)' }} />
            )}
            {s ?? 'pending'}
          </span>
        );
      },
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={stages}
      pageSize={20}
      getRowHref={(s) => `/tournaments/${s.tournament_id}`}
    />
  );
}
