// src/features/modifications/components/ModificationsHistoriqueTable.jsx
import React from "react";
import PaginatedDataGrid from "@/shared/components/tables/PaginatedDataGrid";

const columns = [
  { field: "cod_pro", headerName: "Code Produit", width: 120 },
  { field: "refint", headerName: "Réf. Interne", width: 140 },
  { field: "no_tarif", headerName: "Tarif", width: 90 },
  { field: "ancien_prix", headerName: "Ancien Prix", width: 120 },
  { field: "nouveau_prix", headerName: "Nouveau Prix", width: 130 },
  { field: "ancienne_marge", headerName: "Ancienne Marge", width: 140 },
  { field: "marge_simulee", headerName: "Marge Simulée", width: 130 },
  { field: "statut_utilisateur", headerName: "Statut", width: 120 },
  { field: "commentaire_utilisateur", headerName: "Commentaire", width: 200 },
  { field: "date_modification", headerName: "Date", width: 140 },
  { field: "utilisateur", headerName: "Utilisateur", width: 160 },
];

export default function ModificationsHistoriqueTable({ cod_pro, no_tarif }) {
  const fetchRows = async (page, pageSize) => {
    const response = await import("@/api/tarifModificationsApi").then((mod) =>
      mod.fetchHistoriqueModifications({ cod_pro, no_tarif, page: page + 1, page_size: pageSize })
    );
    return {
      rows: response?.rows || [],
      total: response?.total || 0,
    };
  };

  return (
    <PaginatedDataGrid
      columns={columns}
      fetchRows={fetchRows}
      initialPageSize={20}
      getRowId={(r) => `${r.cod_pro}-${r.no_tarif}-${r.date_modification}`}
    />
  );
}
