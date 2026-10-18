import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAsync } from './useAsync.js';

// Server-side search/sort/pagination state for list pages. Search is debounced.
export function usePagedList(path, { filters = {}, defaultSort, pageSize = 20 } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [order, setOrder] = useState('desc');
  const filterKey = JSON.stringify(filters);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [filterKey]);

  const state = useAsync(
    () => api.get(path, { page, pageSize, search: debounced || undefined, sort, order, ...filters }),
    [path, page, pageSize, debounced, sort, order, filterKey],
  );

  const onSort = (key) => {
    if (key === sort) setOrder((o) => (o === 'asc' ? 'desc' : 'asc')); else { setSort(key); setOrder('asc'); }
    setPage(1);
  };

  return { ...state, rows: state.data?.data, total: state.data?.total ?? 0, totalPages: state.data?.totalPages ?? 1, page, setPage, search, setSearch, sort, order, onSort };
}
