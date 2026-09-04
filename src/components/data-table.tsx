"use client"

import { useState } from "react"
import { useTable } from "@tanstack/react-table"
import type { Column, ColumnDef, Row } from "@tanstack/react-table"
import { SearchIcon, SlidersHorizontalIcon, PlusIcon, XIcon } from "lucide-react"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  getColumnHeaderLabel,
  type DataGridColumnMeta,
  type DataGridProps,
} from "@/components/reui/data-grid/data-grid"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export type FilterVariant = "text" | "select"

export interface FilterOption {
  label: string
  value: string
}

export interface DataTableFilterMeta {
  /** Filter UI for this column in the filter chip list. Defaults to "text". */
  variant?: FilterVariant
  /** Options for a "select" variant filter — pair with `multiSelectFilterFn` as the column's `filterFn`. */
  options?: FilterOption[]
}

/** Plain `Omit` collapses a discriminated union to its common keys, losing the accessorKey/accessorFn split — distribute it over each member first. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

export type DataTableColumn<TData extends object> = DistributiveOmit<
  ColumnDef<typeof dataGridFeatures, TData>,
  "meta"
> & {
  meta?: DataGridColumnMeta<TData> & DataTableFilterMeta
}

type DataTableInstance<TData extends object> = ReturnType<
  typeof useTable<typeof dataGridFeatures, TData>
>

type DataTableColumnInstance<TData extends object> = Column<
  typeof dataGridFeatures,
  TData,
  unknown
>

/** Substring match against the cell's stringified value — the default for a "text" variant column. */
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

/** Row passes if its cell value is one of the selected options — pair with a "select" variant column. */
export function multiSelectFilterFn<TData extends object>(
  row: Row<typeof dataGridFeatures, TData>,
  columnId: string,
  filterValue: unknown
) {
  const selected = (filterValue as string[] | undefined) ?? []
  if (selected.length === 0) return true
  return selected.includes(String(row.getValue(columnId) ?? ""))
}

function getFilterMeta<TData extends object>(column: DataTableColumnInstance<TData>) {
  const meta = (column.columnDef.meta ?? {}) as DataTableFilterMeta
  return { variant: meta.variant ?? "text", options: meta.options ?? [] } as const
}

function FilterValueEditor<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  const { variant, options } = getFilterMeta(column)

  if (variant === "select") {
    const selected = (column.getFilterValue() as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value)
                column.setFilterValue(next.length > 0 ? next : undefined)
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
    )
  }

  return (
    <Input
      autoFocus
      value={(column.getFilterValue() as string) ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder={`Filter ${getColumnHeaderLabel(column)}…`}
    />
  )
}

function FilterChip<TData extends object>({
  column,
  onRemove,
  defaultOpen,
}: {
  column: DataTableColumnInstance<TData>
  onRemove: () => void
  defaultOpen?: boolean
}) {
  const { variant, options } = getFilterMeta(column)
  const label = getColumnHeaderLabel(column)

  const summary = (() => {
    if (variant === "select") {
      const selected = (column.getFilterValue() as string[] | undefined) ?? []
      if (selected.length === 0) return "Any"
      if (selected.length === 1) {
        return options.find((option) => option.value === selected[0])?.label ?? selected[0]
      }
      return `${selected.length} selected`
    }
    return (column.getFilterValue() as string | undefined) || "Any"
  })()

  return (
    <div className="flex items-stretch overflow-hidden rounded-md border bg-muted/40 text-xs">
      <Popover defaultOpen={defaultOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 hover:bg-muted"
            >
              <span className="font-medium">{label}</span>
              <span className="max-w-32 truncate text-muted-foreground">{summary}</span>
            </button>
          }
        />
        <PopoverContent align="start" className="w-64">
          <FilterValueEditor column={column} />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex items-center border-l px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}

function AddFilterChip<TData extends object>({
  columns,
  onSelect,
}: {
  columns: DataTableColumnInstance<TData>[]
  onSelect: (columnId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            Add filter
          </button>
        }
      />
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Filter by…" />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  value={getColumnHeaderLabel(column)}
                  onSelect={() => {
                    onSelect(column.id)
                    setOpen(false)
                  }}
                >
                  {getColumnHeaderLabel(column)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** DiceUI-style filter chip list: each active column filter renders as a removable chip, plus an "Add filter" chip to pick another column. */
function DataTableFilterList<TData extends object>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const filterableColumns = table.getAllColumns().filter((column) => column.getCanFilter())
  if (filterableColumns.length === 0) return null

  const activeIds = table.state.columnFilters.map((filter) => filter.id)
  const shownIds = [...activeIds, ...pendingIds.filter((id) => !activeIds.includes(id))]
  const availableColumns = filterableColumns.filter((column) => !shownIds.includes(column.id))

  function removeFilter(columnId: string) {
    table.getColumn(columnId)?.setFilterValue(undefined)
    setPendingIds((ids) => ids.filter((id) => id !== columnId))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shownIds.map((id) => {
        const column = table.getColumn(id)
        if (!column) return null
        return (
          <FilterChip
            key={id}
            column={column}
            onRemove={() => removeFilter(id)}
            defaultOpen={id === lastAddedId}
          />
        )
      })}
      {availableColumns.length > 0 && (
        <AddFilterChip
          columns={availableColumns}
          onSelect={(columnId) => {
            setPendingIds((ids) => (ids.includes(columnId) ? ids : [...ids, columnId]))
            setLastAddedId(columnId)
          }}
        />
      )}
      {shownIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            table.resetColumnFilters()
            setPendingIds([])
          }}
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
  )
}

export interface DataTableProps<TData extends object> {
  /** Column definitions — same shape as any TanStack Table v9 ColumnDef, plus optional `meta.variant`/`meta.options` for filter chips. */
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
  /** Shows a DiceUI-style filter chip list (per-column filters, "Add filter" picker) below the toolbar. Default false. */
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

  const showToolbar = isSearchEnable || isViewEnable
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
        cellBorder: true,
        headerBorder: true,
        headerSticky: false,
        width: "auto",
        columnsPinnable: enableColumnPinning,
        ...tableLayoutOverrides,
      }}
    >
      <div className={cn("flex flex-col gap-3", className)}>
        {showToolbar && (
          <div className="flex flex-wrap items-center justify-between gap-2">
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
        )}

        {isFiltersEnable && <DataTableFilterList table={table} />}

        <div className="overflow-auto rounded-lg border">
          <DataGridContainer>
            <DataGridTable />
          </DataGridContainer>
        </div>
        {!hidePagination && <DataGridPagination sizes={pageSizeOptions} />}
      </div>
    </DataGrid>
  )
}
