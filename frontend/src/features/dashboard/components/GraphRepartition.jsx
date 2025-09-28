// 📁 src/features/dashboard/components/GraphRepartition.jsx - Version optimisée
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import Plot from "react-plotly.js";
import { getQualiteColor } from "@/lib/colors";

export default function GraphRepartition({ 
  produits = [], 
  xAxis = "qualite", 
  yAxis = "ca_total", 
  selectedCodPro 
}) {
  // Agrégation des données mémorisée
  const aggregatedData = useMemo(() => {
    if (!Array.isArray(produits) || produits.length === 0) {
      return { labels: [], values: [], colors: [] };
    }

    const aggregation = produits.reduce((acc, item) => {
      const key = item[xAxis] || "Non renseigné";
      const value = Number(item[yAxis]) || 0;
      
      if (value > 0) {
        if (!acc[key]) {
          acc[key] = { value: 0, items: [] };
        }
        acc[key].value += value;
        acc[key].items.push(item);
      }
      
      return acc;
    }, {});

    const labels = Object.keys(aggregation);
    const values = labels.map(label => aggregation[label].value);
    
    // Génération des couleurs intelligente
    const colors = labels.map((label) => {
      if (xAxis === "qualite") {
        return getQualiteColor(label);
      } else if (xAxis === "refint") {
        // Pour les références, prendre la couleur de qualité du premier produit trouvé
        const firstItem = aggregation[label].items[0];
        return firstItem ? getQualiteColor(firstItem.qualite) : "#cccccc";
      } else if (xAxis === "statut") {
        // Couleurs spécifiques par statut
        const statusColors = {
          "Actif": "#4CAF50",
          "Inactif": "#F44336", 
          "En cours": "#FF9800",
          "Suspendu": "#9E9E9E",
        };
        return statusColors[label] || "#607D8B";
      } else {
        // Couleurs par défaut pour famille ou autres
        const defaultColors = [
          "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
          "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
        ];
        const index = labels.indexOf(label) % defaultColors.length;
        return defaultColors[index];
      }
    });

    return { labels, values, colors };
  }, [produits, xAxis, yAxis]);

  // Configuration du graphique mémorisée
  const plotData = useMemo(() => {
    const { labels, values, colors } = aggregatedData;
    
    if (labels.length === 0) return [];

    return [{
      type: "bar",
      x: labels,
      y: values,
      marker: { 
        color: colors,
        line: {
          color: 'rgba(0,0,0,0.3)',
          width: 1
        }
      },
      hovertemplate: "<b>%{x}</b><br>" +
                    "Valeur: %{y:,.0f}<br>" +
                    "<extra></extra>",
    }];
  }, [aggregatedData]);

  const layout = useMemo(() => ({
    height: 400,
    margin: { t: 20, b: 60, l: 60, r: 20 },
    autosize: true,
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      tickangle: -45,
      tickfont: { size: 10 },
      title: {
        text: getAxisLabel(xAxis),
        font: { size: 12 }
      }
    },
    yaxis: {
      title: {
        text: getAxisLabel(yAxis),
        font: { size: 12 }
      },
      tickformat: yAxis.includes("ca") || yAxis.includes("marge") ? ",.0f" : ",.0f",
      gridcolor: "#f0f0f0",
    }
  }), [xAxis, yAxis]);

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: false,
    locale: "fr",
  }), []);

  // Helper function pour les labels d'axes
  function getAxisLabel(axis) {
    const labels = {
      qualite: "Qualité",
      refint: "Référence",
      famille: "Famille", 
      statut: "Statut",
      ca_total: "CA Total (€)",
      marge_total: "Marge Total (€)",
      stock_total: "Stock Total",
      qte_vendue: "Quantité Vendue"
    };
    return labels[axis] || axis;
  }

  if (aggregatedData.labels.length === 0) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: 300,
        flexDirection: "column",
        gap: 2
      }}>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée à afficher pour cette répartition
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Essayez de changer les axes ou vérifiez les filtres appliqués
        </Typography>
      </Box>
    );
  }

  // Titre dynamique
  const chartTitle = `Répartition ${getAxisLabel(yAxis)} par ${getAxisLabel(xAxis)}`;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2, textAlign: "center" }}>
        {chartTitle}
      </Typography>
      
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler
        style={{ width: "100%" }}
        config={config}
      />
      
      {/* Informations complémentaires */}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          {aggregatedData.labels.length} catégorie(s) affichée(s)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total: {aggregatedData.values.reduce((sum, val) => sum + val, 0).toLocaleString('fr-FR')}
          {yAxis.includes("ca") || yAxis.includes("marge") ? " €" : ""}
        </Typography>
      </Box>
    </Box>
  );
}