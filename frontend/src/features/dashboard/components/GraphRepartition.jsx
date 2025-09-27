// src/features/dashboard/components/GraphRepartition.jsx
import React from "react";
import { Typography } from "@mui/material";
import Plot from "react-plotly.js";
import { getQualiteColor } from "@/lib/colors";

export default function GraphRepartition({ produits = [], xAxis, yAxis, onChangeAxis }) {
  const aggregatedData = produits.reduce((acc, item) => {
    const key = item[xAxis] || "Autre";
    const value = item[yAxis] || 0;
    if (value > 0) acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});

  const xLabels = Object.keys(aggregatedData);
  const yValues = Object.values(aggregatedData);

  // 🍭 Couleurs par qualité même si l'axe est refint
  let barColors;
  if (xAxis === "qualite") {
    barColors = xLabels.map((label) => getQualiteColor(label));
  } else if (xAxis === "refint") {
    barColors = xLabels.map((refint) => {
      // Trouve le produit avec ce refint (on prend le 1er rencontré)
      const prod = produits.find((p) => p.refint === refint);
      return prod ? getQualiteColor(prod.qualite) : "#ccc";
    });
  } else {
    barColors = xLabels.map(() => "#F59E42");
  }

  if (xLabels.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune donnée à afficher
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Répartition de {yAxis === "stock" ? "stock" : yAxis.includes("marge") ? "marge" : "CA"} par {xAxis}
      </Typography>
      <Plot
        data={[
          {
            type: "bar",
            x: xLabels,
            y: yValues,
            marker: { color: barColors },
          },
        ]}
        layout={{
          height: 450,
          margin: { t: 40, b: 40, l: 40, r: 20 },
          autosize: true,
        }}
        useResizeHandler
        style={{ width: "100%" }}
        config={{ responsive: true }}
      />
    </>
  );
}
