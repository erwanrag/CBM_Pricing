// 📁 src/features/dashboard/components/DashboardDataGrid.jsx - Debug optimisé
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

export default function DashboardDataGrid({
  columns,
  fetchRows,
  resetKey,
  getRowId = (row) => row.id,
  initialPageSize = 20,
  pageSizeOptions = [20, 50, 100],
  onRowClick,
  getRowClassName,
  selectedCodPro,
  clickedCodPro,
}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const loadingRef = useRef(false);
  const currentRequestRef = useRef(null);
  const lastResetKeyRef = useRef(resetKey);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Reset complet si resetKey change
  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      setRows([]);
      setPage(0);
      setRowCount(0);
      loadingRef.current = false;
      
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    }
  }, [resetKey]);

  /// Chargement des données optimisé
  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    const requestRef = { cancelled: false };
    currentRequestRef.current = requestRef;
    
    try {
      console.log("DashboardDataGrid loadData - début");
      const result = await fetchRows(page, pageSize);
      console.log("DashboardDataGrid loadData - résultat:", result);
      
      if (requestRef.cancelled) return;
      
      setRows(result.rows || []);
      setRowCount(result.total || 0);
      console.log("DashboardDataGrid - données définies:", {
        rows_count: result.rows?.length,
        total: result.total
      });
    } catch (error) {
      if (!requestRef.cancelled) {
        console.error("Erreur chargement dashboard:", error);
        setRows([]);
        setRowCount(0);
      }
    } finally {
      if (!requestRef.cancelled) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [fetchRows, page, pageSize]);

  // Effect pour charger les données
  useEffect(() => {
    loadData();
    
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, [loadData]);

  // Gestion pagination
  const handlePaginationChange = useCallback((paginationModel) => {
    const { page: newPage, pageSize: newPageSize } = paginationModel;
    
    if (newPage === page && newPageSize === pageSize) return;
    
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(0);
    } else if (newPage !== page) {
      setPage(newPage);
    }
  }, [page, pageSize]);

  // Cleanup général au démontage
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, []);

  // Mémorisation du modèle de pagination
  const paginationModel = useMemo(() => ({
    page,
    pageSize
  }), [page, pageSize]);

  // Styles mémorisés
  const gridStyles = useMemo(() => ({
    border: "1px solid #e0e0e0",
    borderRadius: 1,
    backgroundColor: "white",
    minHeight: "400px",
    height: "auto",
    maxHeight: "80vh",
    "& .MuiDataGrid-root": {
      minHeight: "400px",
    },
    "& .MuiDataGrid-row": {
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        cursor: "pointer",
      },
      "&.highlighted-row": {
        backgroundColor: "#fff8dc !important",
        "&:hover": {
          backgroundColor: "#f5f5dc !important",
        },
      },
    },
    "& .MuiDataGrid-cell": {
      borderColor: "#f0f0f0",
    },
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#fafafa",
      borderBottom: "2px solid #e0e0e0",
      fontWeight: 600,
    },
    "& .MuiDataGrid-virtualScroller": {
      minHeight: "300px",
    },
  }), []);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {loading && rows.length === 0 ? (
        <GlobalSkeleton height="60vh" />
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          rowCount={rowCount}
          
          pagination
          paginationMode="server"
          pageSizeOptions={pageSizeOptions}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationChange}
          
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          autoHeight={false}
          onRowClick={onRowClick}
          getRowClassName={getRowClassName}
          
          sx={gridStyles}
        />
      )}
    </Box>
  );
}