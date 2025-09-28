// 📁 src/features/alertes/components/AlertesTable.jsx
import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import AlertesDataGrid from "./AlertesDataGrid";
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

// Balise header colorée par bloc
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

// Fonction utilitaire pour les bordures
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

export default function AlertesTable({ filters, onInspect, onTotalChange, onDashboard }) {
  const navigate = useNavigate();
  const pageSize = 20;

  // FIXE: Refs pour les callbacks instables
  const onTotalChangeRef = useRef(onTotalChange);
  const onInspectRef = useRef(onInspect);
  const onDashboardRef = useRef(onDashboard);

  // Maintenir les refs à jour
  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
    onInspectRef.current = onInspect;
    onDashboardRef.current = onDashboard;
  }, [onTotalChange, onInspect, onDashboard]);

  // Champs des blocs pour bordure dynamique (constants)
  const tarifFields = useMemo(() => ["no_tarif", "ca_total", "px_vente", "marge_relative"], []);
  const leMansFields = useMemo(() => ["ca_LM", "qte_LM", "marge_LM", "pmp_LM", "stock_LM"], []);
  const blocFields = useMemo(() => [tarifFields, leMansFields], [tarifFields, leMansFields]);

  // Gestionnaires d'événements stables
  const handleInspect = useCallback((row) => {
    onInspectRef.current?.(row);
  }, []);

  const handleDashboard = useCallback((row) => {
    onDashboardRef.current?.(row);
  }, []);

  // Définition des colonnes
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
      renderCell: ({ value }) => (value != null ? formatPrix(value) : "-")
    },
    // === Bloc Tarif ===
    {
      field: "no_tarif", headerName: headerWithBloc("Tarif", "Tarif", TARIF_COLOR), width: 70,
      renderCell: ({ value }) => (!value ? "-" : value)
    },
    {
      field: "ca_total", headerName: headerWithBloc("CA (€)", "Tarif", TARIF_COLOR), width: 120,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "px_vente", headerName: headerWithBloc("Px Vente (€)", "Tarif", TARIF_COLOR), width: 100,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "marge_relative", headerName: headerWithBloc("Marge %", "Tarif", TARIF_COLOR), width: 80,
      renderCell: ({ value }) => <MargeColorBox value={value } size="small" />
    },
    // === Bloc Le Mans ===
    {
      field: "ca_LM", headerName: headerWithBloc("CA (€)", "Le Mans", LM_COLOR), width: 120,
      renderCell: ({ value }) => formatPrix(value)
    },
    {
      field: "qte_LM", headerName: headerWithBloc("Qté", "Le Mans", LM_COLOR), width: 70,
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
    // === Actions ===
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 90,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Voir alertes">
            <IconButton
              onClick={() => handleInspect(params.row)}
              aria-label="Voir alertes détaillées"
              size="small"
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voir dashboard">
            <IconButton
              aria-label="Voir ce produit dans le dashboard"
              onClick={() => handleDashboard(params.row)}
              size="small"
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [handleInspect, handleDashboard]);

  // Gestion de la visibilité des colonnes
  const [colVisibility, setColVisibility] = useState(() => {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erreur chargement visibilité colonnes:", e);
      }
    }
    return Object.fromEntries(allColumns.map(c => [c.field, true]));
  });

  // Sauvegarder les changements de visibilité
  useEffect(() => {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(colVisibility));
  }, [colVisibility]);

  // Repérage des premières colonnes visibles de chaque bloc
  const firstVisibleFields = useMemo(
    () => getBlocFirstVisibleFields(colVisibility, allColumns, blocFields),
    [colVisibility, allColumns, blocFields]
  );

  // FIXE: fetchRows stable sans dépendances problématiques
  const fetchRows = useCallback(async (page, limit) => {
    console.log("AlertesTable fetchRows appelé:", { page, limit, filters });
    
    try {
      const res = await getAlertesSummary({
        ...filters,
        page: page + 1, // Backend attend 1-based
        limit,
        sort_by: "marge_relative",
        sort_dir: "desc",
      });

      const validRows = (res.rows || []).filter(
        (row) => row != null && row.cod_pro !== undefined && row.no_tarif !== undefined
      );

      // Notifier le parent du total via ref
      onTotalChangeRef.current?.(res.total ?? 0);

      return {
        rows: validRows,
        total: res.total || 0,
      };
    } catch (error) {
      console.error("Erreur lors du chargement des alertes :", error);
      onTotalChangeRef.current?.(0);
      return { rows: [], total: 0 };
    }
  }, [JSON.stringify(filters)]); // Seuls les filtres comme dépendance

  // Application des bordures dynamiques
  const columnsWithBorder = useMemo(() => {
    return allColumns.map(col => {
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
              display: "flex", 
              alignItems: "center"
            }}>
              {col.renderCell ? col.renderCell(params) : params.value ?? "-"}
            </Box>
          ),
        };
      }
      return col;
    });
  }, [allColumns, firstVisibleFields, tarifFields, leMansFields]); // FIXE: deps complètes

  // Colonnes visibles finales
  const visibleColumns = useMemo(() => {
    return columnsWithBorder.filter(c => colVisibility[c.field] !== false);
  }, [columnsWithBorder, colVisibility]);

  // Reset key stable basé sur les filtres essentiels
  const resetKey = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <ExportAlertesButton filters={filters} />
        <ColumnPicker
          allColumns={allColumns}
          visibility={colVisibility}
          setVisibility={setColVisibility}
          storageKey={LOCALSTORAGE_KEY}
        />
      </Box>
      
      <AlertesDataGrid
        key={resetKey}
        columns={visibleColumns}
        fetchRows={fetchRows}
        initialPageSize={pageSize}
        getRowId={(row) => row ? `${row.cod_pro}-${row.no_tarif}` : `empty-${Math.random()}`}
      />
    </Box>
  );
}