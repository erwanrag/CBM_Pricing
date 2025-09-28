// 📁 src/features/dashboard/components/ProductsTable.jsx 
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Box, Tooltip, IconButton, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BadgeQualite from "@/shared/components/badges/BadgeQualite";
import MargeColorBox from "@/shared/components/badges/MargeColorBox";
import StatutBadge from "@/shared/components/badges/StatutBadge";
import DashboardDataGrid from "./DashboardDataGrid";
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
  
  // REF pour éviter les re-renders si les filtres sont identiques
  const lastFiltersRef = useRef(null);
  const lastFiltersStringRef = useRef("");

  // Champs des blocs (constants)
  const tarifFields = useMemo(() => ["px_vente", "px_achat", "taux_marge_px", "ca_total"], []);
  const leMansFields = useMemo(() => ["ca_total_le_mans", "qte_le_mans", "marge_total_le_mans", "pmp_le_mans", "stock_le_mans"], []);
  const blocFields = useMemo(() => [tarifFields, leMansFields], [tarifFields, leMansFields]);

  // Gestionnaires d'événements stables avec useCallback
  const handleInspectProduct = useCallback((codPro) => {
    onInspectProduct?.(codPro);
  }, [onInspectProduct]);

  const handleRowClick = useCallback((params) => {
    if (String(clickedCodPro) === String(params.row.cod_pro)) {
      setClickedCodPro(null);
    } else {
      setClickedCodPro(params.row.cod_pro);
    }
  }, [clickedCodPro, setClickedCodPro]);

  const getRowClassName = useCallback((params) => {
    if (String(params.row.cod_pro) === String(clickedCodPro)) return "highlighted-row";
    if (!clickedCodPro && String(params.row.cod_pro) === String(selectedCodPro)) return "highlighted-row";
    return "";
  }, [clickedCodPro, selectedCodPro]);

  // OPTIMISATION: Reset key stable basé sur la sérialisation des filtres
  const resetKey = useMemo(() => {
    const filtersString = JSON.stringify({
      no_tarif: filters?.no_tarif,
      cod_pro_list: filters?.cod_pro_list,
      _forceRefresh: filters?._forceRefresh
    });
    
    // Si les filtres n'ont pas changé, garder la même clé
    if (filtersString === lastFiltersStringRef.current) {
      return lastFiltersStringRef.current;
    }
    
    lastFiltersStringRef.current = filtersString;
    return filtersString;
  }, [filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh]);

  // Définition des colonnes avec mémorisation STABLE
  const allColumns = useMemo(() => [
    { field: "cod_pro", headerName: "Code Produit", width: 80 },
    { field: "refint", headerName: "Référence", width: 120 },
    {
      field: "qualite",
      headerName: "Qualité",
      width: 80,
      renderCell: ({ value }) => <BadgeQualite qualite={value} />,
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 80,
      renderCell: ({ value }) => <StatutBadge value={value} />,
    },
    { field: "grouping_crn", headerName: "# Groupe Réf. Constructeur", width: 140 },
    
    // === Bloc Tarif ===
    {
      field: "px_vente",
      headerName: headerWithBloc("Px Vente (€)", "Tarif", TARIF_COLOR),
      width: 120,
      renderCell: ({ value, row }) => {
        const codProKey = String(row.cod_pro);
        const alertes = alertesMap[codProKey] || [];
        const hasAlertePxVente = alertes.some(a => a.champ === "px_vente");
        return (
          <Tooltip title={hasAlertePxVente ? "Prix de vente suspect" : ""}>
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
              {formatPrix(value)}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "px_achat",
      headerName: headerWithBloc("Px Achat (€)", "Tarif", TARIF_COLOR),
      width: 120,
      renderCell: ({ value }) => formatPrix(value),
    },
    {
      field: "taux_marge_px",
      headerName: headerWithBloc("Marge %", "Tarif", TARIF_COLOR),
      width: 100,
      renderCell: ({ value }) => <MargeColorBox value={value} size="small" />,
    },
    {
      field: "ca_total",
      headerName: headerWithBloc("CA (€)", "Tarif", TARIF_COLOR),
      width: 120,
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
      width: 80,
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
      width: 100,
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
      sortable: false,
      width: 80,
      renderCell: (params) => (
        <Tooltip title="Inspecter produit">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleInspectProduct(params.row.cod_pro);
            }}
            aria-label="Inspecter ce produit"
            size="small"
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [handleInspectProduct, alertesMap]); // STABLE: alertesMap ne change que si vraiment nécessaire

  // Gestion de la visibilité des colonnes
  const [colVisibility, setColVisibility] = useState(() => {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erreur chargement visibilité colonnes dashboard:", e);
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

  // OPTIMISATION CRITIQUE: fetchRows avec dépendances ultra-stables
  const fetchRows = useCallback(async (page, limit) => {
    // Vérification de stabilité des filtres
    const currentFiltersString = JSON.stringify(filters);
    
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 ProductsTable fetchRows - tentative:", { 
        page, 
        limit, 
        filtersChanged: currentFiltersString !== JSON.stringify(lastFiltersRef.current)
      });
    }
    
    // Protection contre les appels redondants
    if (!filters?.no_tarif || !filters?.cod_pro_list?.length) {
      console.warn("⚠️ fetchRows: Filtres invalides");
      return { rows: [], total: 0 };
    }
    
    try {
      const startTime = performance.now();
      const res = await fetchDashboardProducts(filters, page, limit);
      const endTime = performance.now();
      
      setRowCount(res.total || 0);
      lastFiltersRef.current = { ...filters };
      
      if (process.env.NODE_ENV === 'development') {
        console.log("✅ ProductsTable fetchRows - succès:", {
          total: res.total,
          rows_count: res.rows?.length,
          duration_ms: Math.round(endTime - startTime)
        });
      }
      
      return {
        rows: res.rows || [],
        total: res.total || 0,
      };
    } catch (error) {
      console.error("❌ Erreur lors du chargement des produits dashboard:", error);
      setRowCount(0);
      return { rows: [], total: 0 };
    }
  }, [
    // DÉPENDANCES ULTRA-STABLES: Seules les valeurs primitives
    filters?.no_tarif,
    filters?.cod_pro_list?.length, // Plutôt que le tableau complet
    filters?._forceRefresh
  ]);

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
  }, [allColumns, firstVisibleFields, tarifFields, leMansFields]);

  // Colonnes visibles finales
  const visibleColumns = useMemo(() => {
    return columnsWithBorder.filter(c => colVisibility[c.field] !== false);
  }, [columnsWithBorder, colVisibility]);

  // Calcul des statistiques d'alertes pour la légende
  const alerteStats = useMemo(() => {
    try {
      if (!alertesMap || typeof alertesMap !== 'object') {
        return { totalAlertes: 0, alertesActives: 0 };
      }
      
      const totalAlertes = Object.keys(alertesMap).length;
      const alertesActives = Object.values(alertesMap).filter(alertes => 
        Array.isArray(alertes) && alertes.length > 0
      ).length;
      
      return { totalAlertes, alertesActives };
    } catch (error) {
      console.error("Erreur calcul alerteStats:", error);
      return { totalAlertes: 0, alertesActives: 0 };
    }
  }, [alertesMap]);

  // Ne pas rendre le tableau si on n'a pas de filtres valides
  if (!filters?.no_tarif || !filters?.cod_pro_list?.length) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Veuillez sélectionner un tarif et des produits pour afficher le tableau.
        </Typography>
      </Box>
    );
  }

  // LOGGING RÉDUIT: Seulement si vraiment nécessaire
  if (process.env.NODE_ENV === 'development') {
    console.log("🎯 ProductsTable RENDER:", {
      tarif: filters?.no_tarif,
      produits_count: filters?.cod_pro_list?.length,
      resetKey: resetKey.slice(0, 50) + "...",
      visibleColumns: visibleColumns.length
    });
  }

  return (
    <Box>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle1">
          Produits affichés – <strong>{rowCount}</strong> ligne(s)
          {alerteStats.alertesActives > 0 && (
            <span style={{ color: "#d32f2f", marginLeft: "8px" }}>
              • {alerteStats.alertesActives} avec alertes
            </span>
          )}
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: "#ffe0e0", borderRadius: 0.5 }} />
            <Typography variant="body2">Prix anormal</Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: "#fff3cd", borderRadius: 0.5 }} />
            <Typography variant="body2">Stock incohérent</Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: "#fff8dc", borderRadius: 0.5 }} />
            <Typography variant="body2">Produit sélectionné</Typography>
          </Box>
          
          {alerteStats.alertesActives > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: "#ffebee", borderRadius: 0.5, border: "1px solid #f44336" }} />
              <Typography variant="body2">Avec alertes actives</Typography>
            </Box>
          )}
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
      
      <DashboardDataGrid
        key={resetKey}
        columns={visibleColumns}
        fetchRows={fetchRows}
        resetKey={resetKey}
        getRowId={(row) => row.cod_pro}
        onRowClick={handleRowClick}
        getRowClassName={getRowClassName}
        selectedCodPro={selectedCodPro}
        clickedCodPro={clickedCodPro}
        initialPageSize={20}
      />
    </Box>
  );
}