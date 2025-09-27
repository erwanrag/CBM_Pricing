// src/features/dashboard/components/GraphSection.jsx
import React, { useState, useMemo } from "react";
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import GraphHistorique from "./GraphHistorique";
import GraphRepartition from "./GraphRepartition";

export default function GraphSection({ historique = [], produits = [], selectedCodPro }) {
  const [xAxis, setXAxis] = useState("qualite");
  const [yAxis, setYAxis] = useState("ca_total");
  const [mode, setMode] = useState("valeurs");

  const filteredHistorique = useMemo(() => {
    if (selectedCodPro) {
      return historique.filter((item) => item.cod_pro === selectedCodPro);
    }
    const aggregation = historique.reduce((acc, item) => {
      const key = item.periode;
      if (!acc[key]) {
        acc[key] = {
          periode: item.periode,
          ca_mensuel: 0,
          marge_mensuelle: 0,
          qte_mensuelle: 0,
        };
      }
      acc[key].ca_mensuel += item.ca_mensuel;
      acc[key].marge_mensuelle += item.marge_mensuelle;
      acc[key].qte_mensuelle += item.qte_mensuelle;
      return acc;
    }, {});

    return Object.values(aggregation).map((item) => ({
      ...item,
      marge_mensuelle_pourcentage:
        item.ca_mensuel === 0
          ? 0
          : Math.round((item.marge_mensuelle / item.ca_mensuel) * 10000) / 100,
    }));
  }, [historique, selectedCodPro]);

  // ==== Titre dynamique ====
  const clickedRefint = produits.find((p) => String(p.cod_pro) === String(selectedCodPro))?.refint;
  const titreHistorique = selectedCodPro
    ? `Évolution CA / Marge / Qté – Produit ${clickedRefint ? `${clickedRefint}` : selectedCodPro}`
    : "Évolution CA / Marge / Qté – 12 derniers mois";

  return (
    <Box mt={4}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={3}
        width="100%"
      >
        {/* Graph historique */}
        <Box
          flex={{ xs: 1, md: 1.4 }}
          minWidth={340}
          bgcolor="#fafaff"
          borderRadius={2}
          p={2}
          boxShadow={1}
          mr={{ md: 2, xs: 0 }}
        >
          <Typography variant="h6" gutterBottom sx={{ pl: 1, pb: 1 }}>
            {titreHistorique}
          </Typography>
          <GraphHistorique
            data={filteredHistorique}
            mode={mode}
            onModeChange={setMode}
          />
        </Box>

        {/* Graph répartition */}
        <Box
          flex={{ xs: 1, md: 1 }}
          minWidth={340}
          bgcolor="#fafaff"
          borderRadius={2}
          p={2}
          boxShadow={1}
        >
          <Typography variant="h6" gutterBottom>
            Répartition CA / Marge / Stock par Famille ou Qualité
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <Box sx={{ flex: "1 1 180px", minWidth: 180 }}>
              <FormControl fullWidth>
                <InputLabel>Axe X</InputLabel>
                <Select value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                  <MenuItem value="qualite">Qualité</MenuItem>
                  <MenuItem value="refint">Référence Interne</MenuItem>
                  <MenuItem value="famille">Famille</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: "1 1 180px", minWidth: 180 }}>
              <FormControl fullWidth>
                <InputLabel>Axe Y</InputLabel>
                <Select value={yAxis} onChange={(e) => setYAxis(e.target.value)}>
                  <MenuItem value="ca_total">CA Total</MenuItem>
                  <MenuItem value="marge_total">Marge Totale</MenuItem>
                  <MenuItem value="stock">Stock</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <GraphRepartition
            produits={produits}
            xAxis={xAxis}
            yAxis={yAxis}
            onChangeAxis={(key, value) => {
              if (key === "xAxis") setXAxis(value);
              if (key === "yAxis") setYAxis(value);
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}


