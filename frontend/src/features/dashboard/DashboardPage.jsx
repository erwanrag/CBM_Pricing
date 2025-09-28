// 📁 src/features/dashboard/DashboardPage.jsx - Corrections critiques
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLayout } from "@/context/layout/LayoutContext";
import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import KPISection from "./components/DashboardKPI";
import GraphSection from "./components/GraphSection";
import ProductsTable from "./components/ProductsTable";
import DashboardDetailPanel from "./components/DashboardDetailPanel";
import {
  fetchDashboardKPI,
  fetchDashboardProducts,
  fetchHistoriquePrixMarge,
} from "@/api/dashboardApi";
import { getAlertesMap } from "@/api/alertesApi";
import { resolveCodPro } from "@/api/identifierApi";
import { toast } from "react-toastify";

export default function DashboardPage() {
  // ========== 1. Context et États ==========
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { filters, setFilters, setFilterType } = useLayout();

  // États locaux optimisés
  const [selectedCodPro, setSelectedCodPro] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [clickedCodPro, setClickedCodPro] = useState(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // ========== 2. DÉFINIR LE FILTERTYPE STABLE ==========
  useEffect(() => {
    setFilterType?.("dashboard");
  }, [setFilterType]);

  // ========== 3. Gestionnaires d'événements stables ==========
  const handleSetSelectedCodPro = useCallback((codPro) => {
    setSelectedCodPro(codPro);
  }, []);

  const handleSetClickedCodPro = useCallback((codPro) => {
    setClickedCodPro(codPro);
  }, []);

  const handleClearClicked = useCallback(() => {
    setClickedCodPro(null);
  }, []);

  const handleInspectProduct = useCallback((codPro) => {
    setSelectedCodPro(codPro);
    setSelectedProductDetails({ 
      cod_pro: codPro, 
      no_tarif: filters?.no_tarif,
    });
  }, [filters?.no_tarif]);

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedCodPro(null);
    setSelectedProductDetails(null);
  }, []);

  // ========== 4. Résolution initiale des paramètres URL (optimisée) ==========
  const resolveInitialCodPro = useCallback(async () => {
    const cod_pro = searchParams.get("cod_pro");
    const ref_crn = searchParams.get("ref_crn");
    const no_tarif = Number(searchParams.get("no_tarif") || 0);
    const grouping_crn = Number(searchParams.get("grouping_crn") || 1);

    const alreadyHandled = sessionStorage.getItem("dashboardInit") === "1";
    if (initialFetchDone || alreadyHandled || !no_tarif || (!cod_pro && !ref_crn)) {
      setInitialFetchDone(true);
      return;
    }

    try {
      const payload = {
        no_tarif,
        cod_pro: cod_pro ? Number(cod_pro) : undefined,
        ref_crn: ref_crn || undefined,
        grouping_crn,
      };

      const res = await resolveCodPro(payload);
      
      if (!res.data?.length) {
        toast.info("Aucun produit trouvé pour les filtres sélectionnés.");
        setInitialFetchDone(true);
        return;
      }

      const outputFilters = {
        no_tarif,
        cod_pro_list: res.data,
        selected_cod_pro: cod_pro ? Number(cod_pro) : res.data[0] || null,
        _forceRefresh: Date.now().toString(),
      };

      setFilters?.(outputFilters);
      setSelectedCodPro(outputFilters.selected_cod_pro);
      
      sessionStorage.setItem("dashboardInit", "1");
      setInitialFetchDone(true);
    } catch (error) {
      console.error("Erreur résolution URL:", error);
      toast.error("Erreur lors de la résolution des produits");
      setInitialFetchDone(true);
    }
  }, [searchParams, initialFetchDone, setFilters]);

  // Effect pour la résolution initiale
  useEffect(() => {
    resolveInitialCodPro();
  }, [resolveInitialCodPro]);

  // ========== 5. Queries React Query (optimisées) ==========
  const hasValidFilters = Boolean(filters?.no_tarif && filters?.cod_pro_list?.length > 0);

  console.log("DASHBOARD DEBUG:", {
    hasValidFilters,
    filters,
    initialFetchDone,
    location: location.pathname
  });

  const {
    data: kpiData,
    isLoading: kpiLoading,
    error: kpiError,
  } = useQuery({
    queryKey: ["dashboard-kpi", filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh],
    queryFn: () => fetchDashboardKPI(filters),
    enabled: hasValidFilters,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Correction de l'appel getAlertesMap avec les bons paramètres
  const {
    data: alertesMap = {},
  } = useQuery({
    queryKey: ["alertes-map", filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh],
    queryFn: async () => {
      try {
        // Validation explicite des paramètres avant l'appel
        if (!filters?.no_tarif || !filters?.cod_pro_list?.length) {
          console.warn("getAlertesMap: paramètres invalides", { 
            no_tarif: filters?.no_tarif, 
            cod_pro_list: filters?.cod_pro_list 
          });
          return {};
        }

        console.log("getAlertesMap payload:", { 
          no_tarif: filters.no_tarif, 
          cod_pro_list: filters.cod_pro_list 
        });

        // Correction: utiliser la signature correcte de getAlertesMap
        const result = await getAlertesMap(filters.no_tarif, filters.cod_pro_list);
        const items = result.items || [];
        const map = {};
        
        items.forEach(({ cod_pro, champ, code_regle }) => {
          const codProKey = String(cod_pro);
          if (!map[codProKey]) {
            map[codProKey] = [];
          }
          map[codProKey].push({ code_regle, champ });
        });
        
        return map;
      } catch (error) {
        console.error("Erreur chargement alertes:", error);
        return {};
      }
    },
    enabled: hasValidFilters && Boolean(filters?.no_tarif && filters?.cod_pro_list?.length),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const {
    data: historiqueData,
    isLoading: historiqueLoading,
  } = useQuery({
    queryKey: ["dashboard-historique", filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh],
    queryFn: () => fetchHistoriquePrixMarge({
      no_tarif: filters?.no_tarif,
      cod_pro_list: filters?.cod_pro_list,
    }),
    enabled: hasValidFilters,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Récupération des données produits pour les graphiques
  const {
    data: produitsDataResponse,
    isLoading: produitsLoading,
  } = useQuery({
    queryKey: ["dashboard-products-graph", filters?.no_tarif, filters?.cod_pro_list, filters?._forceRefresh],
    queryFn: () => fetchDashboardProducts(filters, 0, 100), // Limite plus élevée pour les graphiques
    enabled: hasValidFilters,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ========== 6. Données pour les composants (mémorisées) ==========
  const produitsData = useMemo(() => {
    return produitsDataResponse?.rows || [];
  }, [produitsDataResponse]);

  // ========== 7. Rendu conditionnel simplifié ==========
  
  // État de chargement initial
  if (!initialFetchDone) {
    return (
      <PageWrapper>
        <PageTitle>Dashboard</PageTitle>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Initialisation du dashboard...</p>
        </div>
      </PageWrapper>
    );
  }

  // Pas de filtres valides après initialisation
  if (!hasValidFilters) {
    return (
      <PageWrapper>
        <PageTitle>Dashboard</PageTitle>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Veuillez sélectionner un tarif et des produits dans la sidebar pour afficher le dashboard.</p>
        </div>
      </PageWrapper>
    );
  }

  // ========== 8. Rendu principal ==========
  console.log("RENDERING DASHBOARD MAIN CONTENT:", { 
    hasValidFilters, 
    kpiData, 
    kpiLoading, 
    alertesMap: Object.keys(alertesMap).length 
  });

  return (
    <PageWrapper>
      <PageTitle>Dashboard</PageTitle>
      
      {/* Debug visuel optionnel - à supprimer en production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          padding: "10px", 
          backgroundColor: "#e8f5e8", 
          margin: "10px", 
          borderRadius: "4px",
          fontSize: "12px" 
        }}>
          DEBUG: hasValidFilters={hasValidFilters ? "true" : "false"} | 
          KPI={kpiLoading ? "loading" : kpiData ? "loaded" : "empty"} | 
          Alertes={Object.keys(alertesMap).length}
        </div>
      )}

      {/* Section KPI */}
      <KPISection 
        data={kpiData} 
        loading={kpiLoading} 
        error={kpiError}
        clickedCodPro={clickedCodPro}
        onClearClicked={handleClearClicked}
        produitsData={produitsData}
      />

      {/* Section Graphiques */}
      <GraphSection
        selectedCodPro={selectedCodPro}
        filters={filters}
        historiqueData={historiqueData}
        historiqueLoading={historiqueLoading}
        produitsData={produitsData}
      />

      {/* Table des produits */}
      <ProductsTable
        filters={filters}
        clickedCodPro={clickedCodPro}
        setClickedCodPro={handleSetClickedCodPro}
        selectedCodPro={selectedCodPro}
        setSelectedCodPro={handleSetSelectedCodPro}
        onInspectProduct={handleInspectProduct}
        alertesMap={alertesMap}
      />

      {/* Panel de détail */}
      <DashboardDetailPanel
        cod_pro={selectedProductDetails?.cod_pro}
        no_tarif={selectedProductDetails?.no_tarif}
        onClose={handleCloseDetailPanel}
      />
    </PageWrapper>
  );
}