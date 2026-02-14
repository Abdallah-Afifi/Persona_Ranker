"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface ResultRow {
  id: string;
  rank: number | null;
  relevance_score: number;
  is_relevant: boolean;
  reasoning: string;
  department_fit: string;
  seniority_fit: string;
  lead: {
    account_name: string;
    lead_first_name: string;
    lead_last_name: string;
    lead_job_title: string;
    account_domain: string;
    account_employee_range: string;
    account_industry: string;
  };
}

const columnHelper = createColumnHelper<ResultRow>();

const fitBadge = (fit: string) => {
  const colors: Record<string, string> = {
    excellent: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    moderate: "bg-yellow-100 text-yellow-800",
    poor: "bg-gray-100 text-gray-600",
    disqualified: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[fit] || colors.poor
      }`}
    >
      {fit}
    </span>
  );
};

const columns = [
  columnHelper.accessor("rank", {
    header: "Rank",
    cell: (info) => {
      const val = info.getValue();
      return val !== null ? (
        <span className="font-semibold text-gray-900">#{val}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.rank;
      const b = rowB.original.rank;
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    },
  }),
  columnHelper.accessor((row) => row.lead.account_name, {
    id: "company",
    header: "Company",
    cell: (info) => (
      <span className="font-medium text-gray-900">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor(
    (row) => `${row.lead.lead_first_name} ${row.lead.lead_last_name}`,
    {
      id: "name",
      header: "Name",
      cell: (info) => info.getValue(),
    }
  ),
  columnHelper.accessor((row) => row.lead.lead_job_title, {
    id: "title",
    header: "Job Title",
    cell: (info) => (
      <span className="text-sm text-gray-600">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("relevance_score", {
    header: "Score",
    cell: (info) => {
      const score = info.getValue();
      const color =
        score >= 70
          ? "text-green-700 bg-green-50"
          : score >= 40
          ? "text-yellow-700 bg-yellow-50"
          : "text-red-700 bg-red-50";
      return (
        <span className={`inline-block px-2 py-0.5 rounded font-semibold text-sm ${color}`}>
          {score}
        </span>
      );
    },
  }),
  columnHelper.accessor("is_relevant", {
    header: "Relevant",
    cell: (info) =>
      info.getValue() ? (
        <span className="text-green-600 font-medium">✓ Yes</span>
      ) : (
        <span className="text-red-500">✗ No</span>
      ),
  }),
  columnHelper.accessor("department_fit", {
    header: "Dept Fit",
    cell: (info) => fitBadge(info.getValue()),
  }),
  columnHelper.accessor("seniority_fit", {
    header: "Seniority Fit",
    cell: (info) => fitBadge(info.getValue()),
  }),
  columnHelper.accessor((row) => row.lead.account_employee_range, {
    id: "employees",
    header: "Employees",
    cell: (info) => (
      <span className="text-sm text-gray-500">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("reasoning", {
    header: "Reasoning",
    cell: (info) => (
      <span className="text-xs text-gray-500 line-clamp-2 max-w-xs block">
        {info.getValue()}
      </span>
    ),
    enableSorting: false,
  }),
];

interface ResultsTableProps {
  results: ResultRow[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "relevance_score", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showRelevantOnly, setShowRelevantOnly] = useState(false);

  const filteredData = useMemo(
    () => (showRelevantOnly ? results.filter((r) => r.is_relevant) : results),
    [results, showRelevantOnly]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">
            Ranking Results
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredData.length} leads)
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showRelevantOnly}
                onChange={(e) => setShowRelevantOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Relevant only
            </label>
            <input
              type="text"
              placeholder="Search leads..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? ""}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${
                  !row.original.is_relevant ? "opacity-60" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
