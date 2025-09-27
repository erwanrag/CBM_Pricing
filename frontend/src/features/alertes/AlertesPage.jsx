// 📁 src/features/alertes/AlertesPage.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Snackbar, Alert, Button, Box } from "@mui/material";

import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import AlertesTable from "@/features/alertes/components/AlertesTable";
import AlertesSidebar from "@/features/alertes/components/AlertesSidebar";
import AlertesFiltersBar from "@/features/alertes/components/AlertesFiltersBar";
import { getParametrageRegles } from "@/api/alertesApi";

export default function AlertesPage() {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(null);

  // Filtres sélectionnés par l'utilisateur (un seul state)
  const [filters, setFilters] = useState({
    code_regle: "",
    cod_pro: null,
    no_tarif: null,
    ref_crn: null,
    grouping_crn: 0,
    qualite: null,
  });

  // Ligne sélectionnée pour la sidebar
  const [selectedRow, setSelectedRow] = useState(null);

  // Chargement des règles d'alerte avec React Query
  const {
    data: regles = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["alertes-regles"],
    queryFn: getParametrageRegles,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (alertCount === 0) {
      toast.dismiss("empty-alert-toast");
      toast.info("Aucune alerte trouvée avec ces filtres.", {
        toastId: "empty-alert-toast",
      });
    }
  }, [alertCount]);

  return (
    <PageWrapper>
      <PageTitle>🔔 Alertes tarifaires</PageTitle>
      <Box mt={2}>
        <AlertesFiltersBar regles={regles} onChange={setFilters} />
      </Box>
      <AlertesTable
        filters={filters}
        onInspect={setSelectedRow}
        onTotalChange={setAlertCount}
        onDashboard={(row) =>
          navigate(
            `/dashboard?cod_pro=${row.cod_pro}&refint=${encodeURIComponent(row.refint)}&no_tarif=${row.no_tarif}`
          )
        }
      />
      <AlertesSidebar row={selectedRow} onClose={() => setSelectedRow(null)} />
      <Snackbar
        open={isError}
        autoHideDuration={6000}
        onClose={() => refetch()}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => refetch()} sx={{ width: "100%" }}>
          Erreur lors du chargement des règles d’alerte.
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
}
