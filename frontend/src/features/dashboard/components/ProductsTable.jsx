// 📁 src/features/dashboard/components/ProductsTable.jsx

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Box, Tooltip, IconButton, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BadgeQualite from "@/shared/components/badges/BadgeQualite";
import MargeColorBox from "@/shared/components/badges/MargeColorBox";
import StatutBadge from "@/shared/components/badges/StatutBadge";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";
import { formatPrix } from "@/lib/format";
import { fetchDashboardProducts } from "@/api/dashboardApi";
import ColumnPicker from "@/shared/components/tables/ColumnPicker";

const LOCALSTORAGE_KEY = "dashboard_visible_columns";
const BORDER_GRAY = "#e5e7eb";
const LM_COLOR = "#3B82F6";
const TARIF_COLOR = "#FBBF24";

// Balise sous le label de chaque colonne d'un bloc
const headerWithBloc = (label, badge, color) => (
  <Box sx={{
    display: "flex", flexDirection: "column", alignItems: "center", fontWeight: "bold"
  }}>
    <span>{label}</span>
    <span style={{
      background: color, color: "#fff", fontSize: "0.88em",
      borderRadius: 5, padding: "0 8px", marginTop: 2, fontWeight: 700, letterSpacing: 1
    }}>
      {badge}
    </span>
  </Box>
);

export default function ProductsTable({
  filters,
  clickedCodPro,
  setClickedCodPro,
  selectedCodPro,
  setSelectedCodPro,
  onInspectProduct,
  alertesMap = {},
}) {
  const [rowCount, setRowCount] = useState(0);

  // Clef unique pour forcer le reset DataGrid (change à chaque recherche)
  const resetKey = useMemo(
    () =>
      JSON.stringify({
        no_tarif: filters?.no_tarif,
        cod_pro_list: filters?.cod_pro_list?.join(",") || "",
        _forceRefresh: filters?._forceRefresh || ""
      }),
    [filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh]
  );


  // === Champs blocs ===
  const tarifFields = [
    "px_vente", "px_achat", "taux_marge_px", "ca_total"
  ];
  const leMansFields = [
    "ca_total_le_mans", "qte_le_mans", "marge_total_le_mans", "pmp_le_mans", "stock_le_mans"
  ];
  const blocFields = [tarifFields, leMansFields];

  // === Colonnes DataGrid ===
  const allColumns = useMemo(() => [
    { field: "cod_pro", headerName: "Code Produit", width: 100 },
    { field: "refint", headerName: "Référence", width: 140 },
    {
      field: "qualite",
      headerName: "Qualité",
      width: 100,
      renderCell: ({ value }) => <BadgeQualite qualite={value} />,
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 90,
      renderCell: ({ value }) => <StatutBadge value={value} />,
    },
    // === Bloc Tarif avec balise sous chaque entête ===
    {
      field: "px_vente",
      headerName: headerWithBloc("Prix Vente (€)", "Tarif", TARIF_COLOR),
      width: 110,
      align: "right",
      renderCell: ({ row }) => {
        const codProKey = String(row.cod_pro);
        const alertes = alertesMap[codProKey] || alertesMap[row.cod_pro];
        const hasAlertePxVente = alertes?.some(a => a.champ === "px_vente");
        return (
          <Tooltip title={hasAlertePxVente ? "Prix de vente suspect" : "OK"}>
            <Box
              sx={{
                backgroundColor: hasAlertePxVente ? "#ffe0e0" : "transparent",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                width: "100%",
                textAlign: "right",
              }}
            >
              {formatPrix(row.px_vente)}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "px_achat",
      headerName: headerWithBloc("Prix Achat (€)", "Tarif", TARIF_COLOR),
      width: 110,
      align: "right",
      renderCell: ({ value }) => formatPrix(value),
    },
    {
      field: "taux_marge_px",
      headerName: headerWithBloc("Marge Px (%)", "Tarif", TARIF_COLOR),
      width: 110,
      renderCell: ({ value }) => <MargeColorBox value={value} />,
    },
    {
      field: "ca_total",
      headerName: headerWithBloc("CA Tarif (€)", "Tarif", TARIF_COLOR),
      width: 120,
      align: "right",
      renderCell: ({ value }) => formatPrix(value),
    },
    // === Bloc Le Mans ===
    {
      field: "ca_total_le_mans",
      headerName: headerWithBloc("CA (€)", "Le Mans", LM_COLOR),
      width: 120,
      renderCell: ({ value }) => formatPrix(value),
    },
    {
      field: "qte_le_mans",
      headerName: headerWithBloc("Qté", "Le Mans", LM_COLOR),
      width: 65,
      renderCell: ({ value }) => (!value || value === 0 ? "-" : value),
    },
    {
      field: "marge_total_le_mans",
      headerName: headerWithBloc("Marge (€)", "Le Mans", LM_COLOR),
      width: 120,
      renderCell: ({ value }) => formatPrix(value),
    },
    {
      field: "pmp_le_mans",
      headerName: headerWithBloc("PMP (€)", "Le Mans", LM_COLOR),
      width: 90,
      renderCell: ({ value }) => formatPrix(value),
    },
    {
      field: "stock_le_mans",
      headerName: headerWithBloc("Stock", "Le Mans", LM_COLOR),
      width: 80,
      renderCell: ({ value }) => (!value || value === 0 ? "-" : value),
    },
    // === Actions ===
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      renderCell: ({ row }) => (
        <Tooltip title="Inspecter">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onInspectProduct(row);
            }}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [alertesMap, onInspectProduct]);

  // === Persistance visibilité colonnes
  const [colVisibility, setColVisibility] = useState(() =>
    Object.fromEntries(allColumns.map(c => [c.field, true]))
  );
  useEffect(() => {
    setColVisibility(old =>
      Object.fromEntries(allColumns.map(c => [c.field, old?.[c.field] !== false]))
    );
    // eslint-disable-next-line
  }, [allColumns.length]);

  // === Repérage première colonne visible par bloc (pour bordure dynamique)
  function getBlocFirstVisibleFields(colVisibility, allColumns, blocFields) {
    const visibleCols = allColumns
      .filter(c => colVisibility[c.field] !== false)
      .map(c => c.field);
    const firstVisibleSet = new Set();
    blocFields.forEach(fields => {
      const first = fields.find(f => visibleCols.includes(f));
      if (first) firstVisibleSet.add(first);
    });
    return firstVisibleSet;
  }
  const firstVisibleFields = useMemo(
    () => getBlocFirstVisibleFields(
      colVisibility || Object.fromEntries(allColumns.map(c => [c.field, true])),
      allColumns,
      blocFields
    ),
    [colVisibility, allColumns, blocFields]
  );

  // === DataGrid - fetchRows
  const fetchRows = useCallback(
    async (page, limit) => {
      const res = await fetchDashboardProducts(filters, page, limit);
      setRowCount(res.total || 0);
      return {
        rows: res.rows,
        total: res.total,
      };
    },
    [filters]
  );

  // Patch renderCell pour bordure dynamique (sur 1ère col de chaque bloc)
  const columnsWithBorder = useMemo(() => {
    return allColumns.map(col => {
      // Bloc Tarif & Le Mans : bordure à gauche sur première colonne visible
      if (
        firstVisibleFields.has(col.field) &&
        (tarifFields.includes(col.field) || leMansFields.includes(col.field))
      ) {
        return {
          ...col,
          renderCell: (params) => (
            <Box sx={{
              borderLeft: `2.5px solid ${BORDER_GRAY}`,
              pl: 1,
              textAlign: "right",
              width: "100%",
              display: "flex", alignItems: "center"
            }}>
              {col.renderCell ? col.renderCell(params) : params.value ?? "-"}
            </Box>
          ),
        };
      }
      return col;
    });
  }, [allColumns, firstVisibleFields, tarifFields, leMansFields]);

  return (
    <Box>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle1">
          🧾 Produits affichés – <strong>{rowCount}</strong> ligne(s)
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Box sx={{ width: 16, height: 16, bgcolor: "#ffe0e0", borderRadius: 0.5 }} />
          <Typography variant="body2">Prix de vente anormal</Typography>
          <Box sx={{ width: 16, height: 16, bgcolor: "#ffe0e0", borderRadius: 0.5 }} />
          <Typography variant="body2">Stock incohérent</Typography>
          <Box sx={{ width: 16, height: 16, bgcolor: "#fff8dc", borderRadius: 0.5 }} />
          <Typography variant="body2">Produit sélectionné</Typography>
        </Box>
        {/* Picker Colonnes */}
        <Box sx={{ mb: 2 }}>
          <ColumnPicker
            allColumns={allColumns}
            visibility={colVisibility}
            setVisibility={setColVisibility}
            storageKey={LOCALSTORAGE_KEY}
          />
        </Box>
      </Box>
      <PaginatedDataGrid
        key={resetKey} // <- pour forcer le reset complet si le composant est recréé
        resetKey={resetKey} // <- pour forcer le reset du cache interne (déjà géré dans PaginatedDataGrid)
        columns={columnsWithBorder.filter(c => colVisibility[c.field])}
        fetchRows={fetchRows}
        getRowId={(row) => row.cod_pro}
        getRowClassName={(params) => {
          if (String(params.row.cod_pro) === String(clickedCodPro)) return "highlighted-row";
          if (!clickedCodPro && String(params.row.cod_pro) === String(selectedCodPro)) return "highlighted-row";
          return "";
        }}
        onRowClick={(params) => {
          if (String(clickedCodPro) === String(params.row.cod_pro)) {
            setClickedCodPro(null); // Déselectionne si déjà sélectionné
          } else {
            setClickedCodPro(params.row.cod_pro);
          }
        }}
        initialPageSize={20}
      />

    </Box>
  );
}
