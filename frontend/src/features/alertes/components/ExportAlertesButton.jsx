// 📁 src/features/alertes/components/ExportAlertesButton.jsx
import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { exportAlertes } from "@/api/exportApi";
import { toast } from "react-toastify";

export default function ExportAlertesButton({ filters }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    
    try {
      console.log("🚀 Export alertes avec filtres:", filters);
      
      // ✅ Téléchargement direct (pas de polling)
      await exportAlertes(filters);
      
      toast.success("Export téléchargé avec succès !");
    } catch (error) {
      console.error("❌ Erreur export alertes:", error);
      
      const errorMessage = error?.message || "Erreur inconnue lors de l'export";
      toast.error(`Erreur export : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outlined" 
      onClick={handleExport} 
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} /> : null}
      sx={{
        minWidth: 160,
        "&:disabled": {
          opacity: 0.6
        }
      }}
    >
      {loading ? "Export en cours..." : "📥 Exporter CSV"}
    </Button>
  );
}