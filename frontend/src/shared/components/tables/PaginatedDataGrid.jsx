import React, { useEffect, useRef, useState, useCallback } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

/**
 * DataGrid générique avec 2 modes :
 * - mode="default" → cache + préchargement de 2 pages
 * - mode="strict" → chaque page/tri est rechargé directement depuis le backend
 */
export default function PaginatedDataGrid({
  columns,
  fetchRows,
  filterModel,
  onFilterChange,
  onRowClick,
  pageSizeOptions = [20, 50, 100],
  initialPageSize = 20,
  getRowId = (row) => row.id,
  getRowClassName,
  resetKey,
  sortModel,
  sortingMode,
  onSortModelChange,
  mode = "default",
  loading: externalLoading,
}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cache pour mode "default"
  const cache = useRef({});
  const loadingPages = useRef(new Set());

  // Reset si resetKey change
  useEffect(() => {
    cache.current = {};
    loadingPages.current.clear(); // ✅ Clear loading pages set
    setRows([]);
    setPage(0);
    setRowCount(0); // ✅ Reset row count
  }, [resetKey]);

  // ==== MODE STRICT (CompareTarif) ====
  const loadStrict = useCallback(async () => {
    if (loading) return; // ✅ Éviter les appels multiples
    
    setLoading(true);
    try {
      const res = await fetchRows(page, pageSize, filterModel, sortModel);
      setRows(res.rows || []);
      setRowCount(res.total || 0);
    } catch (e) {
      console.error("❌ Erreur chargement strict page", page, e);
      setRows([]); // ✅ Reset en cas d'erreur
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [fetchRows, page, pageSize, filterModel, sortModel]);

  // ==== MODE DEFAULT (avec cache / préchargement 2 pages) ====
  const loadDefault = useCallback(async (basePage) => {
    if (loadingPages.current.has(basePage)) return;
    
    loadingPages.current.add(basePage);

    try {
      const pagesToLoad = [basePage, basePage + 1];
      const missing = pagesToLoad.filter((p) => !cache.current[p]);
      
      if (missing.length === 0) {
        loadingPages.current.delete(basePage);
        return;
      }

      if (loading) {
        loadingPages.current.delete(basePage);
        return;
      }

      setLoading(true);
      
      const results = await Promise.all(
        missing.map((p) => fetchRows(p, pageSize, filterModel, sortModel))
      );
      
      results.forEach((res, i) => {
        if (!res) return;
        const p = missing[i];
        cache.current[p] = res.rows || [];
        
        if (i === 0) { // ✅ Set total only once
          setRowCount(res.total || 0);
        }
        
        setRows((prev) => {
          const updated = [...prev];
          (res.rows || []).forEach((r, rowIndex) => {
            const globalIndex = p * pageSize + rowIndex;
            updated[globalIndex] = r;
          });
          return updated;
        });
      });
    } catch (e) {
      console.error("❌ Erreur chargement bloc pages", basePage, e);
    } finally {
      loadingPages.current.delete(basePage);
      setLoading(false);
    }
  }, [fetchRows, pageSize, filterModel, sortModel]);

  // ✅ Séparer les useEffect pour éviter les boucles infinies
  useEffect(() => {
    if (mode === "strict") {
      loadStrict();
    }
  }, [mode, loadStrict]);

  useEffect(() => {
    if (mode === "default") {
      const basePage = Math.floor(page / 2) * 2;
      loadDefault(basePage);
    }
  }, [mode, page, loadDefault]);

  // ✅ Reset cache quand les filtres/tri changent en mode default
  useEffect(() => {
    if (mode === "default") {
      cache.current = {};
      loadingPages.current.clear();
      setRows([]);
      setPage(0);
      setRowCount(0);
    }
  }, [mode, filterModel, sortModel]);

  const visibleRows = React.useMemo(() => {
    if (mode === "strict") {
      return rows;
    }
    return rows.slice(page * pageSize, (page + 1) * pageSize);
  }, [mode, rows, page, pageSize]);

  return (
    <Box sx={{ width: "100%" }}>
      {(loading || externalLoading) && visibleRows.length === 0 ? (
        <GlobalSkeleton height="60vh" />
      ) : (
        <DataGrid
          rows={visibleRows}
          columns={columns}
          getRowId={getRowId}
          rowCount={rowCount}
          pagination
          paginationMode="server"
          pageSizeOptions={pageSizeOptions}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={({ page: newPage, pageSize: newPageSize }) => {
            if (newPage !== page) setPage(newPage);
            if (newPageSize !== pageSize) {
              setPageSize(newPageSize);
              if (mode === "default") {
                // ✅ Reset cache si taille de page change
                cache.current = {};
                setRows([]);
                setPage(0);
              }
            }
          }}
          filterModel={filterModel}
          onFilterModelChange={(model) => {
            onFilterChange?.(model);
            setPage(0);
          }}
          sortModel={sortModel}
          sortingMode={sortingMode}
          onSortModelChange={onSortModelChange}
          onRowClick={onRowClick}
          loading={loading || externalLoading}
          density="compact"
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          filterMode="server"
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            backgroundColor: "white",
          }}
          getRowClassName={getRowClassName}
        />
      )}
    </Box>
  );
}