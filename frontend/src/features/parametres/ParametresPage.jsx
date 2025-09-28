// src/features/parametres/ParametresPage.jsx
import { useEffect, useState } from "react";
import { getTarifsVisibles, updateTarifsVisibles } from "@/api/parametresApi";
import { Box, Snackbar, Alert, Typography, Paper } from "@mui/material";
import ParametresTable from "./components/ParametresTable";

export default function ParametresPage() {
  const [tarifs, setTarifs] = useState([]);
  const [originalTarifs, setOriginalTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    severity: "success", 
    message: "" 
  });

  // Chargement initial des données
  useEffect(() => {
    const fetchTarifs = async () => {
      setLoading(true);
      try {
        const res = await getTarifsVisibles();
        const withIds = res.map((t) => ({ id: t.no_tarif, ...t }));
        setTarifs(withIds);
        setOriginalTarifs(withIds);
      } catch (err) {
        console.error("Erreur chargement paramètres globaux :", err);
        setSnackbar({ 
          open: true, 
          severity: "error", 
          message: "Erreur de chargement des tarifs." 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTarifs();
  }, []);

  // Gestion du toggle de visibilité
  const handleToggleVisible = (id) => {
    setTarifs((prev) => 
      prev.map((t) => 
        t.id === id ? { ...t, visible: !t.visible } : t
      )
    );
  };

  // Vérification des changements
  const hasChanges = () => {
    return tarifs.some((t, i) => t.visible !== originalTarifs[i]?.visible);
  };

  // Sauvegarde des modifications
  const handleSave = async () => {
    try {
      await updateTarifsVisibles(tarifs);
      setOriginalTarifs([...tarifs]); // Copie pour éviter les références
      setSnackbar({
        open: true,
        severity: "success",
        message: "Paramètres enregistrés avec succès.",
      });
    } catch (err) {
      console.error("Erreur update paramètres :", err);
      setSnackbar({ 
        open: true, 
        severity: "error", 
        message: "Erreur lors de l'enregistrement." 
      });
    }
  };

  // Fermeture du snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ px: 3, py: 2, maxWidth: 1200, margin: "0 auto" }}>
      {/* En-tête de la page */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          ⚙️ Paramètres des tarifs
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Gérez la visibilité des tarifs dans les comparatifs et le catalogue.
          Les tarifs masqués n'apparaîtront plus dans les interfaces utilisateur.
        </Typography>
      </Box>

      {/* Contenu principal */}
      <Paper sx={{ 
        p: 3, 
        borderRadius: 2, 
        border: "1px solid #e0e0e0",
        backgroundColor: "#fafafa"
      }}>
        {loading ? (
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            height: 400 
          }}>
            <Typography variant="h6" color="text.secondary">
              Chargement des paramètres...
            </Typography>
          </Box>
        ) : (
          <ParametresTable
            tarifs={tarifs}
            onToggleVisible={handleToggleVisible}
            onSave={handleSave}
            hasChanges={hasChanges()}
          />
        )}
      </Paper>

      {/* Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ width: "100%" }}
          onClose={handleCloseSnackbar}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}