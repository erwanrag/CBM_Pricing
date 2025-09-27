// 📁 src/features/alertes/ExportAlertesButton.jsx
import { useState, useEffect } from "react";
import { Button, CircularProgress, Link } from "@mui/material";
import { startExportAlertes, listExportFiles } from "@/api/exportApi";
import { toast } from "react-toastify";

export default function ExportAlertesButton({ filters }) {
  const [loading, setLoading] = useState(false);
  const [exportFilename, setExportFilename] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!exportFilename) return;

    const interval = setInterval(async () => {
      try {
        const res = await listExportFiles();
        if (res.files.includes(exportFilename)) {
          setIsReady(true);
          clearInterval(interval);
          toast.success("Export prêt au téléchargement !");
        }
      } catch (e) {
        console.error("Erreur polling fichiers export:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [exportFilename]);

  const handleExport = async () => {
    setLoading(true);
    setIsReady(false);
    setExportFilename(null);
    try {
      const res = await startExportAlertes(filters);
      setExportFilename(res.filename);
      toast.info("Export lancé, veuillez patienter...");
    } catch (e) {
      toast.error("Erreur lancement export : " + (e.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outlined" onClick={handleExport} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : "📥 Exporter Excel"}
      </Button>

      {isReady && exportFilename && (
        <Link
          href={`/export/download/${exportFilename}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ ml: 2 }}
          download
        >
          Télécharger l'export
        </Link>
      )}
    </>
  );
}
