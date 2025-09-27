import React, { useState, useEffect } from "react";
import { Button, CircularProgress, Link } from "@mui/material";
import { toast } from "react-toastify";
import { startExportCompareTarif, listExportFiles } from "@/api/exportApi";

export default function ExportAsyncButton({ tarifs, filters }) {
  const [loading, setLoading] = useState(false);
  const [exportFilename, setExportFilename] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Polling pour vérifier si le fichier est prêt
  useEffect(() => {
    if (!exportFilename) return;

    const interval = setInterval(async () => {
      try {
        const { files } = await listExportFiles();
        if (files.includes(exportFilename)) {
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
      const payload = {
        tarifs,
        ...filters,
        export_all: true
      };
      // ➡️ AJOUTE CE LOG :
      //console.log("[Export CSV] Payload envoyé :", payload);
      const { filename } = await startExportCompareTarif(payload);
      setExportFilename(filename);
      toast.info("Export lancé, veuillez patienter...");
    } catch (e) {
      toast.error("Erreur lancement export : " + (e.message || "inconnue"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleExport}
        disabled={tarifs.length === 0 || loading}
      >
        {loading ? <CircularProgress size={20} /> : "📥 Exporter CSV"}
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
