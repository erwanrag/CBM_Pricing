// 📁 src/features/alertes/components/AlertesSidebar.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { Drawer, Box, Typography, Divider, Paper, Tooltip } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import { getAlertesDetails } from "@/api/alertesApi";
import { LAYOUT } from "@/shared/theme/theme";

const getIconForCategorie = (categorie) => {
  switch (categorie) {
    case "Qualité":
      return <InfoIcon color="primary" fontSize="small" />;
    case "Tarif":
      return <WarningIcon color="warning" fontSize="small" />;
    case "Marge":
      return <ErrorIcon color="error" fontSize="small" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
};

export default function AlertesSidebar({ row, onClose }) {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef({});
  const currentRequestRef = useRef(null);

  // ✅ FIXE: useCallback pour mémoriser la fonction loadDetails
  const loadDetails = useCallback(async (codPro, noTarif) => {
    const key = `${codPro}-${noTarif}`;
    
    // Vérifier le cache d'abord
    if (cache.current[key]) {
      setDetails(cache.current[key]);
      setLoading(false);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true;
    }

    const requestRef = { cancelled: false };
    currentRequestRef.current = requestRef;
    
    setLoading(true);
    
    try {
      const data = await getAlertesDetails(codPro, noTarif);
      
      // Vérifier si la requête n'a pas été annulée
      if (!requestRef.cancelled) {
        cache.current[key] = data;
        setDetails(data);
      }
    } catch (error) {
      if (!requestRef.cancelled) {
        console.error("Erreur chargement détails alertes:", error);
        setDetails([]);
      }
    } finally {
      if (!requestRef.cancelled) {
        setLoading(false);
      }
    }
  }, []); // ✅ Pas de dépendances = fonction stable

  // ✅ FIXE: Effect optimisé avec les bonnes dépendances
  useEffect(() => {
    if (row?.cod_pro && row?.no_tarif) {
      loadDetails(row.cod_pro, row.no_tarif);
    } else {
      setDetails([]);
      setLoading(false);
      // Annuler toute requête en cours
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    }

    // Cleanup pour annuler la requête si le composant se démonte ou la row change
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, [row?.cod_pro, row?.no_tarif, loadDetails]);

  // ✅ FIXE: Cleanup général au démontage du composant
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true;
      }
    };
  }, []);

  return (
    <Drawer
      aria-label="Détail des alertes produit"
      role="complementary"
      anchor="right"
      open={!!row}
      onClose={onClose}
      PaperProps={{
        sx: {
          mt: `${LAYOUT.HEADER_HEIGHT}px`,
          height: `calc(100% - ${LAYOUT.HEADER_HEIGHT}px)`,
          backgroundColor: "#fafafa",
          width: 420, // ✅ Largeur légèrement augmentée pour plus de confort
        },
      }}
    >
      <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
        <Typography variant="h6" gutterBottom>
          🛠️ Détail des alertes
        </Typography>
        
        {row && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            <strong>cod_pro :</strong> {row.cod_pro} • <strong>Tarif n°</strong>{row.no_tarif}
          </Typography>
        )}
        
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            py: 4 
          }}>
            <Typography variant="body2" color="text.secondary">
              ⏳ Chargement des alertes...
            </Typography>
          </Box>
        ) : details.length === 0 ? (
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            py: 4,
            textAlign: "center"
          }}>
            <Typography variant="body2" color="text.secondary">
              ✅ Aucune alerte détectée pour ce produit.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ pb: 2 }}>
            <Typography variant="body2" color="text.primary" sx={{ mb: 2, fontWeight: 500 }}>
              📋 {details.length} alerte{details.length > 1 ? 's' : ''} détectée{details.length > 1 ? 's' : ''} :
            </Typography>
            
            {details.map((a, index) => (
              <Paper
                key={a.id_alerte || index}
                elevation={2}
                sx={{
                  p: 2,
                  mb: 2,
                  borderLeft: `4px solid ${
                    a.categorie === "Marge" ? "#f44336" : 
                    a.categorie === "Tarif" ? "#ff9800" : "#1976d2"
                  }`,
                  backgroundColor: "#fff",
                  "&:hover": {
                    boxShadow: 3
                  }
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Tooltip title={`Catégorie: ${a.categorie}`}>
                    <Box sx={{ mr: 1 }}>{getIconForCategorie(a.categorie)}</Box>
                  </Tooltip>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                    {a.code_regle} – {a.libelle_regle}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.4 }}>
                  {a.message_standard || a.details_declenchement || "Pas de détail disponible"}
                </Typography>

                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  📌 <strong>Valeur mesurée :</strong>{" "}
                  <strong style={{ color: "#d32f2f" }}>
                    {a.valeur_reference} {a.unite}
                  </strong>
                  {" • "}
                  <strong>Seuil :</strong> <strong>{a.seuil_1}</strong>
                </Typography>

                <Typography variant="caption" color="text.disabled">
                  📅 Détecté le {new Date(a.date_detection).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit", 
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}