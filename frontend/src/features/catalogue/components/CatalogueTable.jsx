// 📁 src/features/compare_tarif/components/CatalogueTable.jsx
// 📁 src/features/catalogue/CatalogueTable.jsx
import React, { useCallback } from "react";
import * as XLSX from "xlsx";
import { Box } from "@mui/material";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";
import BadgeQualite from "@/shared/components/badges/BadgeQualite";
import MargeColorBox from "@/shared/components/badges/MargeColorBox";
import { formatPrix } from "@/lib/format";
import CBMButton from "@/shared/components/buttons/CBMButton";
import { fetchCatalogueTarifs } from "@/api/catalogueApi";

const columns = [
  { field: "no_tarif", headerName: "Tarif", width: 90 },
  { field: "cod_pro", headerName: "Code Produit", width: 90 },
  { field: "refint", headerName: "Référence", width: 120 },
  { field: "nom_pro", headerName: "Nom", width: 150 },
  {
    field: "qualite",
    headerName: "Qualité",
    width: 100,
    renderCell: (params) => <BadgeQualite qualite={params.value} />,
  },
  {
    field: "prix_vente_eur",
    headerName: "Prix Vente (€)",
    width: 120,
    valueFormatter: ({ value }) => formatPrix(value),
  },
  {
    field: "prix_achat_eur",
    headerName: "Prix Achat (€)",
    width: 120,
    valueFormatter: ({ value }) => formatPrix(value),
  },
  {
    field: "taux_marge_eur",
    headerName: "Marge (%)",
    width: 100,
    renderCell: ({ value }) => <MargeColorBox value={value} />,
  },
];

export default function CatalogueTable({ filters, onFilterChange }) {
  const fetchRows = useCallback(async (page, limit, model) => {
    const payload = {};
    model.items?.forEach(({ field, value }) => {
      if (value !== null && value !== "") {
        payload[field] = value;
      }
    });

    const res = await fetchCatalogueTarifs(payload, page, limit);
    return res;
  }, []);

  const handleExportExcel = async () => {
    try {
      const allRows = [];
      let page = 0;
      let total = 1;

      const payload = {};
      filters.items?.forEach(({ field, value }) => {
        if (value !== null && value !== "") {
          payload[field] = value;
        }
      });

      while (allRows.length < total) {
        const res = await fetchCatalogueTarifs(payload, page, 200);
        allRows.push(...(res.rows ?? []));
        total = res.total ?? allRows.length;
        page++;
      }

      const ws = XLSX.utils.json_to_sheet(allRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catalogue");
      XLSX.writeFile(wb, "catalogue_prix.xlsx");
    } catch (err) {
      console.error("❌ Erreur export Excel :", err);
      alert("Erreur lors de l’export Excel !");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <CBMButton onClick={handleExportExcel} variant="secondary" size="sm">
          Exporter vers Excel
        </CBMButton>
      </Box>

      <PaginatedDataGrid
        columns={columns}
        fetchRows={fetchRows}
        filterModel={filters}
        onFilterChange={onFilterChange}
        getRowId={(row) => `${row.cod_pro}-${row.no_tarif}`}
        initialPageSize={20}
      />
    </Box>
  );
}
