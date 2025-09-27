// src/features/dashboard/components/GraphHistorique.jsx
import React from "react";
import Plot from "react-plotly.js";

export default function GraphHistorique({ data, mode }) {
  const dateLabel = (periode) => {
    const [year, month] = periode.split("-");
    return new Date(`${year}-${month}-01`).toLocaleString("fr-FR", {
      month: "short",
      year: "numeric",
    });
  };

  const dates = data.map((item) => dateLabel(item.periode));
  const ca = data.map((item) => item.ca_mensuel);
  const marge = data.map((item) => item.marge_mensuelle);
  const quantite = data.map((item) => item.qte_mensuelle);
  const margePct = data.map((item) => item.marge_mensuelle_pourcentage / 100);

  const traces = [];
  if (mode === "valeurs") {
    traces.push(
      {
        x: dates,
        y: ca,
        name: "CA mensuel (€)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "teal" },
        yaxis: "y",
      },
      {
        x: dates,
        y: marge,
        name: "Marge mensuelle (€)",
        type: "scatter",
        mode: "lines+markers",
        line: { color: "orange" },
        yaxis: "y",
      }
    );
  } else {
    traces.push({
      x: dates,
      y: quantite,
      name: "Quantité mensuelle",
      type: "scatter",
      mode: "lines+markers",
      line: { color: "#3f51b5" },
      yaxis: "y",
    });
  }

  traces.push({
    x: dates,
    y: margePct,
    name: "Marge % mensuelle",
    type: "scatter",
    mode: "lines",
    line: { color: "#9C27B0", width: 3 },
    yaxis: "y2",
  });

  return (
    <Plot
      data={traces}
      layout={{
        yaxis: {
          title: mode === "valeurs" ? "Valeur (€)" : "Quantité",
          side: "left",
        },
        yaxis2: {
          title: "Marge %",
          overlaying: "y",
          side: "right",
          tickformat: ",.0%",
          color: "#9C27B0"
        },
        legend: { orientation: "h", x: 1, y: -0.2, xanchor: "right", yanchor: "top" },
        height: 450,
        margin: { t: 40, b: 60, l: 50, r: 50 },
        autosize: true,
        xaxis: { tickangle: -45, tickfont: { size: 10 } },
      }}
      useResizeHandler
      style={{ width: "100%" }}
      config={{ responsive: true }}
    />
  );
}
