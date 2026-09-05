"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon, CheckIcon, FlameIcon, ListChecksIcon, SearchIcon } from "lucide-react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableServerQuery,
} from "@/components/data-table"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAttendanceGrid, ApiError, type AttendanceGridMember } from "@/lib/api"
import { getToken } from "@/lib/auth-storage"

/**
 * The calendar day the user actually picked, read via local getters — the
 * Calendar/presets hand back local midnight Date objects, and converting
 * those through toISOString() (UTC) shifts the date by the local offset
 * (e.g. "1 Aug 00:00 IST" becomes "31 Jul 18:30 UTC").
 */
function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Parses a "YYYY-MM-DD" key as UTC midnight, purely as an arithmetic handle
 * for stepping through the range one day at a time — never re-extract a day
 * from this via local getters (see eachDateKey), only via toISOString/UTC.
 */
function parseDateKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`)
}

function formatColumnDate(key: string) {
  return parseDateKey(key).toLocaleDateString(undefined, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })
}

function formatRangeLabel(range: DateRange) {
  if (!range.from) return "Pick a date range"
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const from = range.from.toLocaleDateString(undefined, opts)
  if (!range.to || range.to.getTime() === range.from.getTime()) return from
  const to = range.to.toLocaleDateString(undefined, opts)
  return `${from} – ${to}`
}

function eachDateKey(fromKey: string, toKey: string) {
  const keys: string[] = []
  const end = parseDateKey(toKey)
  // Stay in UTC-instant space throughout: fromKey/toKey were parsed as UTC
  // midnight, so stepping by exactly one UTC day and re-reading via
  // toISOString (also UTC) reproduces the string sequence with no drift,
  // regardless of the viewer's timezone.
  for (let d = parseDateKey(fromKey); d <= end; d = new Date(d.getTime() + 86400000)) {
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function defaultRange(): DateRange {
  return { from: addDays(today(), -9), to: today() }
}

const RANGE_PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Last 10 days", range: () => ({ from: addDays(today(), -9), to: today() }) },
  { label: "Last 15 days", range: () => ({ from: addDays(today(), -14), to: today() }) },
  {
    label: "This month",
    range: () => {
      const now = today()
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    },
  },
  {
    label: "Last month",
    range: () => {
      const now = today()
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    },
  },
]

function DateRangePicker({
  range,
  onChange,
}: {
  range: DateRange
  onChange: (range: DateRange) => void
}) {
  const [open, setOpen] = useState(false)
  // Tracks the in-progress selection while only one end of the range has
  // been picked, so the calendar can preview it without firing onChange
  // (and thus a fetch) until a complete range is chosen.
  const [pending, setPending] = useState<DateRange | undefined>(range)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setPending(range)
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <CalendarIcon />
            {formatRangeLabel(range)}
          </Button>
        }
      />
      <PopoverContent align="end" className="flex w-auto flex-row gap-0 p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={range.from}
          selected={pending}
          onSelect={(_next, clickedDay) => {
            // react-day-picker "completes" a range on a single click whenever
            // the previously selected range already had both ends (it just
            // moves whichever end is closer) — which is exactly the "one
            // click fires a fetch" bug. So the two-click walk is driven
            // manually off clickedDay instead of trusting its computed range:
            // a click while pending is incomplete closes the range; any other
            // click (nothing pending yet, or the old range was already
            // complete) starts a fresh single-ended selection.
            // (onChange/setOpen are called here, outside the setPending
            // updater — calling them from inside the updater fires a parent
            // state update while this component is still rendering.)
            if (pending?.from && !pending.to) {
              const complete =
                clickedDay < pending.from
                  ? { from: clickedDay, to: pending.from }
                  : { from: pending.from, to: clickedDay }
              setPending(complete)
              onChange(complete)
              setOpen(false)
            } else {
              setPending({ from: clickedDay, to: undefined })
            }
          }}
          disabled={{ after: new Date() }}
        />
        <div className="flex flex-col gap-1 border-l p-2">
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start font-normal"
              onClick={() => {
                onChange(preset.range())
                setOpen(false)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AttendanceCell({ attended }: { attended: boolean }) {
  return (
    <div className="flex justify-center">
      {attended ? (
        <CheckIcon className="size-4 text-emerald-500" />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  )
}

export default function AttendancePage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [members, setMembers] = useState<AttendanceGridMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState<DataTableServerQuery>({ skip: 0, limit: 12, filters: [] })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const fromKey = range.from ? toDateKey(range.from) : undefined
  const toKey = range.to ? toDateKey(range.to) : fromKey
  const dateKeys = useMemo(
    () => (fromKey && toKey ? eachDateKey(fromKey, toKey) : []),
    [fromKey, toKey]
  )

  const fetchGrid = useCallback(
    async (q: DataTableServerQuery, from: string, to: string, searchTerm: string) => {
      const token = getToken()
      if (!token) return
      setLoading(true)
      setLoadError(null)
      try {
        // The standalone search box and the "Name" filter chip both feed the
        // same backend `search` param — whichever the admin is actually using.
        const nameFilterValue = q.filters.find((f) => f.id === "name")?.value as
          | string
          | undefined
        const result = await getAttendanceGrid(token, {
          from,
          to,
          skip: q.skip,
          limit: q.limit,
          search: searchTerm || nameFilterValue || undefined,
        })
        setMembers(result.data)
        setTotal(result.total)
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load attendance.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!fromKey || !toKey) return
    fetchGrid(query, fromKey, toKey, search)
  }, [query, fromKey, toKey, search, fetchGrid])

  const columns: DataTableColumn<AttendanceGridMember>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <span className="block min-w-[150px] font-medium">{row.original.name}</span>
        ),
        size: 190,
        meta: { headerTitle: "Name", skeleton: <Skeleton className="h-4 w-32" /> },
      },
      {
        id: "count",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title=""
            icon={
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <ListChecksIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Present</TooltipContent>
              </Tooltip>
            }
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {row.original.presentCount}/{dateKeys.length}
          </span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 90,
        meta: { headerTitle: "Present", skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: "streak",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title=""
            icon={
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <FlameIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Streak</TooltipContent>
              </Tooltip>
            }
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <FlameIcon
              className={`size-4 ${row.original.streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`}
            />
            <span className="font-medium">{row.original.streak}</span>
          </div>
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 80,
        meta: { headerTitle: "Streak", skeleton: <Skeleton className="h-4 w-10" /> },
      },
      {
        accessorKey: "memberCode",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Member" />,
        enableColumnFilter: false,
        meta: { headerTitle: "Member", skeleton: <Skeleton className="h-4 w-20" /> },
      },
      {
        accessorKey: "phone",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Phone" />,
        enableColumnFilter: false,
        meta: { headerTitle: "Phone", skeleton: <Skeleton className="h-4 w-24" /> },
      },
      ...dateKeys.map(
        (dateKey): DataTableColumn<AttendanceGridMember> => ({
          id: dateKey,
          header: () => (
            <span className="text-xs whitespace-nowrap">{formatColumnDate(dateKey)}</span>
          ),
          cell: ({ row }) => (
            <AttendanceCell attended={row.original.attendedDates.includes(dateKey)} />
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableHiding: false,
          size: 64,
        })
      ),
    ],
    [dateKeys]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Day-wise check-ins for the selected date range.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, phone, email, ID…"
              className="pl-8"
              name="attendance-search"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
          <DateRangePicker range={range} onChange={setRange} />
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={members}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage="No members found."
        pageSize={12}
        pageSizeOptions={[12, 25, 50]}
        isViewEnable
        isFiltersEnable
        enableColumnPinning
        initialColumnPinning={{ start: ["name"], end: ["count", "streak"] }}
        initialColumnVisibility={{ memberCode: false, phone: false }}
        serverSide
        rowCount={total}
        onQueryChange={setQuery}
      />
    </div>
  )
}
