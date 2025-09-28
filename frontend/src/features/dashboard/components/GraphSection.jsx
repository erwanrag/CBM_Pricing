// 📁 src/features/dashboard/components/GraphSection.jsx - Version optimisée
import React, { useState, useMemo, useCallback } from "react";
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Skeleton } from "@mui/material";
import GraphHistorique from "./GraphHistorique";
import GraphRepartition from "./GraphRepartition";

export default function GraphSection({ 
  selectedCodPro, 
  filters, 
  historiqueData, 
  historiqueLoading,
  produitsData = [] 
}) {
  const [xAxis, setXAxis] = useState("qualite");
  const [yAxis, setYAxis] = useState("ca_total");
  const [mode, setMode] = useState("valeurs");

  // Gestionnaires d'événements stables
  const handleXAxisChange = useCallback((e) => {
    setXAxis(e.target.value);
  }, []);

  const handleYAxisChange = useCallback((e) => {
    setYAxis(e.target.value);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // Données historiques filtrées et agrégées (mémorisées)
  const filteredHistorique = useMemo(() => {
    if (!historiqueData || !Array.isArray(historiqueData) || historiqueData.length === 0) {
      return [];
    }

    let result = [];

    if (selectedCodPro) {
      // Données pour un produit spécifique
      result = historiqueData
        .filter((item) => String(item.cod_pro) === String(selectedCodPro))
        .map((item) => ({
          ...item,
          // Calcul sécurisé du pourcentage de marge
          marge_mensuelle_pourcentage: item.ca_mensuel && item.ca_mensuel > 0
            ? Math.round((item.marge_mensuelle / item.ca_mensuel) * 10000) / 100
            : 0,
        }));
    } else {
      // Agrégation globale par période
      const aggregation = historiqueData.reduce((acc, item) => {
        const key = item.periode;
        if (!key) return acc; // Skip les entrées sans période
        
        if (!acc[key]) {
          acc[key] = {
            periode: key,
            ca_mensuel: 0,
            marge_mensuelle: 0,
            qte_mensuelle: 0,
          };
        }
        
        acc[key].ca_mensuel += Number(item.ca_mensuel) || 0;
        acc[key].marge_mensuelle += Number(item.marge_mensuelle) || 0;
        acc[key].qte_mensuelle += Number(item.qte_mensuelle) || 0;
        
        return acc;
      }, {});

      result = Object.values(aggregation)
        .map((item) => ({
          ...item,
          marge_mensuelle_pourcentage: item.ca_mensuel > 0
            ? Math.round((item.marge_mensuelle / item.ca_mensuel) * 10000) / 100
            : 0,
        }))
        .sort((a, b) => {
          // Tri chronologique sécurisé
          try {
            return new Date(a.periode) - new Date(b.periode);
          } catch (e) {
            return a.periode.localeCompare(b.periode);
          }
        });
    }

    return result;
  }, [historiqueData, selectedCodPro]);

  // Titre dynamique pour l'historique (mémorisé)
  const titreHistorique = useMemo(() => {
    if (selectedCodPro) {
      const produitSelectionne = produitsData.find(
        (p) => String(p.cod_pro) === String(selectedCodPro)
      );
      const refint = produitSelectionne?.refint;
      return `Évolution CA / Marge / Qté – Produit ${refint || selectedCodPro}`;
    }
    return "Évolution CA / Marge / Qté – 12 derniers mois";
  }, [selectedCodPro, produitsData]);

  // Options pour les sélecteurs (mémorisées)
  const xAxisOptions = useMemo(() => [
    { value: "qualite", label: "Qualité" },
    { value: "refint", label: "Référence" },
    { value: "famille", label: "Famille" },
    { value: "statut", label: "Statut" },
  ], []);

  const yAxisOptions = useMemo(() => [
    { value: "ca_total", label: "CA Total" },
    { value: "marge_total", label: "Marge Total" },
    { value: "stock_total", label: "Stock Total" },
    { value: "qte_vendue", label: "Qté Vendue" },
  ], []);

  return (
    <Box mt={4}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", lg: "row" }}
        gap={3}
        width="100%"
      >
        {/* Graphique historique */}
        <Box
          flex={{ xs: 1, lg: 1.4 }}
          minWidth={340}
          bgcolor="#fafaff"
          borderRadius={2}
          p={2}
          boxShadow={1}
        >
          <Typography variant="h6" gutterBottom sx={{ pl: 1, pb: 1 }}>
            {titreHistorique}
          </Typography>
          
          {historiqueLoading ? (
            <Box sx={{ width: "100%", height: 300 }}>
              <Skeleton variant="rectangular" width="100%" height="100%" />
            </Box>
          ) : (
            <GraphHistorique
              data={filteredHistorique}
              mode={mode}
              onModeChange={handleModeChange}
            />
          )}
        </Box>

        {/* Graphique répartition */}
        <Box
          flex={{ xs: 1, lg: 1 }}
          minWidth={340}
          bgcolor="#fafaff"
          borderRadius={2}
          p={2}
          boxShadow={1}
        >
          <Typography variant="h6" gutterBottom>
            Répartition CA / Marge / Stock
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ flex: "1 1 140px", minWidth: 140 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Axe X</InputLabel>
                <Select value={xAxis} onChange={handleXAxisChange} label="Axe X">
                  {xAxisOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: "1 1 140px", minWidth: 140 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Axe Y</InputLabel>
                <Select value={yAxis} onChange={handleYAxisChange} label="Axe Y">
                  {yAxisOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <GraphRepartition
            produits={produitsData}
            xAxis={xAxis}
            yAxis={yAxis}
            selectedCodPro={selectedCodPro}
          />
        </Box>
      </Box>
    </Box>
  );
}