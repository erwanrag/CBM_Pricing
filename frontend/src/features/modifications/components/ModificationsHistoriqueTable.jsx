// src/features/modifications/components/ModificationsHistoriqueTable.jsx
import React, { useMemo, useCallback } from "react";
import { Box, Typography, Chip } from "@mui/material";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";
import { formatPrix } from "@/lib/format";
import { fetchHistoriqueModifications } from "@/api/tarifModificationsApi";

export default function ModificationsHistoriqueTable({ cod_pro, no_tarif }) {
  
  // Configuration des colonnes
  const columns = useMemo(() => [
    { 
      field: "cod_pro", 
      headerName: "Code Produit", 
      width: 130,
      sortable: true
    },
    { 
      field: "refint", 
      headerName: "Réf. Interne", 
      width: 140,
      sortable: true
    },
    { 
      field: "no_tarif", 
      headerName: "Tarif", 
      width: 80,
      type: "number",
      align: "center",
      headerAlign: "center",
      sortable: true
    },
    { 
      field: "ancien_prix", 
      headerName: "Ancien Prix", 
      width: 120,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <span style={{ color: "#d32f2f", fontWeight: 500 }}>
          {formatPrix(value)}
        </span>
      )
    },
    { 
      field: "nouveau_prix", 
      headerName: "Nouveau Prix", 
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => (
        <span style={{ color: "#2e7d32", fontWeight: 600 }}>
          {formatPrix(value)}
        </span>
      )
    },
    { 
      field: "ancienne_marge", 
      headerName: "Ancienne Marge", 
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => {
        if (!value && value !== 0) return "-";
        const percentage = (value * 100).toFixed(1);
        return (
          <span style={{ color: "#d32f2f" }}>
            {percentage}%
          </span>
        );
      }
    },
    { 
      field: "marge_simulee", 
      headerName: "Marge Simulée", 
      width: 130,
      type: "number",
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => {
        if (!value && value !== 0) return "-";
        const percentage = parseFloat(value).toFixed(1);
        return (
          <span style={{ color: "#2e7d32", fontWeight: 500 }}>
            {percentage}%
          </span>
        );
      }
    },
    { 
      field: "statut_utilisateur", 
      headerName: "Statut", 
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: ({ value }) => {
        let color = "default";
        let label = value || "N/A";
        
        switch (value) {
          case "VALIDE":
            color = "success";
            label = "Validé";
            break;
          case "EN_ATTENTE":
            color = "warning";
            label = "En attente";
            break;
          case "REJETE":
            color = "error";
            label = "Rejeté";
            break;
        }
        
        return (
          <Chip 
            label={label} 
            color={color} 
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        );
      }
    },
    { 
      field: "commentaire_utilisateur", 
      headerName: "Commentaire", 
      width: 220,
      renderCell: ({ value }) => (
        <div title={value} style={{ 
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap",
          maxWidth: "100%"
        }}>
          {value || "-"}
        </div>
      )
    },
    { 
      field: "date_modification", 
      headerName: "Date", 
      width: 140,
      valueGetter: (params) => {
        if (!params.value) return null;
        return new Date(params.value);
      },
      renderCell: ({ value }) => {
        if (!value) return "-";
        const date = value instanceof Date ? value : new Date(value);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    { 
      field: "utilisateur", 
      headerName: "Utilisateur", 
      width: 140,
      renderCell: ({ value }) => (
        <span style={{ fontWeight: 500 }}>
          {value || "N/A"}
        </span>
      )
    },
  ], []);

  // Fonction de récupération des données avec gestion des filtres
  const fetchRows = useCallback(async (page, pageSize, filterModel, sortModel) => {
    try {
      const response = await fetchHistoriqueModifications({
        cod_pro,
        no_tarif,
        page: page + 1, // L'API attend page basée sur 1
        page_size: pageSize,
        sort_by: sortModel?.[0]?.field || "date_modification",
        sort_order: sortModel?.[0]?.sort || "desc"
      });
      
      return {
        rows: response?.rows || [],
        total: response?.total || 0,
      };
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique :", error);
      return { rows: [], total: 0 };
    }
  }, [cod_pro, no_tarif]);

  // Clé de reset pour forcer le rechargement quand les filtres changent
  const resetKey = useMemo(() => {
    return `${cod_pro || ""}-${no_tarif || ""}-${Date.now()}`;
  }, [cod_pro, no_tarif]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec indication des filtres actifs */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Historique des modifications tarifaires
        </Typography>
        
        {(cod_pro || no_tarif) && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Filtres actifs :
            </Typography>
            {cod_pro && (
              <Chip 
                label={`Code: ${cod_pro}`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
            {no_tarif && (
              <Chip 
                label={`Tarif: ${no_tarif}`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary">
          Les modifications sont triées par date (plus récentes en premier)
        </Typography>
      </Box>

      {/* Table paginée */}
      <PaginatedDataGrid
        key={resetKey}
        columns={columns}
        fetchRows={fetchRows}
        initialPageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        getRowId={(row) => `${row.cod_pro}-${row.no_tarif}-${row.date_modification}`}
        
        // Configuration du tri
        sortModel={[{ field: "date_modification", sort: "desc" }]}
        sortingMode="server"
        onSortModelChange={() => {}} // Géré dans fetchRows
        
        // Configuration des filtres
        filterModel={{ items: [] }}
        onFilterChange={() => {}} // Pas de filtres supplémentaires pour l'instant
        
        // Styles personnalisés
        sx={{
          "& .MuiDataGrid-row": {
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            }
          },
          "& .MuiDataGrid-cell": {
            borderColor: "#f0f0f0",
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "#fafafa",
            fontWeight: 600,
          }
        }}
      />
    </Box>
  );
}