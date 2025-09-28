// src/features/parametres/components/ParametresTable.jsx
import React, { useMemo } from "react";
import { Box, Chip, Button, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "@/context/auth/useAuth";

export default function ParametresTable({
  tarifs = [],
  onToggleVisible,
  onSave,
  hasChanges = false,
}) {
  const { user } = useAuth();
  const editable = ["admin", "editor"].includes(user?.role);

  // Configuration des colonnes
  const columns = useMemo(() => [
    { 
      field: "no_tarif", 
      headerName: "N° Tarif", 
      width: 120,
      type: "number",
      align: "center",
      headerAlign: "center"
    },
    { 
      field: "nom_tarif", 
      headerName: "Nom tarif", 
      flex: 1,
      minWidth: 200
    },
    { 
      field: "devise", 
      headerName: "Devise", 
      width: 100,
      align: "center",
      headerAlign: "center"
    },
    {
      field: "visible",
      headerName: "Visible",
      width: 130,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Chip
          label={row.visible ? "Oui" : "Non"}
          color={row.visible ? "success" : "default"}
          variant="outlined"
          onClick={editable ? () => onToggleVisible(row.id) : undefined}
          sx={{ 
            cursor: editable ? "pointer" : "default",
            minWidth: 60,
            fontWeight: 600
          }}
          size="small"
        />
      ),
    },
  ], [editable, onToggleVisible]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec compteur */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          📊 Tarifs configurés – <strong>{tarifs.length}</strong> tarif(s)
        </Typography>
        
        {editable && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            💡 Cliquez sur les puces "Visible" pour activer/désactiver l'affichage des tarifs
          </Typography>
        )}
      </Box>

      {/* DataGrid */}
      <Box sx={{ 
        height: 500, 
        border: "1px solid #e0e0e0", 
        borderRadius: 2,
        backgroundColor: "white"
      }}>
        <DataGrid
          rows={tarifs}
          columns={columns}
          getRowId={(row) => row.no_tarif}
          
          // Configuration de base
          density="compact"
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooterSelectedRowCount
          
          // Pagination
          pageSizeOptions={[10, 20, 50, 100]}
          initialState={{
            pagination: { 
              paginationModel: { pageSize: 20, page: 0 } 
            },
            sorting: {
              sortModel: [{ field: 'no_tarif', sort: 'asc' }]
            }
          }}
          
          // Styles
          sx={{
            fontSize: "0.875rem",
            border: "none",
            
            // Style des lignes
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            },
            
            // Style des cellules
            "& .MuiDataGrid-cell": {
              borderColor: "#f0f0f0",
              "&:focus": {
                outline: "none",
              },
            },
            
            // Style de l'en-tête
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#fafafa",
              fontWeight: 600,
              "&:focus": {
                outline: "none",
              },
            },
            
            // Style de la pagination
            "& .MuiTablePagination-displayedRows": {
              fontWeight: 600,
              color: "#333",
            },
            
            // Supprimer les bordures par défaut
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          }}
        />
      </Box>

      {/* Bouton de sauvegarde (seulement si éditable) */}
      {editable && (
        <Box sx={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          mt: 2,
          pt: 2,
          borderTop: "1px solid #e0e0e0"
        }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={onSave} 
            disabled={!hasChanges}
            startIcon={<span>💾</span>}
            sx={{
              fontWeight: 600,
              minWidth: 140,
              "&:disabled": {
                backgroundColor: "#f5f5f5",
                color: "#999",
              }
            }}
          >
            Enregistrer
          </Button>
        </Box>
      )}
    </Box>
  );
}