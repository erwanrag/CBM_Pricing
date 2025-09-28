// frontend/src/shared/components/tables/EnhancedDataGrid.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Chip,
  Alert,
  LinearProgress
} from "@mui/material";
import { 
  Refresh as RefreshIcon, 
  FilterList as FilterIcon,
  Download as DownloadIcon 
} from "@mui/icons-material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

const PERFORMANCE_THRESHOLDS = {
  FAST: 200,      // < 200ms : rapide
  MEDIUM: 1000,   // 200-1000ms : moyen  
  SLOW: 1000      // > 1000ms : lent
};

/**
 * DataGrid amélioré avec monitoring performance, cache intelligent,
 * gestion d'erreurs robuste et UX optimisée pour 120k+ références
 */
export default function EnhancedDataGrid({
  // Props de base
  columns,
  fetchRows,
  title = "",
  
  // Configuration pagination
  pageSizeOptions = [25, 50, 100, 250, 500],
  initialPageSize = 100,
  
  // Configuration tri/filtres
  sortModel = [],
  filterModel = {},
  sortingMode = "server",
  
  // Événements
  onRowClick,
  onSortModelChange,
  onFilterModelChange,
  
  // Customisation
  getRowId = (row) => row.id || row.cod_pro,
  getRowClassName,
  
  // Cache et performance
  cacheKey,
  resetKey,
  enableVirtualization = true,
  enableExport = false,
  
  // États externes
  loading: externalLoading = false,
  error: externalError = null,
  
  ...otherProps
}) {
  // === États locaux ===
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance monitoring
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    averageTime: 0,
    requestCount: 0,
    slowQueries: 0
  });
  
  // Refs pour gestion concurrence
  const currentRequestRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const lastLoadParams = useRef(null);
  
  // === Cache intelligent ===
  const getCacheKey = useCallback((page, pageSize, filterModel, sortModel) => {
    return `${cacheKey || 'default'}_${page}_${pageSize}_${JSON.stringify(filterModel)}_${JSON.stringify(sortModel)}`;
  }, [cacheKey]);
  
  const getCachedData = useCallback((key) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < 30000) { // Cache 30s
      return cached.data;
    }
    return null;
  }, []);
  
  const setCachedData = useCallback((key, data) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Nettoyer le cache si trop gros (garder 20 entrées max)
    if (cacheRef.current.size > 20) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
  }, []);
  
  // === Reset du cache ===
  useEffect(() => {
    if (resetKey) {
      cacheRef.current.clear();
      setRows([]);
      setPage(0);
      setRowCount(0);
      setError(null);
    }
  }, [resetKey]);
  
  // === Chargement des données avec monitoring ===
  const loadData = useCallback(async (forceFetch = false) => {
    // Éviter les appels multiples
    if (currentRequestRef.current && !forceFetch) {
      return;
    }
    
    const requestParams = { page, pageSize, filterModel, sortModel };
    const requestKey = getCacheKey(page, pageSize, filterModel, sortModel);
    
    // Vérifier si on a déjà ces données
    if (!forceFetch && 
        lastLoadParams.current && 
        JSON.stringify(lastLoadParams.current) === JSON.stringify(requestParams)) {
      return;
    }
    
    // Vérifier le cache
    if (!forceFetch) {
      const cachedData = getCachedData(requestKey);
      if (cachedData) {
        setRows(cachedData.rows);
        setRowCount(cachedData.total);
        return;
      }
    }
    
    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Nouvelle requête
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    currentRequestRef.current = requestParams;
    
    setLoading(true);
    setError(null);
    
    const startTime = performance.now();
    
    try {
      console.log(`🔍 Chargement page ${page + 1}, taille ${pageSize}...`);
      
      const result = await fetchRows(
        page, 
        pageSize, 
        filterModel, 
        sortModel,
        { signal: abortController.signal }
      );
      
      // Vérifier que la requête n'a pas été annulée
      if (abortController.signal.aborted) {
        return;
      }
      
      const endTime = performance.now();
      const requestTime = endTime - startTime;
      
      // Mise à jour des stats de performance
      setLastRequestTime(requestTime);
      setPerformanceStats(prev => {
        const newCount = prev.requestCount + 1;
        const newAverage = (prev.averageTime * prev.requestCount + requestTime) / newCount;
        const newSlowQueries = requestTime > PERFORMANCE_THRESHOLDS.SLOW ? 
          prev.slowQueries + 1 : prev.slowQueries;
        
        return {
          averageTime: newAverage,
          requestCount: newCount,
          slowQueries: newSlowQueries
        };
      });
      
      // Validation des données
      if (!result || typeof result !== 'object') {
        throw new Error('Format de réponse invalide');
      }
      
      const validatedRows = Array.isArray(result.rows) ? result.rows : [];
      const validatedTotal = typeof result.total === 'number' ? result.total : 0;
      
      // Mise à jour des états
      setRows(validatedRows);
      setRowCount(validatedTotal);
      
      // Mise en cache
      setCachedData(requestKey, {
        rows: validatedRows,
        total: validatedTotal
      });
      
      lastLoadParams.current = requestParams;
      
      console.log(`✅ Chargement terminé: ${validatedRows.length}/${validatedTotal} en ${requestTime.toFixed(0)}ms`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🔄 Requête annulée');
        return;
      }
      
      console.error('❌ Erreur chargement:', error);
      setError(error.message || 'Erreur de chargement');
      setRows([]);
      setRowCount(0);
      
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, [page, pageSize, filterModel, sortModel, fetchRows, getCacheKey, getCachedData, setCachedData]);
  
  // === Effets ===
  useEffect(() => {
    loadData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);
  
  // === Handlers ===
  const handlePaginationChange = useCallback((paginationModel) => {
    const { page: newPage, pageSize: newPageSize } = paginationModel;
    
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(0);
    } else if (newPage !== page) {
      setPage(newPage);
    }
  }, [page, pageSize]);
  
  const handleSortModelChange = useCallback((newSortModel) => {
    if (onSortModelChange) {
      onSortModelChange(newSortModel);
    }
    setPage(0); // Reset à la première page lors du tri
  }, [onSortModelChange]);
  
  const handleFilterModelChange = useCallback((newFilterModel) => {
    if (onFilterModelChange) {
      onFilterModelChange(newFilterModel);
    }
    setPage(0); // Reset à la première page lors du filtrage
  }, [onFilterModelChange]);
  
  const handleRefresh = useCallback(() => {
    cacheRef.current.clear();
    loadData(true);
  }, [loadData]);
  
  // === Export ===
  const handleExport = useCallback(async () => {
    try {
      const allData = await fetchRows(0, rowCount, filterModel, sortModel);
      
      // Préparer les données CSV
      const csvHeaders = columns.map(col => col.headerName || col.field).join(',');
      const csvRows = allData.rows.map(row => 
        columns.map(col => {
          const value = row[col.field];
          return typeof value === 'string' && value.includes(',') ? 
            `"${value}"` : value;
        }).join(',')
      );
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      // Télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (error) {
      console.error('Erreur export:', error);
    }
  }, [fetchRows, rowCount, filterModel, sortModel, columns, title]);
  
  // === Mémorisation ===
  const paginationModel = useMemo(() => ({
    page,
    pageSize
  }), [page, pageSize]);
  
  const performanceIndicator = useMemo(() => {
    if (lastRequestTime === 0) return null;
    
    let color = 'success';
    let label = 'Rapide';
    
    if (lastRequestTime > PERFORMANCE_THRESHOLDS.SLOW) {
      color = 'error';
      label = 'Lent';
    } else if (lastRequestTime > PERFORMANCE_THRESHOLDS.MEDIUM) {
      color = 'warning';
      label = 'Moyen';
    }
    
    return (
      <Chip 
        size="small"
        color={color}
        label={`${label} (${lastRequestTime.toFixed(0)}ms)`}
        sx={{ ml: 1 }}
      />
    );
  }, [lastRequestTime]);
  
  const gridStyles = useMemo(() => ({
    border: "1px solid #e0e0e0",
    borderRadius: 2,
    backgroundColor: "white",
    minHeight: 400,
    
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#f8f9fa",
      borderBottom: "2px solid #e0e0e0",
      fontWeight: 600,
      fontSize: "0.875rem"
    },
    
    "& .MuiDataGrid-row": {
      "&:hover": {
        backgroundColor: "rgba(25, 118, 210, 0.04)",
        cursor: onRowClick ? "pointer" : "default"
      },
      "&.Mui-selected": {
        backgroundColor: "rgba(25, 118, 210, 0.08)",
        "&:hover": {
          backgroundColor: "rgba(25, 118, 210, 0.12)"
        }
      }
    },
    
    "& .MuiDataGrid-cell": {
      borderColor: "#f0f0f0",
      fontSize: "0.875rem",
      "&:focus": {
        outline: "2px solid rgba(25, 118, 210, 0.2)",
        outlineOffset: "-1px"
      }
    },
    
    "& .MuiDataGrid-virtualScroller": {
      minHeight: enableVirtualization ? 300 : "auto"
    },
    
    // Optimisations performance pour grands volumes
    ...(enableVirtualization && {
      "& .MuiDataGrid-renderingZone": {
        maxHeight: "none"
      },
      "& .MuiDataGrid-row": {
        maxHeight: "none"
      }
    })
  }), [onRowClick, enableVirtualization]);
  
  // === Rendu ===
  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec actions */}
      {title && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {performanceIndicator}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {enableExport && rowCount > 0 && (
              <Tooltip title="Exporter en CSV">
                <IconButton onClick={handleExport} size="small">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Actualiser">
              <IconButton onClick={handleRefresh} size="small" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      
      {/* Statistiques de performance (dev only) */}
      {process.env.NODE_ENV === 'development' && performanceStats.requestCount > 0 && (
        <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, fontSize: '0.75rem' }}>
          📊 Perf: {performanceStats.requestCount} req, moy: {performanceStats.averageTime.toFixed(0)}ms
          {performanceStats.slowQueries > 0 && (
            <>, {performanceStats.slowQueries} lentes</>
          )}
        </Box>
      )}
      
      {/* Indicateur de chargement */}
      {(loading || externalLoading) && (
        <LinearProgress sx={{ mb: 1 }} />
      )}
      
      {/* Gestion d'erreur */}
      {(error || externalError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || externalError}
        </Alert>
      )}
      
      {/* DataGrid */}
      {loading && rows.length === 0 ? (
        <GlobalSkeleton height="60vh" />
      ) : (
        <DataGrid
          // Données
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          rowCount={rowCount}
          
          // Pagination serveur
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationChange}
          pageSizeOptions={pageSizeOptions}
          
          // Tri serveur
          sortingMode={sortingMode}
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          
          // Filtrage (si implémenté)
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={handleFilterModelChange}
          
          // États
          loading={loading || externalLoading}
          
          // Événements
          onRowClick={onRowClick}
          getRowClassName={getRowClassName}
          
          // Configuration UI
          density="compact"
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          autoHeight={false}
          
          // Performance
          rowHeight={52}
          headerHeight={56}
          {...(enableVirtualization && {
            rowBuffer: 10,
            columnBuffer: 5,
            rowThreshold: 0
          })}
          
          // Toolbar personnalisé
          slots={{
            toolbar: enableExport ? GridToolbar : null
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 }
            }
          }}
          
          // Localisation française
          localeText={{
            noRowsLabel: "Aucune donnée",
            noResultsOverlayLabel: "Aucun résultat trouvé",
            errorOverlayDefaultLabel: "Une erreur est survenue",
            
            // Pagination
            footerRowCount: (count) => 
              count !== 1 ? `${count.toLocaleString()} lignes` : `${count} ligne`,
            footerPaginationRowsPerPage: "Lignes par page:",
            
            // Tri
            columnHeaderSortIconLabel: "Trier",
            
            // Filtres
            filterPanelInputLabel: "Valeur",
            filterPanelColumns: "Colonnes",
            filterPanelOperators: "Opérateurs",
            
            // Toolbar
            toolbarExport: "Exporter",
            toolbarExportLabel: "Exporter",
            toolbarExportCSV: "Télécharger en CSV",
            toolbarQuickFilterPlaceholder: "Rechercher...",
            
            // Dense
            toolbarDensity: "Densité",
            toolbarDensityLabel: "Densité",
            toolbarDensityCompact: "Compact",
            toolbarDensityStandard: "Standard",
            toolbarDensityComfortable: "Confortable"
          }}
          
          // Styles
          sx={gridStyles}
          
          // Props supplémentaires
          {...otherProps}
        />
      )}
      
      {/* Informations de debug (dev uniquement) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ 
          mt: 1, 
          p: 1, 
          bgcolor: '#f9f9f9', 
          borderRadius: 1, 
          fontSize: '0.75rem',
          color: '#666'
        }}>
          🔧 Debug: {rows.length}/{rowCount} lignes, page {page + 1}, cache: {cacheRef.current.size} entrées
        </Box>
      )}
    </Box>
  );
}