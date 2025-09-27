// src/features/parametres/ParametresPage.jsx
import { useEffect, useState } from "react";
import { getTarifsVisibles, updateTarifsVisibles } from "@/api/parametresApi";
import { Box, Button, Chip, Snackbar, Alert, Typography, Paper, Divider } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAuth } from "@/context/auth/useAuth";

export default function ParametresPage() {
  const [tarifs, setTarifs] = useState([]);
  const [originalTarifs, setOriginalTarifs] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const { user } = useAuth();
  const editable = ["admin", "editor"].includes(user?.role);

  useEffect(() => {
    const fetchTarifs = async () => {
      try {
        const res = await getTarifsVisibles();
        const withIds = res.map((t) => ({ id: t.no_tarif, ...t }));
        setTarifs(withIds);
        setOriginalTarifs(withIds);
      } catch (err) {
        console.error("Erreur chargement paramètres globaux :", err);
        setSnackbar({ open: true, severity: "error", message: "Erreur de chargement des tarifs." });
      }
    };
    fetchTarifs();
  }, []);

  const handleToggle = (id) => {
    setTarifs((prev) => prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)));
  };

  const hasChanges = () => tarifs.some((t, i) => t.visible !== originalTarifs[i]?.visible);

  const save = async () => {
    try {
      await updateTarifsVisibles(tarifs);
      setOriginalTarifs(tarifs);
      setSnackbar({
        open: true,
        severity: "success",
        message: "Paramètres enregistrés avec succès.",
      });
    } catch (err) {
      console.error("Erreur update paramètres :", err);
      setSnackbar({ open: true, severity: "error", message: "Erreur lors de l'enregistrement." });
    }
  };

  const columns = [
    { field: "no_tarif", headerName: "N° Tarif", width: 90 },
    { field: "nom_tarif", headerName: "Nom tarif", flex: 1 },
    { field: "devise", headerName: "Devise", width: 100 },
    {
      field: "visible",
      headerName: "Visible",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => (
        <Chip
          label={row.visible ? "Oui" : "Non"}
          color={row.visible ? "success" : "default"}
          variant="outlined"
          onClick={editable ? () => handleToggle(row.id) : undefined}
          sx={{ cursor: editable ? "pointer" : "default" }}
          size="small"
        />
      ),
    },
  ];

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        ⚙️ Paramètres des tarifs visibles
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Activez ou désactivez la visibilité des tarifs dans les comparatifs ou le catalogue.
      </Typography>

      <Paper sx={{ mt: 2, p: 2, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Box sx={{ height: 500 }}>
          <DataGrid
            rows={tarifs}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 20, page: 0 } },
            }}
            getRowId={(row) => row.no_tarif} 
            sx={{
              fontSize: "0.85rem",
              backgroundColor: "white",
            }}
          />
        </Box>

        {editable && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button variant="contained" color="primary" onClick={save} disabled={!hasChanges()}>
              💾 Enregistrer
            </Button>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
