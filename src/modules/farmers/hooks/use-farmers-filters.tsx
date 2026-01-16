import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useCallback } from "react";

export const useFarmersFilters = () => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault("").withOptions({ clearOnDefault: true }));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("limit", parseAsInteger.withDefault(10));

  const filters = { search, page, pageSize };

  const setFilters = useCallback((newFilters: Partial<typeof filters>) => {
      if (newFilters.search !== undefined) setSearch(newFilters.search);
      if (newFilters.page !== undefined) setPage(newFilters.page);
      if (newFilters.pageSize !== undefined) setPageSize(newFilters.pageSize);
  }, [setSearch, setPage, setPageSize]);

  return [filters, setFilters] as const;
};
