import React, { useMemo, useEffect, useCallback } from "react";
import { Box } from "@mui/material";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";
import { formatPrix } from "@/lib/format";
import BadgeQualite from "@/shared/components/badges/BadgeQualite";
import ColumnPicker from "@/shared/components/tables/ColumnPicker";
import MargeColorBox from "@/shared/components/badges/MargeColorBox";
import StatutBadge from "@/shared/components/badges/StatutBadge";

const LM_COLOR = "#3B82F6";
const TARIF_COLORS = ["#FBBF24", "#F87171", "#38BDF8"];
const BORDER_GRAY = "#e5e7eb";

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

const headerWithLeMans = (label) => (
  <Box sx={{
    display: "flex", flexDirection: "column", alignItems: "center", fontWeight: "bold"
  }}>
    <span>{label}</span>
    <span style={{
      background: LM_COLOR, color: "#fff", fontSize: "0.88em",
      borderRadius: 5, padding: "0 8px", marginTop: 2, fontWeight: 700, letterSpacing: 1
    }}>
      Le Mans
    </span>
  </Box>
);

const headerWithTarif = (label, idx, no_tarif) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <span>{label}</span>
    <span style={{
      background: TARIF_COLORS[idx], color: "#222", fontSize: "0.88em",
      borderRadius: 5, padding: "0 8px", marginTop: 2, fontWeight: 700,
      border: `1.5px solid ${TARIF_COLORS[idx]}`, letterSpacing: 1
    }}>
      Tarif {no_tarif}
    </span>
  </Box>
);

export default function CompareTarifTable({
  tarifs,
  fetchRows,
  options,
  onOptionsChange,
  sortModel,
  onSortModelChange,
  colVisibility,
  setColVisibility,
}) {
  const leMansFields = ["ca_LM", "qte_LM", "marge_LM", "pmp_LM", "stock_LM"];
  const tarifFields = tarifs.map(no_tarif =>
    [`prix_${no_tarif}`, `marge_${no_tarif}`, `qte_${no_tarif}`, `marge_realisee_${no_tarif}`, `ca_${no_tarif}`]
  );
  const blocFields = [leMansFields, ...tarifFields];

  const allColumns = useMemo(() => {
    const baseCols = [
      { field: "cod_pro", headerName: "Code Produit", width: 110 },
      { field: "refint", headerName: "Réf. Interne", width: 120 },
      { field: "nom_pro", headerName: "Désignation", width: 180, flex: 1 },
      {
        field: "qualite",
        headerName: "Qualité",
        width: 100,
        renderCell: ({ value }) => <BadgeQualite qualite={value} />,
      },
      {
        field: "prix_achat",
        headerName: "Prix d'achat (€)",
        width: 120,
        renderCell: ({ value }) => (value != null ? formatPrix(value) : "-"),
      },
      {
        field: "statut",
        headerName: "Statut",
        width: 90,
        renderCell: ({ value }) => <StatutBadge value={value} />,
      },
      { field: "ca_LM", headerName: headerWithLeMans("CA (€)"), width: 100 },
      { field: "qte_LM", headerName: headerWithLeMans("Qté"), width: 70 },
      { field: "marge_LM", headerName: headerWithLeMans("Marge (€)"), width: 100 },
      { field: "pmp_LM", headerName: headerWithLeMans("PMP (€)"), width: 100 },
      { field: "stock_LM", headerName: headerWithLeMans("Stock"), width: 80 },
      ...(tarifs.length >= 2
        ? [{
          field: "ratio_max_min",
          headerName: "Ratio ↑↓",
          width: 90,
          align: "center",
          sortable: true,
          renderCell: ({ value }) => {
            if (value == null) return "N/A";
            return (
              <Box>
                <strong style={{
                  color: value > 1.2 ? "#e53935" : "#27ae60"
                }}>
                  {value.toFixed(2)}
                </strong>
              </Box>
            );
          },
        }]
        : [])
    ];

    const tarifCols = tarifs.flatMap((no_tarif, idx) => [
      { field: `prix_${no_tarif}`, headerName: headerWithTarif("Prix (€)", idx, no_tarif), width: 95 },
      { field: `marge_${no_tarif}`, headerName: headerWithTarif("Marge %", idx, no_tarif), width: 80 },
      { field: `qte_${no_tarif}`, headerName: headerWithTarif("Qté", idx, no_tarif), width: 60 },
      { field: `marge_realisee_${no_tarif}`, headerName: headerWithTarif("Marge €", idx, no_tarif), width: 90 },
      { field: `ca_${no_tarif}`, headerName: headerWithTarif("CA (€)", idx, no_tarif), width: 90 },
    ]);

    return [...baseCols, ...tarifCols];
  }, [tarifs]);

  const firstVisibleFields = useMemo(
    () => getBlocFirstVisibleFields(
      colVisibility || Object.fromEntries(allColumns.map(c => [c.field, true])),
      allColumns,
      blocFields
    ),
    [colVisibility, allColumns, blocFields]
  );

  useEffect(() => {
    setColVisibility((old) => {
      old = old || {};
      const map = Object.fromEntries(allColumns.map(c => [c.field, old[c.field] !== false]));
      return map;
    });
  }, [allColumns, setColVisibility]);

  const handleReset = useCallback(() => {
    setColVisibility(Object.fromEntries(allColumns.map(c => [c.field, true])));
  }, [allColumns, setColVisibility]);

  const columnsWithRenderCell = useMemo(() => {
    return allColumns.map(col => {
      const isQteOrStock = col.field === "qte_LM" || col.field === "stock_LM";
      const isTarifCol = tarifs.some(no_tarif => col.field.endsWith(`_${no_tarif}`));

      if (leMansFields.includes(col.field)) {
        return {
          ...col,
          renderCell: (params) => (
            <Box sx={{
              ...(firstVisibleFields.has(col.field) && { borderLeft: `2.5px solid ${BORDER_GRAY}`, pl: 1 }),
              textAlign: "right", width: "100%", display: "flex", alignItems: "center",
            }}>
              {isQteOrStock
                ? (!params.value || params.value === 0 ? "-" : params.value)
                : formatPrix(params.value)}
            </Box>
          )
        };
      }

      if (isTarifCol) {
        return {
          ...col,
          renderCell: ({ row }) => {
            const fieldMatch = col.field.match(/_(\d+)$/);
            const no_tarif = fieldMatch ? fieldMatch[1] : null;
            const t = row.tarifs?.[no_tarif] || {};
            let content = "-";

            if (col.field.startsWith("prix_")) content = formatPrix(t.prix);
            else if (col.field.startsWith("marge_realisee_")) content = formatPrix(t.marge_realisee);
            else if (col.field.startsWith("ca_")) content = formatPrix(t.ca);
            else if (col.field.startsWith("marge_")) {
              const pct = (t.marge ?? 0) * 100;
              return (
                <Box sx={{
                  ...(firstVisibleFields.has(col.field) && { borderLeft: `2.5px solid ${BORDER_GRAY}`, pl: 1 }),
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end"
                }}>
                  <MargeColorBox value={pct} size="small" />
                </Box>
              );
            } else if (col.field.startsWith("qte_")) content = (!t.qte || t.qte === 0 ? "-" : t.qte);

            return (
              <Box sx={{
                ...(firstVisibleFields.has(col.field) && { borderLeft: `2.5px solid ${BORDER_GRAY}`, pl: 1 }),
                textAlign: "right", width: "100%", display: "flex", alignItems: "center"
              }}>
                {content}
              </Box>
            );
          }
        };
      }

      return col;
    });
  }, [allColumns, firstVisibleFields, tarifs]);

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <ColumnPicker
          allColumns={allColumns}
          visibility={colVisibility || Object.fromEntries(allColumns.map(c => [c.field, true]))}
          setVisibility={setColVisibility}
          onReset={handleReset}
        />
      </Box>
      <PaginatedDataGrid
        mode="strict"
        columns={columnsWithRenderCell.filter(c => colVisibility && colVisibility[c.field])}
        fetchRows={fetchRows}
        filterModel={{ items: [] }}
        sortModel={sortModel}
        sortingMode="server"
        onFilterChange={() => { }}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={[20, 50, 100]}
        initialPageSize={20}
        getRowId={(row) => row?.cod_pro ?? `row-${Math.random()}`}
      />
    </Box>
  );
}
