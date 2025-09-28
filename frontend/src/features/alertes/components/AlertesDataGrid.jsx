// 📁 src/features/alertes/components/AlertesDataGrid.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import GlobalSkeleton from "@/shared/components/skeleton/GlobalSkeleton";

/**
 * DataGrid spécialisé pour les alertes
 * Mode server strict - pas de cache, rechargement direct
 */
export default function AlertesDataGrid({
  columns,
  fetchRows,
  resetKey,
  getRowId = (row) => row.id,
  initialPageSize = 20,
  pageSizeOptions = [20, 50, 100],
}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // ✅ FIXE: Refs pour éviter les appels multiples
  const loadingRef = useRef(false);
  const currentRequestRef = useRef(null);

  // Reset complet si resetKey change
  useEffect(() => {
    console.log("🔄 AlertesDataGrid reset:", resetKey);
    setRows([]);
    setPage(0);
    setRowCount(0);
    loadingRef.current = false;
    
    // Annuler la requête en cours si elle existe
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }
  }, [resetKey]);

  // ✅ FIXE: Chargement des données avec protection
  const loadData = useCallback(async () => {
    // Éviter les appels multiples
    if (loadingRef.current) {
      console.log("⏸️ Chargement déjà en cours, skip");
      return;
    }
    
    console.log("📊 AlertesDataGrid loadData:", { page, pageSize });
    
    loadingRef.current = true;
    setLoading(true);
    
    // Créer un objet de requête pour pouvoir l'annuler
    const requestRef = { cancelled: false };
    currentRequestRef.current = requestRef;
    
    try {
      const result = await fetchRows(page, pageSize);
      
      // Vérifier si la requête n'a pas été annulée
      if (requestRef.cancelled) {
        console.log("🚫 Requête annulée");
        return;
      }
      
      console.log("✅ Données reçues:", result);
      
      setRows(result.rows || []);
      setRowCount(result.total || 0);
    } catch (error) {
      if (!requestRef.cancelled) {
        console.error("❌ Erreur chargement alertes:", error);
        setRows([]);
        setRowCount(0);
      }
    } finally {
      if (!requestRef.cancelled) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [fetchRows, page, pageSize]); // ✅ FIXE: Pas de 'loading' dans les deps !

  // ✅ FIXE: Effect pour charger les données
  useEffect(() => {
    console.log("🚀 Déclenchement loadData");
    loadData();
    
    // Cleanup pour annuler la requête si l'effect change
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, [loadData]);

  // ✅ FIXE: Gestion pagination optimisée
  const handlePaginationChange = useCallback((paginationModel) => {
    const { page: newPage, pageSize: newPageSize } = paginationModel;
    
    console.log("📄 Changement pagination:", { 
      newPage, 
      newPageSize, 
      currentPage: page, 
      currentPageSize: pageSize 
    });
    
    // Éviter les updates inutiles
    if (newPage === page && newPageSize === pageSize) {
      return;
    }
    
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(0); // Reset à la première page
    } else if (newPage !== page) {
      setPage(newPage);
    }
  }, [page, pageSize]);

  // ✅ FIXE: Cleanup général au démontage
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, []);

  console.log("🎯 AlertesDataGrid render:", { 
    rows: rows.length, 
    rowCount, 
    loading, 
    page, 
    pageSize,
    columnsCount: columns.length,
    loadingRef: loadingRef.current
  });

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
          
          // Configuration pagination
          pagination
          paginationMode="server"
          pageSizeOptions={pageSizeOptions}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={handlePaginationChange}
          
          // Configuration
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          autoHeight={false}
          
          // Styles
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            backgroundColor: "white",
            height: "600px", // ✅ Hauteur un peu plus grande
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            },
            "& .MuiDataGrid-cell": {
              borderColor: "#f0f0f0",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#fafafa",
              borderBottom: "2px solid #e0e0e0",
            },
          }}
        />
      )}
    </Box>
  );
}