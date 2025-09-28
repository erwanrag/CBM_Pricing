// 📁 src/features/dashboard/components/GraphHistorique.jsx - Version optimisée
import React, { useMemo } from "react";
import { Box, Typography, ToggleButton, ToggleButtonGroup } from "@mui/material";
import Plot from "react-plotly.js";

export default function GraphHistorique({ data = [], mode = "valeurs", onModeChange }) {
  // Transformation des données mémorisée
  const transformedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        dates: [],
        ca: [],
        marge: [],
        quantite: [],
        margePct: [],
      };
    }

    const dateLabel = (periode) => {
      try {
        if (!periode || typeof periode !== 'string') return 'N/A';
        
        if (periode.includes('-')) {
          const [year, month] = periode.split('-');
          return new Date(`${year}-${month}-01`).toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          });
        }
        return periode;
      } catch (e) {
        return periode || 'N/A';
      }
    };

    return {
      dates: data.map((item) => dateLabel(item.periode)),
      ca: data.map((item) => Number(item.ca_mensuel) || 0),
      marge: data.map((item) => Number(item.marge_mensuelle) || 0),
      quantite: data.map((item) => Number(item.qte_mensuelle) || 0),
      margePct: data.map((item) => (Number(item.marge_mensuelle_pourcentage) || 0) / 100),
    };
  }, [data]);

  // Configuration des traces mémorisée
  const traces = useMemo(() => {
    const { dates, ca, marge, quantite, margePct } = transformedData;
    
    if (dates.length === 0) return [];

    const result = [];

    if (mode === "valeurs") {
      result.push(
        {
          x: dates,
          y: ca,
          name: "CA mensuel (€)",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#20B2AA", width: 2 },
          marker: { size: 6 },
          yaxis: "y",
          hovertemplate: "<b>%{fullData.name}</b><br>" +
                        "Période: %{x}<br>" +
                        "Valeur: %{y:,.0f} €<br>" +
                        "<extra></extra>",
        },
        {
          x: dates,
          y: marge,
          name: "Marge mensuelle (€)",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#FF8C00", width: 2 },
          marker: { size: 6 },
          yaxis: "y",
          hovertemplate: "<b>%{fullData.name}</b><br>" +
                        "Période: %{x}<br>" +
                        "Valeur: %{y:,.0f} €<br>" +
                        "<extra></extra>",
        },
        {
          x: dates,
          y: margePct.map(val => val * 100), // Convertir en pourcentage pour l'affichage
          name: "Marge % mensuelle",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#9C27B0", width: 3, dash: "dot" },
          marker: { size: 8, symbol: "diamond" },
          yaxis: "y2",
          hovertemplate: "<b>%{fullData.name}</b><br>" +
                        "Période: %{x}<br>" +
                        "Marge: %{y:.1f}%<br>" +
                        "<extra></extra>",
        }
      );
    } else {
      result.push(
        {
          x: dates,
          y: quantite,
          name: "Quantité mensuelle",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#3f51b5", width: 2 },
          marker: { size: 6 },
          yaxis: "y",
          hovertemplate: "<b>%{fullData.name}</b><br>" +
                        "Période: %{x}<br>" +
                        "Quantité: %{y:,.0f}<br>" +
                        "<extra></extra>",
        },
        {
          x: dates,
          y: margePct.map(val => val * 100), // Convertir en pourcentage pour l'affichage
          name: "Marge % mensuelle",
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#9C27B0", width: 3, dash: "dot" },
          marker: { size: 8, symbol: "diamond" },
          yaxis: "y2",
          hovertemplate: "<b>%{fullData.name}</b><br>" +
                        "Période: %{x}<br>" +
                        "Marge: %{y:.1f}%<br>" +
                        "<extra></extra>",
        }
      );
    }

    return result;
  }, [transformedData, mode]);

  // Configuration du layout mémorisée
  const layout = useMemo(() => ({
    yaxis: {
      title: {
        text: mode === "valeurs" ? "Valeur (€)" : "Quantité",
        font: { size: 12 }
      },
      side: "left",
      tickformat: mode === "valeurs" ? ",.0f" : ",.0f",
      gridcolor: "#f0f0f0",
      domain: [0, 1], // Assurer que l'axe Y prend toute la hauteur
    },
    yaxis2: {
      title: {
        text: "Marge %",
        font: { size: 12, color: "#9C27B0" }
      },
      overlaying: "y",
      side: "right",
      tickformat: ".1f",
      color: "#9C27B0",
      gridcolor: "rgba(156, 39, 176, 0.1)",
      domain: [0, 1], // Même domaine que l'axe Y principal
    },
    xaxis: {
      tickangle: -45,
      tickfont: { size: 10 },
      gridcolor: "#f0f0f0",
      domain: [0, 1], // Assurer que l'axe X s'étend sur toute la largeur
      anchor: "y", // Ancrer l'axe X à l'axe Y principal
    },
    legend: {
      orientation: "h",
      x: 0.5,
      y: -0.15,
      xanchor: "center",
      yanchor: "top",
      font: { size: 11 }
    },
    height: 400,
    margin: { t: 20, b: 80, l: 60, r: 60 },
    autosize: true,
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
    showlegend: true,
  }), [mode]);

  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: false,
    locale: "fr",
  }), []);

  if (!data || data.length === 0) {
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
          Aucune donnée historique disponible
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Les données apparaîtront lorsque des produits seront sélectionnés
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Sélecteur de mode */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => newMode && onModeChange(newMode)}
          size="small"
        >
          <ToggleButton value="valeurs">
            Valeurs (€)
          </ToggleButton>
          <ToggleButton value="quantites">
            Quantités
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Graphique */}
      <Plot
        data={traces}
        layout={layout}
        useResizeHandler
        style={{ width: "100%" }}
        config={config}
      />
    </Box>
  );
}