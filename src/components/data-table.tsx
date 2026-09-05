"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useTable } from "@tanstack/react-table"
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  SortingState,
} from "@tanstack/react-table"
import {
  SlidersHorizontalIcon,
  ChevronsUpDownIcon,
  Trash2Icon,
  GripVerticalIcon,
  ArrowUpDownIcon,
  ListFilterIcon,
  XIcon,
} from "lucide-react"
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
import { Badge } from "@/components/reui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable"
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
  /** Filter UI for this column in the Filter panel. Defaults to "text". */
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

/** Value control for an existing filter chip's field selector, joined flush against its neighbors. */
function FilterChipField<TData extends object>({
  column,
  availableColumns,
  onFieldChange,
}: {
  column: DataTableColumnInstance<TData>
  availableColumns: DataTableColumnInstance<TData>[]
  onFieldChange: (columnId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const label = getColumnHeaderLabel(column)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-none rounded-l-md border border-r-0 font-normal"
          >
            {label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-44 p-0">
        <Command>
          <CommandInput placeholder="Search fields…" />
          <CommandList>
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup>
              {availableColumns.map((availableColumn) => (
                <CommandItem
                  key={availableColumn.id}
                  value={getColumnHeaderLabel(availableColumn)}
                  data-checked={availableColumn.id === column.id}
                  onSelect={() => {
                    onFieldChange(availableColumn.id)
                    setOpen(false)
                  }}
                >
                  {getColumnHeaderLabel(availableColumn)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FilterChipSelectValue<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  const [open, setOpen] = useState(false)
  const { options } = getFilterMeta(column)
  const selected = (column.getFilterValue() as string[] | undefined) ?? []
  const selectedLabels = options.filter((option) => selected.includes(option.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="h-8 min-w-16 rounded-none border font-normal">
            {selectedLabels.length === 0
              ? "Select options…"
              : selectedLabels.length > 1
                ? `${selectedLabels.length} selected`
                : selectedLabels[0]?.label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search options…" />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    data-checked={isSelected}
                    onSelect={() => {
                      const next = isSelected
                        ? selected.filter((value) => value !== option.value)
                        : [...selected, option.value]
                      column.setFilterValue(next.length > 0 ? next : undefined)
                    }}
                  >
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FilterChipTextValue<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  return (
    <Input
      value={(column.getFilterValue() as string) ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder="Enter value…"
      className="h-8 w-24 rounded-none border-x-0 px-1.5"
    />
  )
}

/** Value control for an existing filter chip, joined flush against its neighbors. */
function FilterChipValue<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  const { variant } = getFilterMeta(column)
  if (variant === "select") return <FilterChipSelectValue column={column} />
  return <FilterChipTextValue column={column} />
}

/** One active filter, rendered as a single joined pill: field, value, remove. */
function FilterChip<TData extends object>({
  column,
  availableColumns,
  onFieldChange,
  onRemove,
}: {
  column: DataTableColumnInstance<TData>
  availableColumns: DataTableColumnInstance<TData>[]
  onFieldChange: (columnId: string) => void
  onRemove: () => void
}) {
  const label = getColumnHeaderLabel(column)

  return (
    <div role="listitem" className="flex h-8 items-center rounded-md bg-background">
      <FilterChipField column={column} availableColumns={availableColumns} onFieldChange={onFieldChange} />
      <FilterChipValue column={column} />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 shrink-0 rounded-none rounded-r-md border border-l-0 px-1.5"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  )
}

/** Command-list options for picking a value once a field is selected in the filter menu. */
function FilterValueCommandOptions<TData extends object>({
  column,
  value,
  onSelect,
}: {
  column: DataTableColumnInstance<TData>
  value: string
  onSelect: (value: string | string[]) => void
}) {
  const { variant, options } = getFilterMeta(column)

  if (variant === "select") {
    return (
      <CommandGroup>
        {options.map((option) => (
          <CommandItem key={option.value} value={option.label} onSelect={() => onSelect([option.value])}>
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }

  const isEmpty = !value.trim()
  return (
    <CommandGroup>
      <CommandItem value={value || "type-to-add-filter"} onSelect={() => onSelect(value)} disabled={isEmpty}>
        {isEmpty ? "Type to add filter…" : `Filter by "${value}"`}
      </CommandItem>
    </CommandGroup>
  )
}

/**
 * Command-palette-style filter menu: active filters render as joined pill
 * chips, and a single trigger opens a search-driven "pick a field, then pick
 * a value" flow that commits a filter immediately on selection.
 */
function DataTableFilterMenu<TData extends object>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const [open, setOpen] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filterableColumns = table.getAllColumns().filter((column) => column.getCanFilter())
  if (filterableColumns.length === 0) return null

  const filters = table.state.columnFilters
  const activeIdSet = new Set(filters.map((filter) => filter.id))
  const availableColumns = filterableColumns.filter((column) => !activeIdSet.has(column.id))
  const selectedColumn = selectedColumnId ? (table.getColumn(selectedColumnId) ?? null) : null

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setTimeout(() => {
        setSelectedColumnId(null)
        setInputValue("")
      }, 100)
    }
  }

  function updateField(oldId: string, newId: string) {
    table.setColumnFilters((old) =>
      old.map((filter) => (filter.id === oldId ? { id: newId, value: undefined } : filter))
    )
  }

  function removeFilter(columnId: string) {
    table.setColumnFilters((old) => old.filter((filter) => filter.id !== columnId))
  }

  function commitFilter(columnId: string, value: string | string[]) {
    table.setColumnFilters((old) => [...old, { id: columnId, value }])
    onOpenChange(false)
  }

  return (
    <div role="list" className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const column = table.getColumn(filter.id)
        if (!column) return null
        return (
          <FilterChip
            key={filter.id}
            column={column}
            availableColumns={availableColumns}
            onFieldChange={(newId) => updateField(filter.id, newId)}
            onRemove={() => removeFilter(filter.id)}
          />
        )
      })}
      {filters.length > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.resetColumnFilters()}
          aria-label="Reset all filters"
        >
          <XIcon />
        </Button>
      )}
      {availableColumns.length > 0 && (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size={filters.length > 0 ? "icon" : "sm"}
                className={cn(filters.length > 0 && "size-8", "h-8 font-normal")}
                aria-label="Open filter command menu"
              >
                <ListFilterIcon />
                {filters.length === 0 && "Filter"}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-64 p-0">
            <Command>
              <CommandInput
                ref={inputRef}
                placeholder={selectedColumn ? getColumnHeaderLabel(selectedColumn) : "Search fields…"}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {selectedColumn ? (
                  <FilterValueCommandOptions
                    column={selectedColumn}
                    value={inputValue}
                    onSelect={(value) => commitFilter(selectedColumn.id, value)}
                  />
                ) : (
                  <>
                    <CommandEmpty>No fields found.</CommandEmpty>
                    <CommandGroup>
                      {availableColumns.map((column) => (
                        <CommandItem
                          key={column.id}
                          value={getColumnHeaderLabel(column)}
                          onSelect={() => {
                            setSelectedColumnId(column.id)
                            setInputValue("")
                          }}
                        >
                          {getColumnHeaderLabel(column)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

/** One row inside the Sort popover: field picker, direction select, remove, drag handle. */
function DataTableSortItem<TData extends object>({
  column,
  desc,
  availableColumns,
  onFieldChange,
  onDirectionChange,
  onRemove,
}: {
  column: DataTableColumnInstance<TData>
  desc: boolean
  availableColumns: DataTableColumnInstance<TData>[]
  onFieldChange: (columnId: string) => void
  onDirectionChange: (desc: boolean) => void
  onRemove: () => void
}) {
  const [showField, setShowField] = useState(false)
  const label = getColumnHeaderLabel(column)

  return (
    <SortableItem value={column.id} asChild>
      <div className="flex items-center gap-2">
        <Popover open={showField} onOpenChange={setShowField}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="w-36 shrink-0 justify-between font-normal"
              >
                <span className="truncate">{label}</span>
                <ChevronsUpDownIcon className="opacity-50" />
              </Button>
            }
          />
          <PopoverContent align="start" className="w-44 p-0">
            <Command>
              <CommandInput placeholder="Search fields…" />
              <CommandList>
                <CommandEmpty>No fields found.</CommandEmpty>
                <CommandGroup>
                  {availableColumns.map((availableColumn) => (
                    <CommandItem
                      key={availableColumn.id}
                      value={getColumnHeaderLabel(availableColumn)}
                      onSelect={() => {
                        onFieldChange(availableColumn.id)
                        setShowField(false)
                      }}
                    >
                      <span className="truncate">{getColumnHeaderLabel(availableColumn)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select value={desc ? "desc" : "asc"} onValueChange={(value) => onDirectionChange(value === "desc")}>
          <SelectTrigger className="w-32 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={onRemove}
          aria-label={`Remove ${label} sort`}
        >
          <Trash2Icon />
        </Button>
        <SortableItemHandle asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Reorder ${label} sort`}
          >
            <GripVerticalIcon />
          </Button>
        </SortableItemHandle>
      </div>
    </SortableItem>
  )
}

/** "Sort" toolbar button: opens a drag-reorderable list of per-column sorts, badged with the active count. */
function DataTableSortList<TData extends object>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const [open, setOpen] = useState(false)

  const sortableColumns = table.getAllColumns().filter((column) => column.getCanSort())
  if (sortableColumns.length === 0) return null

  const sorting = table.state.sorting
  const sortedIds = new Set(sorting.map((sort) => sort.id))
  const availableColumns = sortableColumns.filter((column) => !sortedIds.has(column.id))

  function updateField(oldId: string, newId: string) {
    table.setSorting((old) => old.map((sort) => (sort.id === oldId ? { id: newId, desc: sort.desc } : sort)))
  }

  function updateDirection(columnId: string, desc: boolean) {
    table.setSorting((old) => old.map((sort) => (sort.id === columnId ? { ...sort, desc } : sort)))
  }

  function removeSort(columnId: string) {
    table.setSorting((old) => old.filter((sort) => sort.id !== columnId))
  }

  function addSort() {
    const first = availableColumns[0]
    if (!first) return
    table.setSorting((old) => [...old, { id: first.id, desc: false }])
  }

  return (
    <Sortable value={sorting} onValueChange={table.setSorting} getItemValue={(item) => item.id}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <ArrowUpDownIcon />
              Sort
              {sorting.length > 0 && (
                <Badge variant="secondary" size="sm">
                  {sorting.length}
                </Badge>
              )}
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="flex w-full max-w-full flex-col gap-3.5 p-4 sm:min-w-[380px]"
        >
          <div className="flex flex-col gap-1">
            <h4 className="font-medium leading-none">
              {sorting.length > 0 ? "Sort by" : "No sorting applied"}
            </h4>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                sorting.length > 0 && "sr-only"
              )}
            >
              {sorting.length > 0
                ? "Modify sorting to organize your rows."
                : "Add sorting to organize your rows."}
            </p>
          </div>
          {sorting.length > 0 && (
            <SortableContent asChild>
              <div role="list" className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1">
                {sorting.map((sort) => {
                  const column = table.getColumn(sort.id)
                  if (!column) return null
                  return (
                    <DataTableSortItem
                      key={sort.id}
                      column={column}
                      desc={sort.desc}
                      availableColumns={availableColumns}
                      onFieldChange={(newId) => updateField(sort.id, newId)}
                      onDirectionChange={(desc) => updateDirection(sort.id, desc)}
                      onRemove={() => removeSort(sort.id)}
                    />
                  )
                })}
              </div>
            </SortableContent>
          )}
          <div className="flex w-full items-center gap-2">
            <Button size="sm" onClick={addSort} disabled={availableColumns.length === 0}>
              Add sort
            </Button>
            {sorting.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => table.setSorting([])}>
                Reset sorting
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </Sortable>
  )
}

/**
 * The effective query a server-side table needs to fetch its current page:
 * pagination as `skip`/`limit`, the single active sort (this wrapper only
 * ever applies one at a time in server mode), and the raw column filters so
 * the caller can map each one to whatever its API expects.
 */
export interface DataTableServerQuery {
  skip: number
  limit: number
  sortBy?: string
  sortDir?: "asc" | "desc"
  filters: { id: string; value: unknown }[]
}

export interface DataTableProps<TData extends object> {
  /** Column definitions — same shape as any TanStack Table v9 ColumnDef, plus optional `meta.variant`/`meta.options` for filters. */
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
  /** Inline style per row, e.g. a colored left edge/tint driven by row data. */
  getRowStyle?: (row: TData) => CSSProperties | undefined

  /**
   * Switches to server-side mode: this component still owns the pagination
   * page/size, sorting, and column-filter UI state, but stops slicing,
   * sorting, or filtering `data` itself — it's assumed to already be just
   * the current page. Pair with `rowCount` and `onQueryChange`. Default
   * false (ordinary local/client-side filtering over all of `data`).
   */
  serverSide?: boolean
  /** Total row count across all pages. Required when `serverSide` is true — drives page count. */
  rowCount?: number
  /**
   * Fires whenever the effective query (pagination, sorting, filters)
   * changes while `serverSide` is true, so the caller can refetch. Memoize
   * this (`useCallback`) — an inline function republishes on every render.
   */
  onQueryChange?: (query: DataTableServerQuery) => void

  /** Shows a command-palette-style "Filter" menu (search a field, pick a value) with active filters as chips. Default false. */
  isFiltersEnable?: boolean
  /** Shows a "View" (column visibility) button in the toolbar. Default false. */
  isViewEnable?: boolean
  /** Whether columns can be sorted at all. Default true. */
  isSortEnable?: boolean
  /** Shows a "Sort" toolbar button (drag-reorderable per-column sorting). Default false. */
  isSortListEnable?: boolean
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
 * data, get a sorted, paginated table with optional filter/sort/column
 * visibility/pinning controls. For anything these props don't cover (cell
 * selection, row DnD, virtualization, ...), use the ReUI primitives in
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
  getRowStyle,
  isFiltersEnable = false,
  isViewEnable = false,
  isSortEnable = true,
  isSortListEnable = false,
  enableColumnPinning = false,
  tableLayout: tableLayoutOverrides,
  serverSide = false,
  rowCount,
  onQueryChange,
}: DataTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

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
    state: { pagination, sorting, columnFilters },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    rowCount: serverSide ? rowCount : undefined,
  })

  useEffect(() => {
    if (!serverSide || !onQueryChange) return
    const [sort] = sorting
    onQueryChange({
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      sortBy: sort?.id,
      sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined,
      filters: columnFilters,
    })
    // onQueryChange is expected to be stable (useCallback) — including it
    // would refire this on every parent render, not just query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSide, pagination.pageIndex, pagination.pageSize, sorting, columnFilters])

  const showToolbar = isFiltersEnable || isSortListEnable || isViewEnable
  const recordCount = serverSide ? (rowCount ?? data.length) : table.getPrePaginatedRowModel().rows.length

  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onRowClick={onRowClick}
      getRowStyle={getRowStyle}
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
            <div className="flex flex-wrap items-center gap-2">
              {isSortListEnable && <DataTableSortList table={table} />}
              {isFiltersEnable && <DataTableFilterMenu table={table} />}
            </div>
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
