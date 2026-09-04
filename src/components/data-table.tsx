"use client"

import { useState } from "react"
import { useTable } from "@tanstack/react-table"
import type { Column, ColumnDef, Row } from "@tanstack/react-table"
import {
  SlidersHorizontalIcon,
  ChevronsUpDownIcon,
  Trash2Icon,
  GripVerticalIcon,
  ArrowUpDownIcon,
  ListFilterIcon,
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
import { Checkbox } from "@/components/ui/checkbox"
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

function FilterTextValue<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  return (
    <Input
      autoFocus
      value={(column.getFilterValue() as string) ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder={`Filter ${getColumnHeaderLabel(column)}…`}
      className="h-8 w-full"
    />
  )
}

function FilterSelectValue<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  const [open, setOpen] = useState(false)
  const { options } = getFilterMeta(column)
  const selected = (column.getFilterValue() as string[] | undefined) ?? []

  const summary =
    selected.length === 0
      ? "Any"
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? selected[0]
        : `${selected.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 w-full justify-start font-normal">
            <span className="truncate">{summary}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-48">
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
      </PopoverContent>
    </Popover>
  )
}

function FilterValueEditor<TData extends object>({
  column,
}: {
  column: DataTableColumnInstance<TData>
}) {
  const { variant } = getFilterMeta(column)
  if (variant === "select") return <FilterSelectValue column={column} />
  return <FilterTextValue column={column} />
}

/** One row inside the Filter popover: field picker, value editor, remove, drag handle. */
function DataTableFilterItem<TData extends object>({
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
                className="w-32 shrink-0 justify-between font-normal"
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
        <div className="min-w-36 max-w-60 flex-1">
          <FilterValueEditor column={column} />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={onRemove}
          aria-label={`Remove ${label} filter`}
        >
          <Trash2Icon />
        </Button>
        <SortableItemHandle asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Reorder ${label} filter`}
          >
            <GripVerticalIcon />
          </Button>
        </SortableItemHandle>
      </div>
    </SortableItem>
  )
}

/** "Filter" toolbar button: opens a drag-reorderable list of per-column filters, badged with the active count. */
function DataTableFilterList<TData extends object>({
  table,
}: {
  table: DataTableInstance<TData>
}) {
  const [open, setOpen] = useState(false)

  const filterableColumns = table.getAllColumns().filter((column) => column.getCanFilter())
  if (filterableColumns.length === 0) return null

  const filters = table.state.columnFilters
  const activeIds = filters.map((filter) => filter.id)
  const activeIdSet = new Set(activeIds)
  const availableColumns = filterableColumns.filter((column) => !activeIdSet.has(column.id))

  function updateField(oldId: string, newId: string) {
    table.setColumnFilters((old) =>
      old.map((filter) => (filter.id === oldId ? { id: newId, value: undefined } : filter))
    )
  }

  function removeFilter(columnId: string) {
    table.setColumnFilters((old) => old.filter((filter) => filter.id !== columnId))
  }

  function addFilter() {
    const first = availableColumns[0]
    if (!first) return
    table.setColumnFilters((old) => [...old, { id: first.id, value: undefined }])
  }

  return (
    <Sortable value={filters} onValueChange={table.setColumnFilters} getItemValue={(item) => item.id}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <ListFilterIcon />
              Filter
              {activeIds.length > 0 && (
                <Badge variant="secondary" size="sm">
                  {activeIds.length}
                </Badge>
              )}
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="flex w-full max-w-full flex-col gap-3.5 p-4 sm:min-w-[420px]"
        >
          <div className="flex flex-col gap-1">
            <h4 className="font-medium leading-none">
              {activeIds.length > 0 ? "Filters" : "No filters applied"}
            </h4>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                activeIds.length > 0 && "sr-only"
              )}
            >
              {activeIds.length > 0
                ? "Modify filters to refine your rows."
                : "Add filters to refine your rows."}
            </p>
          </div>
          {activeIds.length > 0 && (
            <SortableContent asChild>
              <div role="list" className="flex max-h-[300px] flex-col gap-2 overflow-y-auto p-1">
                {activeIds.map((id) => {
                  const column = table.getColumn(id)
                  if (!column) return null
                  return (
                    <DataTableFilterItem
                      key={id}
                      column={column}
                      availableColumns={availableColumns}
                      onFieldChange={(newId) => updateField(id, newId)}
                      onRemove={() => removeFilter(id)}
                    />
                  )
                })}
              </div>
            </SortableContent>
          )}
          <div className="flex w-full items-center gap-2">
            <Button size="sm" onClick={addFilter} disabled={availableColumns.length === 0}>
              Add filter
            </Button>
            {activeIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => table.resetColumnFilters()}>
                Reset filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </Sortable>
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

  /** Shows a "Filter" toolbar button (drag-reorderable per-column filters). Default false. */
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
  isFiltersEnable = false,
  isViewEnable = false,
  isSortEnable = true,
  isSortListEnable = false,
  enableColumnPinning = false,
  tableLayout: tableLayoutOverrides,
}: DataTableProps<TData>) {
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
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  })

  const showToolbar = isFiltersEnable || isSortListEnable || isViewEnable
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
            <div className="flex flex-wrap items-center gap-2">
              {isSortListEnable && <DataTableSortList table={table} />}
              {isFiltersEnable && <DataTableFilterList table={table} />}
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
