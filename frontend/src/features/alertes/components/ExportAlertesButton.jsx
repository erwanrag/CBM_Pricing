// 📁 src/features/alertes/components/ExportAlertesButton.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Button, CircularProgress, Link, Box } from "@mui/material";
import { startExportAlertes, listExportFiles } from "@/api/exportApi";
import { toast } from "react-toastify";

export default function ExportAlertesButton({ filters }) {
  const [loading, setLoading] = useState(false);
  const [exportFilename, setExportFilename] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef(null);

  // ✅ FIXE: Fonction de polling avec cleanup automatique
  const startPolling = useCallback((filename) => {
    // Nettoyer l'interval précédent s'il existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    let attempts = 0;
    const maxAttempts = 100; // 5 minutes max (100 * 3 secondes)

    intervalRef.current = setInterval(async () => {
      attempts++;
      
      try {
        const res = await listExportFiles();
        if (res.files && res.files.includes(filename)) {
          setIsReady(true);
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          toast.success("Export prêt au téléchargement !");
          return;
        }
        
        // Timeout après maxAttempts
        if (attempts >= maxAttempts) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          toast.warning("Export en cours... Veuillez vérifier manuellement dans quelques minutes.");
        }
      } catch (error) {
        console.error("Erreur polling fichiers export:", error);
        attempts++;
        
        // Arrêter après 3 erreurs consécutives ou timeout
        if (attempts >= 3 || attempts >= maxAttempts) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          toast.error("Erreur lors de la vérification de l'export. Veuillez réessayer.");
        }
      }
    }, 3000); // Vérifier toutes les 3 secondes
  }, []);

  // ✅ FIXE: Effect pour gérer le polling
  useEffect(() => {
    if (exportFilename && !isReady) {
      startPolling(exportFilename);
    }

    // Cleanup au démontage du composant
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [exportFilename, isReady, startPolling]);

  // ✅ FIXE: Fonction d'export avec protection contre les clics multiples
  const handleExport = useCallback(async () => {
    if (loading) {
      console.log("Export déjà en cours, ignorer le clic");
      return;
    }
    
    setLoading(true);
    setIsReady(false);
    setExportFilename(null);
    
    // Nettoyer l'interval précédent
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    try {
      console.log("🚀 Démarrage export avec filtres:", filters);
      const res = await startExportAlertes(filters);
      
      if (res?.filename) {
        setExportFilename(res.filename);
        toast.info("Export lancé, veuillez patienter...");
      } else {
        throw new Error("Aucun nom de fichier retourné par l'API");
      }
    } catch (error) {
      console.error("❌ Erreur export alertes:", error);
      
      const errorMessage = error?.response?.data?.detail || 
                          error?.message || 
                          "Erreur inconnue lors du lancement de l'export";
      
      toast.error(`Erreur lancement export : ${errorMessage}`);
      setExportFilename(null);
      setIsReady(false);
    } finally {
      setLoading(false);
    }
  }, [filters, loading, startPolling]);

  // ✅ FIXE: Reset automatique quand les filtres changent
  useEffect(() => {
    setIsReady(false);
    setExportFilename(null);
    
    // Arrêter le polling en cours si les filtres changent
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [JSON.stringify(filters)]);

  // ✅ FIXE: Cleanup général au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
        {loading ? "Export en cours..." : "📥 Exporter Excel"}
      </Button>

      {isReady && exportFilename && (
        <Link
          href={`/export/download/${exportFilename}`}
          target="_blank"
          rel="noopener noreferrer"
          download
          sx={{ 
            textDecoration: "none",
            fontWeight: "bold",
            color: "success.main",
            padding: "8px 16px",
            border: "1px solid",
            borderColor: "success.main",
            borderRadius: 1,
            backgroundColor: "success.light",
            "&:hover": {
              backgroundColor: "success.main",
              color: "white",
              textDecoration: "none"
            }
          }}
        >
          📥 Télécharger l'export
        </Link>
      )}
      
      {loading && (
        <Box sx={{ 
          fontSize: "0.875rem", 
          color: "text.secondary",
          fontStyle: "italic" 
        }}>
          Génération en cours...
        </Box>
      )}
      
      {exportFilename && !isReady && !loading && (
        <Box sx={{ 
          fontSize: "0.875rem", 
          color: "warning.main",
          fontStyle: "italic" 
        }}>
          Vérification du fichier...
        </Box>
      )}
    </Box>
  );
}