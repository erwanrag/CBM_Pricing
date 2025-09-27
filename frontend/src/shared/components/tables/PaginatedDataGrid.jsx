import React, { useEffect, useRef, useState, useCallback } from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

/**
 * DataGrid avec pagination et tri côté serveur
 * Le tri s'applique sur TOUTES les données côté backend
 */
export default function PaginatedDataGrid({
  columns,
  fetchRows,
  filterModel,
  onFilterChange,
  onRowClick,
  pageSizeOptions = [20, 50, 100, 200, 500],
  initialPageSize = 100,
  getRowId = (row) => row.id,
  getRowClassName,
  resetKey,
  sortModel = [],
  sortingMode = "server",
  onSortModelChange,
  mode = "server", // Par défaut, mode serveur pour CompareTarif
  loading: externalLoading,
}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Pour éviter les appels multiples
  const lastRequestId = useRef(0);
  const activeRequest = useRef(null);

  // Reset complet si resetKey change
  useEffect(() => {
    setRows([]);
    setPage(0);
    setRowCount(0);
    setLoading(false);
    lastRequestId.current = 0;
    if (activeRequest.current) {
      activeRequest.current = null;
    }
  }, [resetKey]);

  // Fonction de chargement des données
  const loadData = useCallback(async () => {
    // Générer un ID unique pour cette requête
    const requestId = ++lastRequestId.current;
    
    // Annuler si une requête est déjà en cours
    if (activeRequest.current) {
      return;
    }
    
    activeRequest.current = requestId;
    setLoading(true);
    
    try {
      // Appel au backend avec les paramètres de tri et pagination
      const result = await fetchRows(page, pageSize, filterModel, sortModel);
      
      // Vérifier que cette requête est toujours la plus récente
      if (requestId === lastRequestId.current) {
        // Mise à jour des données
        setRows(result.rows || []);
        setRowCount(result.total || 0);
      }
    } catch (error) {
      console.error("Erreur chargement données:", error);
      if (requestId === lastRequestId.current) {
        setRows([]);
        setRowCount(0);
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, [page, pageSize, filterModel, sortModel, fetchRows]);

  // Charger les données quand les paramètres changent
  useEffect(() => {
    // Petit délai pour éviter les appels trop rapides lors des changements multiples
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadData]);

  // Gestion du changement de page/taille
  const handlePaginationModelChange = useCallback(({ page: newPage, pageSize: newPageSize }) => {
    let hasChanged = false;
    
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(0); // Retour à la première page si on change la taille
      hasChanged = true;
    } else if (newPage !== page) {
      setPage(newPage);
      hasChanged = true;
    }
    
    // Les données seront rechargées automatiquement via useEffect
  }, [page, pageSize]);

  // Gestion du changement de tri
  const handleSortModelChange = useCallback((model) => {
    // IMPORTANT: Le tri se fait côté serveur
    // On remet à la page 0 pour voir les premiers résultats triés
    setPage(0);
    onSortModelChange?.(model);
  }, [onSortModelChange]);

  // Gestion du changement de filtre
  const handleFilterModelChange = useCallback((model) => {
    setPage(0); // Retour à la première page
    onFilterChange?.(model);
  }, [onFilterChange]);

  const isLoading = loading || externalLoading;

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {isLoading && rows.length === 0 ? (
        <GlobalSkeleton height="60vh" />
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          rowCount={rowCount}
          
          // Configuration de la pagination
          pagination
          paginationMode="server"
          pageSizeOptions={pageSizeOptions}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={handlePaginationModelChange}
          
          // Configuration du tri côté serveur
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          
          // Configuration des filtres
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={handleFilterModelChange}
          
          // Autres configurations
          onRowClick={onRowClick}
          loading={isLoading}
          density="compact"
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          autoHeight={false}
          
          // Toolbar avec recherche rapide
          slots={{ 
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
            pagination: {
              labelRowsPerPage: "Lignes par page:",
              labelDisplayedRows: ({ from, to, count }) => {
                return `${from}–${to} sur ${count !== -1 ? count : `plus de ${to}`}`;
              },
            },
          }}
          
          // Styles
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            backgroundColor: "white",
            height: "calc(100vh - 300px)", // Ajuster selon votre layout
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            },
            "& .MuiDataGrid-cell": {
              borderColor: "#f0f0f0",
            },
            // Style pour la pagination
            "& .MuiTablePagination-displayedRows": {
              fontWeight: 600,
              color: "#333",
            },
          }}
          
          getRowClassName={getRowClassName}
          
          // Optimisations performances
          columnBuffer={5}
          rowBuffer={10}
          disableVirtualization={false}
        />
      )}
    </Box>
  );
}