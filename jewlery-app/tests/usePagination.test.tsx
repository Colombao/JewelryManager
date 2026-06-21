import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

describe("usePagination", () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1);

  it("paginates items with default page size", () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.totalItems).toBe(25);
    expect(result.current.paginatedItems).toHaveLength(15);
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(15);
  });

  it("moves to next page", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.paginatedItems[0]).toBe(11);
  });

  it("adjusts page when page size changes", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.setPage(2);
    });

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.pageSize).toBe(20);
    expect(result.current.page).toBeLessThanOrEqual(result.current.totalPages);
  });
});
