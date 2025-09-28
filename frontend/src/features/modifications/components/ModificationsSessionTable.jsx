// src/features/modifications/components/ModificationsSessionTable.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, TextField, Typography, IconButton, Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { toast } from "react-toastify";

export default function ModificationsSessionTable({ rows, onUpdate, onDelete }) {
  const navigate = useNavigate();
  
  // Transformation des données avec ID unique
  const rowsWithId = useMemo(() => {
    return rows.map((row, i) => ({ id: i, ...row }));
  }, [rows]);

  // Configuration des colonnes
  const columns = useMemo(() => [
    { 
      field: "cod_pro", 
      headerName: "Code Produit", 
      width: 130,
      sortable: false
    },
    { 
      field: "refint", 
      headerName: "Référence", 
      width: 140,
      sortable: false,
      renderCell: ({ row }) => {
        // Afficher la vraie refint si disponible, sinon le cod_pro
        return <span>{row.refint && row.refint !== row.cod_pro ? row.refint : `COD_${row.cod_pro}`}</span>;
      }
    },
    { 
      field: "no_tarif", 
      headerName: "Tarif", 
      width: 80,
      type: "number",
      align: "center",
      headerAlign: "center",
      sortable: false,
      editable: true
    },
    {
      field: "nouveau_prix",
      headerName: "Nouveau Prix (€)",
      width: 140,
      editable: true,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => {
        // Gérer l'affichage des prix directement dans renderCell
        if (value === null || value === undefined || value === "") {
          return <span>-</span>;
        }
        
        const num = parseFloat(value);
        if (isNaN(num)) return <span>-</span>;
        
        return (
          <span>
            {new Intl.NumberFormat('fr-FR', {
              style: 'decimal',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(num)} €
          </span>
        );
      },
      // Garder le valueFormatter pour l'édition
      valueFormatter: (value) => {
        if (value === null || value === undefined || value === "") return "";
        const num = parseFloat(value);
        if (isNaN(num)) return "";
        return num.toString();
      }
    },
    {
      field: "marge_simulee",
      headerName: "Marge (%)",
      width: 110,
      editable: true,
      align: "right",
      headerAlign: "right",
      renderCell: ({ value }) => {
        // Gérer l'affichage des marges directement dans renderCell
        if (!value || value === "") return <span>-</span>;
        
        const num = parseFloat(value);
        if (isNaN(num)) return <span>-</span>;
        
        return <span>{num.toFixed(1)}%</span>;
      },
      // Garder le valueFormatter pour l'édition
      valueFormatter: (value) => {
        if (!value || value === "") return "";
        const num = parseFloat(value);
        if (isNaN(num)) return "";
        return num.toString();
      }
    },
    {
      field: "date_prix",
      headerName: "Date d'application",
      width: 150,
      editable: true,
      renderCell: ({ value }) => {
        // Gérer l'affichage des dates directement dans renderCell
        if (!value) return <span>-</span>;
        
        let date;
        if (value instanceof Date) {
          date = value;
        } else if (typeof value === 'string') {
          // Si c'est une string au format YYYY-MM-DD
          date = new Date(value + 'T00:00:00');
        } else {
          return <span>-</span>;
        }
        
        // Vérifier que la date est valide
        if (isNaN(date.getTime())) return <span>-</span>;
        
        return <span>{date.toLocaleDateString('fr-FR')}</span>;
      },
      renderEditCell: (params) => {
        // Convertir la valeur pour l'édition
        let dateValue = "";
        if (params.value) {
          if (params.value instanceof Date) {
            dateValue = params.value.toISOString().split('T')[0];
          } else if (typeof params.value === 'string') {
            // Si c'est déjà au format YYYY-MM-DD
            dateValue = params.value;
          }
        }
        
        return (
          <TextField
            type="date"
            value={dateValue}
            onChange={(e) => {
              params.api.setEditCellValue({
                id: params.id,
                field: "date_prix",
                value: e.target.value,
              }, e);
            }}
            size="small"
            fullWidth
            sx={{ 
              "& .MuiInputBase-root": { 
                fontSize: "0.875rem" 
              }
            }}
          />
        );
      },
    },
    { 
      field: "statut_utilisateur", 
      headerName: "Statut", 
      width: 120, 
      editable: true,
      type: "singleSelect",
      valueOptions: [
        { value: "EN_ATTENTE", label: "En attente" },
        { value: "VALIDE", label: "Validé" },
        { value: "REJETE", label: "Rejeté" }
      ]
    },
    { 
      field: "commentaire_utilisateur", 
      headerName: "Commentaire", 
      width: 200, 
      editable: true
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Voir la fiche produit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                navigate(`/dashboard?no_tarif=${row.no_tarif}&cod_pro=${row.cod_pro}&grouping_crn=1`);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Supprimer cette modification">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(row.cod_pro, row.no_tarif)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate, onDelete]);

  // Gestion des mises à jour de cellules
  const processRowUpdate = (updatedRow, oldRow) => {
    const index = updatedRow.id;
    const diffKey = Object.keys(updatedRow).find(
      (key) => updatedRow[key] !== oldRow[key]
    );
    
    if (diffKey) {
      onUpdate(index, diffKey, updatedRow[diffKey]);
      toast.info(`${diffKey === 'nouveau_prix' ? 'Prix' : diffKey === 'marge_simulee' ? 'Marge' : 'Champ'} mis à jour.`);
    }
    
    return updatedRow;
  };

  const handleProcessRowUpdateError = (error) => {
    console.error("Erreur mise à jour ligne:", error);
    toast.error("Erreur lors de la mise à jour");
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec compteur */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Modifications en cours – <strong>{rows.length}</strong> ligne(s)
        </Typography>
        
        {rows.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            Double-cliquez sur une cellule pour l'éditer. Les modifications sont sauvegardées automatiquement.
          </Typography>
        )}
      </Box>

      {/* DataGrid éditable */}
      <Box sx={{ 
        height: rows.length > 0 ? Math.min(500, (rows.length + 1) * 52 + 100) : 200,
        border: "1px solid #e0e0e0", 
        borderRadius: 2,
        backgroundColor: "white"
      }}>
        {rows.length === 0 ? (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: "100%",
            flexDirection: "column",
            gap: 2
          }}>
            <Typography variant="h6" color="text.secondary">
              Aucune modification en cours
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Utilisez le bouton "Ajouter une ligne" pour commencer
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={rowsWithId}
            columns={columns}
            
            // Édition
            processRowUpdate={processRowUpdate}
            onProcessRowUpdateError={handleProcessRowUpdateError}
            experimentalFeatures={{ newEditingApi: true }}
            
            // Configuration de base
            density="compact"
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            disableColumnMenu
            
            // Pagination
            initialState={{
              pagination: { 
                paginationModel: { pageSize: 25, page: 0 } 
              }
            }}
            pageSizeOptions={[10, 25, 50]}
            
            // Styles
            sx={{
              fontSize: "0.875rem",
              border: "none",
              
              "& .MuiDataGrid-row": {
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
                "&.Mui-selected": {
                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.12)",
                  }
                }
              },
              
              "& .MuiDataGrid-cell": {
                borderColor: "#f0f0f0",
                "&:focus": {
                  outline: "none",
                },
                "&.MuiDataGrid-cell--editable": {
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  }
                }
              },
              
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#fafafa",
                fontWeight: 600,
                "&:focus": {
                  outline: "none",
                },
              },
              
              "& .MuiDataGrid-columnSeparator": {
                display: "none",
              },
              
              "& .MuiDataGrid-cell--editing": {
                backgroundColor: "rgba(25, 118, 210, 0.1)",
              }
            }}
          />
        )}
      </Box>
    </Box>
  );
}