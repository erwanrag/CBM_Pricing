// 📁 src/features/dashboard/components/DashboardDataGrid.jsx 
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";
import { debounce } from "lodash";

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
  
  // PROTECTION CONTRE LES APPELS MULTIPLES
  const loadingRef = useRef(false);
  const currentRequestRef = useRef(null);
  const lastResetKeyRef = useRef(resetKey);
  const lastRequestParamsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // OPTIMISATION: Reset complet si resetKey change VRAIMENT
  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      if (isDevelopment) {
        console.log("🔄 DashboardDataGrid RESET - resetKey changed");
      }
      
      lastResetKeyRef.current = resetKey;
      setRows([]);
      setPage(0);
      setRowCount(0);
      setLoading(false);
      loadingRef.current = false;
      lastRequestParamsRef.current = null;
      
      // Annuler toute requête en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
        currentRequestRef.current = null;
      }
    }
  }, [resetKey, isDevelopment]);

  // OPTIMISATION CRITIQUE: Chargement des données avec protection multiple
  const loadData = useCallback(async () => {
    const requestParams = `${page}-${pageSize}`;
    
    // PROTECTION 1: Si déjà en cours
    if (loadingRef.current) {
      if (isDevelopment) {
        console.log("⚠️ DashboardDataGrid - Requête déjà en cours, abandon");
      }
      return;
    }
    
    // PROTECTION 2: Si paramètres identiques à la dernière requête
    if (lastRequestParamsRef.current === requestParams) {
      if (isDevelopment) {
        console.log("⚠️ DashboardDataGrid - Paramètres identiques, abandon");
      }
      return;
    }
    
    // PROTECTION 3: Annuler requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    loadingRef.current = true;
    setLoading(true);
    
    const requestRef = { cancelled: false };
    currentRequestRef.current = requestRef;
    lastRequestParamsRef.current = requestParams;
    
    try {
      if (isDevelopment) {
        console.log("🚀 DashboardDataGrid loadData - START:", { page, pageSize });
      }
      
      const startTime = performance.now();
      const result = await fetchRows(page, pageSize);
      const endTime = performance.now();
      
      // Vérifier si la requête a été annulée
      if (requestRef.cancelled || abortController.signal.aborted) {
        if (isDevelopment) {
          console.log("🚫 DashboardDataGrid - Requête annulée");
        }
        return;
      }
      
      // Validation des données
      if (!result || typeof result !== 'object') {
        throw new Error('Format de réponse invalide');
      }
      
      const validRows = Array.isArray(result.rows) ? result.rows : [];
      const validTotal = typeof result.total === 'number' ? result.total : 0;
      
      setRows(validRows);
      setRowCount(validTotal);
      
      if (isDevelopment) {
        console.log("✅ DashboardDataGrid loadData - SUCCESS:", {
          rows_count: validRows.length,
          total: validTotal,
          duration_ms: Math.round(endTime - startTime)
        });
      }
      
    } catch (error) {
      if (abortController.signal.aborted) {
        if (isDevelopment) {
          console.log("🚫 DashboardDataGrid - Requête aborted");
        }
        return;
      }
      
      if (!requestRef.cancelled) {
        console.error("❌ Erreur chargement dashboard:", error);
        setRows([]);
        setRowCount(0);
      }
    } finally {
      if (!requestRef.cancelled && !abortController.signal.aborted) {
        setLoading(false);
        loadingRef.current = false;
        currentRequestRef.current = null;
      }
    }
  }, [fetchRows, page, pageSize, isDevelopment]);

  // OPTIMISATION: Debounce du chargement pour éviter les appels en rafale
  const debouncedLoadData = useMemo(
    () => debounce(loadData, 150), // 150ms de debounce
    [loadData]
  );

  // Effect pour charger les données avec debounce
  useEffect(() => {
    debouncedLoadData();
    
    // Cleanup: annuler le debounce et les requêtes
    return () => {
      debouncedLoadData.cancel();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, [debouncedLoadData]);

  // OPTIMISATION: Gestion pagination avec protection
  const handlePaginationChange = useCallback((paginationModel) => {
    const { page: newPage, pageSize: newPageSize } = paginationModel;
    
    // Protection contre les changements identiques
    if (newPage === page && newPageSize === pageSize) {
      return;
    }
    
    if (isDevelopment) {
      console.log("📄 DashboardDataGrid - Pagination change:", { 
        from: { page, pageSize }, 
        to: { page: newPage, pageSize: newPageSize } 
      });
    }
    
    // Annuler toute requête en cours avant de changer les paramètres
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }
    
    loadingRef.current = false;
    lastRequestParamsRef.current = null;
    
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(0);
    } else if (newPage !== page) {
      setPage(newPage);
    }
  }, [page, pageSize, isDevelopment]);

  // Cleanup général au démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
      
      debouncedLoadData.cancel();
    };
  }, [debouncedLoadData]);

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

  // OPTIMISATION: Détection des changements de props pour éviter les re-renders inutiles
  const propsSignature = useMemo(() => ({
    columnsLength: columns?.length,
    selectedCodPro,
    clickedCodPro,
    resetKey
  }), [columns?.length, selectedCodPro, clickedCodPro, resetKey]);

  const lastPropsRef = useRef(propsSignature);
  
  if (JSON.stringify(lastPropsRef.current) !== JSON.stringify(propsSignature)) {
    lastPropsRef.current = propsSignature;
    if (isDevelopment) {
      console.log("🔄 DashboardDataGrid - Props changed:", propsSignature);
    }
  }

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
          
          // OPTIMISATION: Désactiver certaines features coûteuses
          disableColumnFilter
          disableColumnSelector
          disableDensitySelector
          
          // OPTIMISATION: Performance pour grands datasets
          rowBuffer={5}
          columnBuffer={2}
          rowThreshold={3}
          
          sx={gridStyles}
        />
      )}
      
      {/* Debug info en développement */}
      {isDevelopment && (
        <Box sx={{ 
          mt: 1, 
          p: 1, 
          bgcolor: '#f0f8ff', 
          borderRadius: 1, 
          fontSize: '0.75rem',
          color: '#666' 
        }}>
          🐛 Debug: {rows.length}/{rowCount} lignes, page {page + 1}/{Math.ceil(rowCount/pageSize) || 1}, loading: {loading ? 'yes' : 'no'}
        </Box>
      )}
    </Box>
  );
}