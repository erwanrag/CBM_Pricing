// src/features/modifications/components/ModificationsSessionTable.jsx
import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Button, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ModificationsSessionTable({ rows, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const rowsWithId = rows.map((row, i) => ({ id: i, ...row }));

  const handleCellEdit = (params) => {
    const { id, field, value } = params;
    onUpdate(id, field, value);
  };

  const columns = [
    { field: "cod_pro", headerName: "Code Produit", width: 120 },
    { field: "refint", headerName: "Référence", width: 140 },
    { field: "no_tarif", headerName: "Tarif", width: 90 },
    {
      field: "nouveau_prix",
      headerName: "Nouveau Prix (€)",
      width: 130,
      editable: true,
    },
    {
      field: "marge_simulee",
      headerName: "Marge (%)",
      width: 130,
      editable: true,
    },
    {
      field: "date_prix",
      headerName: "Date d'application",
      width: 150,
      editable: true,
      renderEditCell: (params) => (
        <TextField
          type="date"
          value={params.value || ""}
          onChange={(e) =>
            params.api.setEditCellValue(
              {
                id: params.id,
                field: "date_prix",
                value: e.target.value,
              },
              e,
            )
          }
          size="small"
        />
      ),
    },
    { field: "statut_utilisateur", headerName: "Statut", width: 120, editable: true },
    { field: "commentaire_utilisateur", headerName: "Commentaire", width: 180, editable: true },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      renderCell: ({ row }) => (
        <Button
          color="error"
          variant="outlined"
          size="small"
          onClick={() => onDelete(row.cod_pro, row.no_tarif)}
        >
          Supprimer
        </Button>
      ),
    },
    {
      field: "modifier",
      headerName: "Modifier",
      width: 110,
      renderCell: ({ row }) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            navigate(`/dashboard?cod_pro=${row.cod_pro}&no_tarif=${row.no_tarif}&modif=1`);
          }}
        >
          Fiche
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rowsWithId}
        columns={columns}
        processRowUpdate={(updatedRow, oldRow) => {
          const index = updatedRow.id;
          const diffKey = Object.keys(updatedRow).find(
            (key) => updatedRow[key] !== oldRow[key]
          );
          if (diffKey) {
            onUpdate(index, diffKey, updatedRow[diffKey]);
            toast.info("📝 Ligne mise à jour.");
          }
          return updatedRow;
        }}
        experimentalFeatures={{ newEditingApi: true }}
        pageSize={20}
        hideFooterSelectedRowCount
        density="compact"
      />
    </Box>
  );
}
