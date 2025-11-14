// frontend/src/features/compare_tarif/components/ExportAsyncButton.jsx
import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import { exportCompareTarif } from "@/api/exportApi";

export default function ExportAsyncButton({ tarifs, filters }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    
    try {
      const payload = {
        tarifs,
        ...filters,
      };
      
      console.log("🚀 [Export CSV] Payload envoyé :", payload);
      
      // ✅ Téléchargement direct (pas de polling)
      await exportCompareTarif(payload);
      
      toast.success("Export téléchargé avec succès !");
    } catch (error) {
      console.error("❌ Erreur export:", error);
      toast.error("Erreur export : " + (error.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      onClick={handleExport}
      disabled={tarifs.length === 0 || loading}
      startIcon={loading ? <CircularProgress size={20} /> : null}
      sx={{
        minWidth: 140,
        "&:disabled": {
          opacity: 0.6
        }
      }}
    >
      {loading ? "Export..." : "📥 Exporter CSV"}
    </Button>
  );
}