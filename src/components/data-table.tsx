"use client"

import { useState } from "react"
import { useTable } from "@tanstack/react-table"
import type { ColumnDef, Row } from "@tanstack/react-table"
import { SearchIcon, SlidersHorizontalIcon, ListFilterIcon } from "lucide-react"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  getColumnHeaderLabel,
  type DataGridProps,
} from "@/components/reui/data-grid/data-grid"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/reui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DataTableColumn<TData extends object> = ColumnDef<
  typeof dataGridFeatures,
  TData
>

type DataTableInstance<TData extends object> = ReturnType<
  typeof useTable<typeof dataGridFeatures, TData>
>

/** Substring match against the cell's stringified value — works for any column with no setup. */
function containsFilterFn<TData extends object>(
  row: Row<typeof dataGridFeatures, TData>,
  columnId: string,
  filterValue: unknown
) {
  const value = row.getValue(columnId)
  return String(value ?? "")
    .toLowerCase()
    .includes(String(filterValue).toLowerCase())
}

function DataTableFilters<TData extends object>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const filterableColumns = table.getAllColumns().filter((column) => column.getCanFilter())
  const activeCount = table.state.columnFilters.length

  if (filterableColumns.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <ListFilterIcon />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" size="sm">
                {activeCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          {filterableColumns.map((column) => (
            <div key={column.id} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {getColumnHeaderLabel(column)}
              </label>
              <Input
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                placeholder={`Filter ${getColumnHeaderLabel(column)}…`}
              />
            </div>
          ))}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="self-start"
            >
              Clear filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

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

  /** Shows a global search box in the toolbar above the table. Default false. */
  isSearchEnable?: boolean
  searchPlaceholder?: string
  /** Shows a "Filters" button (per-column text filters) in the toolbar. Default false. */
  isFiltersEnable?: boolean
  /** Shows a "View" (column visibility) button in the toolbar. Default false. */
  isViewEnable?: boolean
  /** Whether columns can be sorted at all. Default true. */
  isSortEnable?: boolean
  /** Lets columns be pinned start/end via the column header menu. Default false. */
  enableColumnPinning?: boolean
  /**
   * Escape hatch for any other ReUI tableLayout flag (columnsResizable,
   * columnsMovable, rowsDraggable, cellSelection, ...) not covered by a
   * dedicated prop above. Merged over this component's own defaults.
   */
  tableLayout?: Partial<NonNullable<DataGridProps<typeof dataGridFeatures, object>["tableLayout"]>>
}

/**
 * Thin, prop-configured wrapper around the ReUI data grid: pass columns and
 * data, get a sorted, paginated table with optional search/filters/column
 * visibility/pinning. For anything these props don't cover (cell selection,
 * row DnD, virtualization, ...), use the ReUI primitives in
 * @/components/reui/data-grid directly — this wrapper only covers the common
 * admin-table case.
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
  isSearchEnable = false,
  searchPlaceholder = "Search…",
  isFiltersEnable = false,
  isViewEnable = false,
  isSortEnable = true,
  enableColumnPinning = false,
  tableLayout: tableLayoutOverrides,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    enableSorting: isSortEnable,
    enableColumnPinning,
    defaultColumn: {
      filterFn: containsFilterFn,
    },
    globalFilterFn: "auto",
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  })

  const showToolbar = isSearchEnable || isFiltersEnable || isViewEnable
  const recordCount = table.getPrePaginatedRowModel().rows.length

  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      tableLayout={{
        dense,
        rowBorder: true,
        headerBorder: true,
        headerSticky: true,
        columnsPinnable: enableColumnPinning,
        ...tableLayoutOverrides,
      }}
    >
      <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
        {showToolbar && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            {isSearchEnable ? (
              <div className="relative w-full max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-8"
                />
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isFiltersEnable && <DataTableFilters table={table} />}
              {isViewEnable && (
                <DataGridColumnVisibility
                  table={table}
                  trigger={
                    <Button variant="outline" size="sm">
                      <SlidersHorizontalIcon />
                      View
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <DataGridContainer>
            <DataGridTable />
          </DataGridContainer>
        </div>
        {!hidePagination && (
          <div className="shrink-0">
            <DataGridPagination sizes={pageSizeOptions} />
          </div>
        )}
      </div>
    </DataGrid>
  )
}
