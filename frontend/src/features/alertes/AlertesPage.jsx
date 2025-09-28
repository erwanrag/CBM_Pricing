// 📁 src/features/alertes/AlertesPage.jsx
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Snackbar, Alert, Button, Box } from "@mui/material";

import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import AlertesTable from "./components/AlertesTable";
import AlertesSidebar from "./components/AlertesSidebar";
import AlertesFiltersBar from "./components/AlertesFiltersBar";
import { getParametrageRegles } from "@/api/alertesApi";

export default function AlertesPage() {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(null);

  // Filtres sélectionnés par l'utilisateur
  const [filters, setFilters] = useState({
    code_regle: "",
    cod_pro: null,
    no_tarif: null,
    ref_crn: null,
    grouping_crn: 0,
    qualite: null,
    force_single: false,
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

  // FIXE: Gestionnaires d'événements stables avec useCallback
  const handleInspect = useCallback((row) => {
    setSelectedRow(row);
  }, []);

  const handleTotalChange = useCallback((count) => {
    setAlertCount(count);
  }, []);

  const handleDashboard = useCallback((row) => {
  navigate(
    `/dashboard?no_tarif=${row.no_tarif}&cod_pro=${row.cod_pro}&grouping_crn=1`
  );
}, [navigate]);

  const handleCloseSidebar = useCallback(() => {
    setSelectedRow(null);
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  // FIXE: Toast seulement quand alertCount est explicitement 0 (pas null)
  useEffect(() => {
    if (alertCount === 0) {
      toast.dismiss("empty-alert-toast");
      toast.info("Aucune alerte trouvée avec ces filtres.", {
        toastId: "empty-alert-toast",
        autoClose: 3000,
      });
    }
  }, [alertCount]);

  return (
    <PageWrapper>
      <PageTitle>Alertes tarifaires</PageTitle>
      
      <Box mt={2}>
        <AlertesFiltersBar 
          regles={regles} 
          onChange={handleFiltersChange} 
        />
      </Box>
      
      <AlertesTable
        filters={filters}
        onInspect={handleInspect}
        onTotalChange={handleTotalChange}
        onDashboard={handleDashboard}
      />
      
      <AlertesSidebar 
        row={selectedRow} 
        onClose={handleCloseSidebar} 
      />
      
      <Snackbar
        open={isError}
        autoHideDuration={6000}
        onClose={handleRefetch}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity="error" 
          onClose={handleRefetch} 
          sx={{ width: "100%" }}
        >
          Erreur lors du chargement des règles d'alerte.
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleRefetch}
          >
            Réessayer
          </Button>
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
}