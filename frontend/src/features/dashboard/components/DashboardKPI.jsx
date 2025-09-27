// src/features/dashboard/components/DashboardKPI.jsx
import { Box, Card, CardContent, Typography, IconButton, Tooltip } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { formatPrix, formatPourcentage } from "@/lib/format";

const KPISection = ({ products, clickedCodPro, onClearClicked }) => {
  // KPI sur la totalité
  const totalProduits = products.length;
  const caTotal = products.reduce((acc, p) => acc + p.ca_total, 0);
  const produitsAvecCA = products.filter((p) => p.ca_total > 0);
  const totalMarge = produitsAvecCA.reduce((acc, p) => acc + p.ca_total * p.marge_moyenne, 0);
  const margeMoyenne = caTotal > 0 ? totalMarge / caTotal : 0;
  const alertesActives = products.reduce((acc, p) => acc + (p.alertes_actives || 0), 0);

  const kpis = [
    { label: "Produits Actifs", value: totalProduits },
    { label: "CA Total 12 mois (€)", value: formatPrix(caTotal) },
    { label: "Marge Moyenne 12 mois (%)", value: formatPourcentage(margeMoyenne * 100) },
    { label: "Alertes Actives", value: alertesActives },
  ];

  const produit = clickedCodPro
    ? products.find((p) => String(p.cod_pro) === String(clickedCodPro))
    : null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
      {/* KPI globaux */}
      {kpis.map(({ label, value }) => (
        <Box key={label} sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: 340 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h5">{value}</Typography>
            </CardContent>
          </Card>
        </Box>
      ))}

      {/* Si un produit est cliqué : détails */}
      {produit && (
        <Box sx={{ flex: "1 1 100%", mt: 1 }}>
          <Card
            sx={{
              backgroundColor: "#e3f3fc",
              borderLeft: "6px solid #0288d1",
              boxShadow: 2,
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                Produit sélectionné :
                <b style={{ marginLeft: 4 }}>{produit.cod_pro}</b>
                {produit.refint ? ` – ${produit.refint}` : ""}
                <Tooltip title="Désélectionner">
                  <IconButton
                    size="small"
                    sx={{
                      ml: 1,
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      "&:hover": { background: "#f0f0f0", borderColor: "#0288d1" },
                    }}
                    onClick={onClearClicked}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                CA : <b>{formatPrix(produit.ca_total)}</b> — Marge : <b>{formatPourcentage(produit.marge_moyenne * 100)}</b>
                {typeof produit.alertes_actives !== "undefined" && (
                  <> — Alertes : <b>{produit.alertes_actives}</b></>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}



    </Box>
  );
};

export default KPISection;

