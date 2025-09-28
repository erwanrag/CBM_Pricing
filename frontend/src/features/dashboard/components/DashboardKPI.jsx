// 📁 src/features/dashboard/components/DashboardKPI.jsx - Version corrigée
import React, { useMemo } from "react";
import { Box, Card, CardContent, Typography, IconButton, Tooltip, Skeleton } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { formatPrix, formatPourcentage } from "@/lib/format";

export default function KPISection({ data, loading, error, clickedCodPro, onClearClicked, produitsData = [] }) {
  console.log("KPISection render:", { data, loading, error });

  // Gestion des états de chargement et d'erreur
  if (loading) {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
        {[1, 2, 3, 4].map((index) => (
          <Box key={index} sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: 340 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="80%" height={40} />
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Card sx={{ backgroundColor: "#ffebee" }}>
          <CardContent>
            <Typography color="error">
              Erreur lors du chargement des KPI : {error.message || "Erreur inconnue"}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ mt: 2 }}>
        <Card sx={{ backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography color="text.secondary">
              Aucune donnée KPI disponible
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // CORRECTION: Utiliser directement les données du backend sans re-calcul
  const kpiCalculated = useMemo(() => {
    console.log("KPI DEBUG - Structure complète des données:", data);
    
    // Le backend retourne probablement les KPI déjà calculés
    // Vérifier la structure réelle des données
    if (data.total_produits !== undefined) {
      // Format direct du backend
      console.log("KPI DEBUG - Format direct backend détecté");
      return {
        total_produits: data.total_produits || 0,
        ca_total: data.ca_total || 0,
        marge_moyenne: data.marge_moyenne || 0,
        alertes_actives: data.alertes_actives || 0
      };
    }
    
    // Si les données sont dans un format items
    const items = data.items || [];
    console.log("KPI DEBUG - Format items détecté, nombre d'items:", items.length);
    console.log("KPI DEBUG - Premier item:", items[0]);
    
    if (!items.length) {
      return {
        total_produits: 0,
        ca_total: 0,
        marge_moyenne: 0,
        alertes_actives: 0
      };
    }

    // CORRECTION: Utiliser marge_absolue pour le calcul correct
    const total_produits = items.length;
    const ca_total = items.reduce((sum, item) => sum + (Number(item.ca_total) || 0), 0);
    const alertes_actives = items.reduce((sum, item) => sum + (Number(item.alertes_actives) || 0), 0);
    
    // NOUVEAU: Calcul correct avec marge_absolue
    const marge_absolue_total = items.reduce((sum, item) => sum + (Number(item.marge_absolue) || 0), 0);
    const marge_moyenne = ca_total > 0 ? (marge_absolue_total / ca_total) * 100 : 0;
    
    console.log("KPI DEBUG - Calcul marge corrigé:");
    console.log("- CA total:", ca_total);
    console.log("- Marge absolue totale:", marge_absolue_total);
    console.log("- Marge moyenne %:", marge_moyenne);

    const resultat = {
      total_produits,
      ca_total,
      marge_moyenne,
      alertes_actives
    };
    
    console.log("KPI DEBUG - Résultat final corrigé:", resultat);
    return resultat;
  }, [data]);

  // Données KPI globales
  const kpis = [
    { 
      label: "Produits Actifs", 
      value: kpiCalculated.total_produits || 0,
      color: "#1976d2"
    },
    { 
      label: "CA Total 12 mois (€)", 
      value: formatPrix(kpiCalculated.ca_total || 0),
      color: "#2e7d32"
    },
    { 
      label: "Marge Moyenne (%)", 
      value: formatPourcentage(kpiCalculated.marge_moyenne || 0),
      color: "#ed6c02"
    },
    { 
      label: "Alertes Actives", 
      value: kpiCalculated.alertes_actives || 0,
      color: "#d32f2f"
    },
  ];

  // Produit sélectionné - chercher dans les données des produits
  const produitSelectionne = useMemo(() => {
    if (!clickedCodPro || !produitsData?.length) return null;
    
    return produitsData.find(p => String(p.cod_pro) === String(clickedCodPro));
  }, [clickedCodPro, produitsData]);

  return (
    <Box sx={{ mt: 2 }}>
      {/* Debug visuel */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          padding: "5px", 
          backgroundColor: "#f0f8ff", 
          margin: "5px 0", 
          borderRadius: "4px",
          fontSize: "11px" 
        }}>
          KPI DEBUG: Structure={JSON.stringify(Object.keys(data || {}))} | 
          CA={kpiCalculated.ca_total} | 
          Produits={kpiCalculated.total_produits} |
          Alertes={kpiCalculated.alertes_actives}
        </div>
      )}

      {/* KPI globaux */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {kpis.map(({ label, value, color }) => (
          <Box key={label} sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: 340 }}>
            <Card sx={{ borderLeft: `4px solid ${color}` }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h4" sx={{ color, fontWeight: 600 }}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Détails du produit sélectionné */}
      {produitSelectionne && (
        <Box sx={{ mt: 2 }}>
          <Card
            sx={{
              backgroundColor: "#e3f3fc",
              borderLeft: "6px solid #0288d1",
              boxShadow: 2,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" color="primary">
                  Produit sélectionné : {produitSelectionne.cod_pro}
                  {produitSelectionne.refint && ` – ${produitSelectionne.refint}`}
                </Typography>
                
                <Tooltip title="Désélectionner">
                  <IconButton
                    size="small"
                    sx={{
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      "&:hover": { 
                        background: "#f0f0f0", 
                        borderColor: "#0288d1" 
                      },
                    }}
                    onClick={onClearClicked}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    CA 12 mois
                  </Typography>
                  <Typography variant="h6">
                    {formatPrix(produitSelectionne.ca_total || 0)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Marge %
                  </Typography>
                  <Typography variant="h6">
                    {formatPourcentage(produitSelectionne.taux_marge_px || 0)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Stock actuel
                  </Typography>
                  <Typography variant="h6">
                    {produitSelectionne.stock_le_mans || 0}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Prix de vente
                  </Typography>
                  <Typography variant="h6">
                    {formatPrix(produitSelectionne.px_vente || 0)}
                  </Typography>
                </Box>
              </Box>

              {produitSelectionne.qualite && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Qualité : <strong>{produitSelectionne.qualite}</strong>
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}