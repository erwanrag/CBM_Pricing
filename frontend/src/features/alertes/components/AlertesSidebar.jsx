// 📁 src/features/alertes/AlertesSidebar.jsx
import { useEffect, useState, useRef } from "react";
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
  const cache = useRef({});

  useEffect(() => {
    if (row) {
      const key = `${row.cod_pro}-${row.no_tarif}`;
      if (cache.current[key]) {
        setDetails(cache.current[key]);
      } else {
        getAlertesDetails(row.cod_pro, row.no_tarif)
          .then((data) => {
            cache.current[key] = data;
            setDetails(data);
          })
          .catch(() => setDetails([]));
      }
    }
  }, [row]);

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
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          🛠️ Détail des alertes
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          cod_pro : {row?.cod_pro} • Tarif n°{row?.no_tarif}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {details.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune alerte détectée.
          </Typography>
        ) : (
          details.map((a) => (
            <Paper
              key={a.id_alerte}
              elevation={2}
              sx={{
                p: 2,
                mb: 2,
                borderLeft: "4px solid #1976d2",
                backgroundColor: "#fff",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Tooltip title={a.categorie}>
                  <Box sx={{ mr: 1 }}>{getIconForCategorie(a.categorie)}</Box>
                </Tooltip>
                <Typography variant="subtitle1" fontWeight={500}>
                  {a.code_regle} – {a.libelle_regle}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {a.message_standard || a.details_declenchement}
              </Typography>

              <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                📌 Valeur mesurée :{" "}
                <strong>
                  {a.valeur_reference} {a.unite}
                </strong>
                {" • "}
                Seuil : <strong>{a.seuil_1}</strong>
              </Typography>

              <Typography variant="caption" color="text.disabled">
                📅 Détecté le {new Date(a.date_detection).toLocaleDateString("fr-FR")}
              </Typography>
            </Paper>
          ))
        )}
      </Box>
    </Drawer>
  );
}
