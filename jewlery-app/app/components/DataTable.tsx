"use client";

import { ReactNode, useMemo } from "react";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  usePagination,
} from "@/hooks/usePagination";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  align?: "left" | "center" | "right";
  render: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  minWidth?: string;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  showPagination?: boolean;
  mobileCardRender?: (row: T) => ReactNode;
  className?: string;
}

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export default function DataTable<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado.",
  loadingMessage = "Carregando...",
  minWidth,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showPagination = true,
  mobileCardRender,
  className = "",
}: DataTableProps<T>) {
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex,
    endIndex,
  } = usePagination(data, initialPageSize);

  const visibleColumns = useMemo(() => columns, [columns]);

  function renderPagination() {
    if (!showPagination || totalItems === 0) return null;

    const pages = buildPageNumbers(page, totalPages);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>
            {startIndex}–{endIndex} de {totalItems}
          </span>
          <label className="flex items-center gap-2">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1">
          <PaginationButton
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </PaginationButton>
          {pages.map((item, index) =>
            item === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-slate-400 text-xs"
              >
                …
              </span>
            ) : (
              <PaginationButton
                key={item}
                active={item === page}
                onClick={() => setPage(item)}
              >
                {item}
              </PaginationButton>
            )
          )}
          <PaginationButton
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </PaginationButton>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {mobileCardRender && (
        <div className="md:hidden space-y-3">
          {totalItems === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
              {isLoading ? loadingMessage : emptyMessage}
            </div>
          ) : (
            paginatedItems.map((row) => (
              <div key={rowKey(row)}>{mobileCardRender(row)}</div>
            ))
          )}
          {totalItems > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {renderPagination()}
            </div>
          )}
        </div>
      )}

      <div
        className={`${
          mobileCardRender ? "hidden md:block" : "block"
        } bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-sm"
            style={minWidth ? { minWidth } : undefined}
          >
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider">
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 ${alignClass(column.align)} ${
                      column.headerClassName ?? ""
                    }`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading || totalItems === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">{loadingMessage}</span>
                    ) : (
                      emptyMessage
                    )}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row, index) => (
                  <tr
                    key={rowKey(row)}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2.5 ${alignClass(column.align)} ${
                          column.cellClassName ?? ""
                        }`}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[2rem] h-8 px-2 rounded-md text-xs font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : disabled
          ? "text-slate-300 cursor-not-allowed"
          : "text-slate-600 hover:bg-white border border-transparent hover:border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
