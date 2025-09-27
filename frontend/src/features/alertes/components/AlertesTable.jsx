// 📁 src/features/alertes/AlertesTable.jsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";
import { getAlertesSummary } from "@/api";
import { useNavigate } from "react-router-dom";
import BadgeQualite from "@/shared/components/badges/BadgeQualite";
import MargeColorBox from "@/shared/components/badges/MargeColorBox";
import StatutBadge from "@/shared/components/badges/StatutBadge";
import { formatPrix } from "@/lib/format";
import ExportAlertesButton from "./ExportAlertesButton";
import ColumnPicker from "@/shared/components/tables/ColumnPicker";

const LOCALSTORAGE_KEY = "alertes_visible_columns";
const BORDER_GRAY = "#e5e7eb";
const LM_COLOR = "#3B82F6";
const TARIF_COLOR = "#FBBF24";

// Balise header colorée par bloc (même design que Compare)
const headerWithBloc = (label, blocLabel, color) => (
  <Box sx={{
    display: "flex", flexDirection: "column", alignItems: "center", fontWeight: "bold"
  }}>
    <span>{label}</span>
    <span style={{
      background: color, color: "#fff", fontSize: "0.88em",
      borderRadius: 5, padding: "0 8px", marginTop: 2, fontWeight: 700, letterSpacing: 1
    }}>
      {blocLabel}
    </span>
  </Box>
);

export default function AlertesTable({ filters, onInspect, onTotalChange }) {
  const navigate = useNavigate();
  const pageSize = 20;

  // Champs des blocs pour bordure dynamique
  const tarifFields = [
    "no_tarif", "ca_total", "px_vente", "marge_relative"
  ];
  const leMansFields = [
    "ca_LM", "qte_LM", "marge_LM", "pmp_LM", "stock_LM"
  ];
  const blocFields = [tarifFields, leMansFields];

  // Colonnes
  const allColumns = useMemo(() => [
    { field: "cod_pro", headerName: "Code Produit", width: 80 },
    { field: "refint", headerName: "Référence", width: 100 },
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
    { field: "grouping_crn", headerName: "# Groupe Réf. Constructeur", width: 140 },
    {
      field: "px_achat", headerName: "Px Achat (€)", width: 100,
      renderCell: ({ value }) => (value != null ? formatPrix(value) : "-"),
    },
    // === Bloc Tarif avec balise sur chaque colonne ===
    { field: "no_tarif", headerName: headerWithBloc("N°", "Tarif", TARIF_COLOR), width: 60 },
    {
      field: "ca_total", headerName: headerWithBloc("CA (€)", "Tarif", TARIF_COLOR), width: 120,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "px_vente", headerName: headerWithBloc("Px Vente (€)", "Tarif", TARIF_COLOR), width: 100,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "marge_relative",
      headerName: headerWithBloc("Marge (%)", "Tarif", TARIF_COLOR),
      width: 100,
      sortable: true,
      renderCell: ({ value }) => <MargeColorBox value={value} />,
    },
    // === Bloc Le Mans avec balise sur chaque colonne ===
    {
      field: "ca_LM", headerName: headerWithBloc("CA (€)", "Le Mans", LM_COLOR), width: 120,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "qte_LM", headerName: headerWithBloc("Qté", "Le Mans", LM_COLOR), width: 65,
      renderCell: ({ value }) => (!value || value === 0 ? "-" : value)
    },
    {
      field: "marge_LM", headerName: headerWithBloc("Marge (€)", "Le Mans", LM_COLOR), width: 120,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "pmp_LM", headerName: headerWithBloc("PMP (€)", "Le Mans", LM_COLOR), width: 90,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "stock_LM", headerName: headerWithBloc("Stock", "Le Mans", LM_COLOR), width: 80,
      renderCell: ({ value }) => (!value || value === 0 ? "-" : value)
    },
    // --- Actions ---
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 90,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Voir alertes">
            <IconButton
              onClick={() => onInspect(params.row)}
              aria-label="Voir alertes détaillées"
              size="small"
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voir dashboard">
            <IconButton
              aria-label="Voir ce produit dans le dashboard"
              onClick={() => {
                const { cod_pro, no_tarif, grouping_crn, refint } = params.row;
                navigate(
                  `/dashboard?cod_pro=${cod_pro}&refint=${encodeURIComponent(refint)}&no_tarif=${no_tarif}&grouping_crn=${grouping_crn}`
                );
              }}
              size="small"
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [navigate, onInspect]);

  // Visibilité colonnes (persistée)
  const [colVisibility, setColVisibility] = useState(() =>
    Object.fromEntries(allColumns.map(c => [c.field, true]))
  );

  useEffect(() => {
    setColVisibility((old = {}) =>
      Object.fromEntries(allColumns.map(c => [c.field, old[c.field] !== false]))
    );
    // eslint-disable-next-line
  }, [allColumns.length]);

  // RESET unique pour DataGrid
  const resetKey = useMemo(
    () => JSON.stringify({ filters, colVisibility }),
    [filters, colVisibility]
  );

  // Repérage des premières colonnes visibles de chaque bloc (dynamique)
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

  // Récupération des rows (live)
  const fetchRows = useCallback(async (page, limit) => {
    try {
      const res = await getAlertesSummary({
        ...filters,
        page,
        limit,
        sort_by: "marge_relative",
        sort_dir: "desc",
      });

      const validRows = (res.rows || []).filter(
        (row) => row != null && row.cod_pro !== undefined && row.no_tarif !== undefined
      );

      onTotalChange?.(res.total ?? 0);
      return {
        rows: validRows,
        total: res.total,
      };
    } catch (error) {
      console.error("❌ Erreur lors du chargement des alertes :", error);
      onTotalChange?.(0);
      return { rows: [], total: 0 };
    }
  }, [filters, onTotalChange]);

  // Patch renderCell pour bordure dynamique
  const columnsWithBorder = useMemo(() => {
    return allColumns.map(col => {
      // Bordure grise à gauche sur première colonne visible du bloc
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
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <ExportAlertesButton filters={filters} />
        <ColumnPicker
          allColumns={allColumns}
          visibility={colVisibility}
          setVisibility={setColVisibility}
          storageKey={LOCALSTORAGE_KEY}
        />
      </Box>
      <PaginatedDataGrid
        key={resetKey}
        columns={columnsWithBorder.filter(c => colVisibility[c.field])}
        fetchRows={fetchRows}
        initialPageSize={pageSize}
        getRowId={(row) => row ? `${row.cod_pro}-${row.no_tarif}` : `empty-${Math.random()}`}
        filterModel={{ items: [], quickFilterValues: [] }}
        onFilterChange={() => { }}
      />
    </Box>
  );
}
