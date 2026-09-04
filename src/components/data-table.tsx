"use client"

import { useTable } from "@tanstack/react-table"
import type { ColumnDef } from "@tanstack/react-table"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { cn } from "@/lib/utils"

export type DataTableColumn<TData extends object> = ColumnDef<
  typeof dataGridFeatures,
  TData
>

export interface DataTableProps<TData extends object> {
  /** Column definitions — same shape as any TanStack Table v9 ColumnDef. */
  columns: DataTableColumn<TData>[]
  /** Row data. The component owns no state of its own; pass whatever you have. */
  data: TData[]
  /** Stable row id, e.g. `(row) => row.id`. Falls back to row index when omitted. */
  getRowId?: (row: TData) => string
  isLoading?: boolean
  emptyMessage?: string
  /** Rows per page. Defaults to 10. */
  pageSize?: number
  /** Options shown in the page-size selector. Defaults to [5, 10, 25, 50]. */
  pageSizeOptions?: number[]
  /** Hides the pagination bar entirely, e.g. for a short, fixed-size list. */
  hidePagination?: boolean
  /** Tighter row height. */
  dense?: boolean
  onRowClick?: (row: TData) => void
  className?: string
}

/**
 * Thin, prop-configured wrapper around the ReUI data grid: pass columns and
 * data, get a sorted, paginated table. For anything the props here don't
 * cover (cell selection, column pinning, row DnD, ...), use the ReUI
 * primitives in @/components/reui/data-grid directly — this wrapper only
 * covers the common case.
 */
export function DataTable<TData extends object>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyMessage = "No results.",
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  hidePagination = false,
  dense = false,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      tableLayout={{ dense, rowBorder: true, headerBorder: true }}
    >
      <div className={cn("rounded-lg border", className)}>
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </div>
      {!hidePagination && <DataGridPagination sizes={pageSizeOptions} />}
    </DataGrid>
  )
}
