// 📁 src/features/dashboard/DashboardPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  // ========= 1. Contexte & URL =========
  const [searchParams] = useSearchParams();
  const { filters, setFilters, setFilterType } = useLayout();

  // ========= 2. États locaux =========
  const [selectedCodPro, setSelectedCodPro] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [clickedCodPro, setClickedCodPro] = useState(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // ========= 3. Définir le type de filtre actif =========
  useEffect(() => {
    setFilterType?.("dashboard");
  }, [setFilterType]);

  // ========= 4. Init depuis l’URL (une seule fois tant que filtres vides) =========
  useEffect(() => {
    const initFromUrl = async () => {
      // Si les filtres sont déjà valides, on ne fait rien
      if (filters?.no_tarif && filters?.cod_pro_list?.length) {
        setInitialFetchDone(true);
        return;
      }

      const noTarifParam = searchParams.get("no_tarif");
      const codProParam = searchParams.get("cod_pro");
      const ref_crn = searchParams.get("ref_crn");
      const grouping_crn = Number(searchParams.get("grouping_crn") || 1);

      if (!noTarifParam) {
        // Pas de no_tarif → on laisse la sidebar gérer
        setInitialFetchDone(true);
        return;
      }

      const no_tarif = Number(noTarifParam);

      // Cas simple : pas de cod_pro/ref_crn → on pose juste le no_tarif
      if (!codProParam && !ref_crn) {
        setFilters?.((prev) => ({
          ...prev,
          no_tarif,
        }));
        setInitialFetchDone(true);
        return;
      }

      const cod_pro = codProParam ? Number(codProParam) : undefined;

      try {
        const payload = {
          no_tarif,
          cod_pro,
          ref_crn: ref_crn || undefined,
          grouping_crn,
        };

        const res = await resolveCodPro(payload);

        const resolvedList =
          res?.data?.length ? res.data : cod_pro ? [cod_pro] : [];

        if (!resolvedList.length) {
          toast.info("Aucun produit trouvé pour les filtres sélectionnés.");
          setInitialFetchDone(true);
          return;
        }

        const selected = cod_pro ?? resolvedList[0];

        setFilters?.((prev) => ({
          ...prev,
          no_tarif,
          cod_pro_list: resolvedList,
          selected_cod_pro: selected,
          _forceRefresh: Date.now().toString(),
        }));

        setSelectedCodPro(selected);
      } catch (error) {
        console.error("Erreur résolution URL:", error);
        toast.error("Erreur lors de la résolution des produits");
      } finally {
        setInitialFetchDone(true);
      }
    };

    initFromUrl();
  }, [searchParams, filters, setFilters]);

  // ========= 5. Handlers stables =========
  const handleSetSelectedCodPro = useCallback((codPro) => {
    setSelectedCodPro(codPro);
  }, []);

  const handleSetClickedCodPro = useCallback((codPro) => {
    setClickedCodPro(codPro);
  }, []);

  const handleClearClicked = useCallback(() => {
    setClickedCodPro(null);
  }, []);

  const handleInspectProduct = useCallback(
    (codPro) => {
      setSelectedCodPro(codPro);
      setSelectedProductDetails({
        cod_pro: codPro,
        no_tarif: filters?.no_tarif,
      });
    },
    [filters?.no_tarif]
  );

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedCodPro(null);
    setSelectedProductDetails(null);
  }, []);

  // ========= 6. Filtres valides + flag pour les queries =========
  const hasValidFilters = Boolean(
    filters?.no_tarif && filters?.cod_pro_list?.length > 0
  );

  // Très important : les hooks `useQuery` doivent être appelés quoi qu’il arrive.
  // On bloque juste leur exécution avec `enabled`.
  const queriesEnabled = initialFetchDone && hasValidFilters;

  // ========= 7. Queries React Query (toujours appelées, mais conditionnées par `enabled`) =========
  const {
    data: kpiData,
    isLoading: kpiLoading,
    error: kpiError,
  } = useQuery({
    queryKey: [
      "dashboard-kpi",
      filters?.no_tarif,
      filters?.cod_pro_list,
      filters?._forceRefresh,
    ],
    queryFn: () => fetchDashboardKPI(filters),
    enabled: queriesEnabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: alertesMap = {} } = useQuery({
    queryKey: [
      "alertes-map",
      filters?.no_tarif,
      filters?.cod_pro_list,
      filters?._forceRefresh,
    ],
    enabled: queriesEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      try {
        const result = await getAlertesMap(
          filters.no_tarif,
          filters.cod_pro_list
        );

        const items = result.items || [];
        const map = {};

        items.forEach(({ cod_pro, champ, code_regle }) => {
          const key = String(cod_pro);
          if (!map[key]) map[key] = [];
          map[key].push({ code_regle, champ });
        });

        return map;
      } catch (error) {
        console.error("Erreur chargement alertes:", error);
        return {};
      }
    },
  });

  const {
    data: historiqueData,
    isLoading: historiqueLoading,
  } = useQuery({
    queryKey: [
      "dashboard-historique",
      filters?.no_tarif,
      filters?.cod_pro_list,
      filters?._forceRefresh,
    ],
    queryFn: () =>
      fetchHistoriquePrixMarge({
        no_tarif: filters.no_tarif,
        cod_pro_list: filters.cod_pro_list,
      }),
    enabled: queriesEnabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: produitsDataResponse,
    isLoading: produitsLoading,
  } = useQuery({
    queryKey: [
      "dashboard-products-graph",
      filters?.no_tarif,
      filters?.cod_pro_list,
      filters?._forceRefresh,
    ],
    queryFn: () => fetchDashboardProducts(filters, 0, 100),
    enabled: queriesEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ========= 8. Données mémoïsées =========
  const produitsData = useMemo(
    () => produitsDataResponse?.rows || [],
    [produitsDataResponse]
  );

  // ========= 9. Rendu conditionnel (APRÈS tous les hooks) =========

  if (!initialFetchDone) {
    // On a déjà appelé tous les hooks au-dessus, donc on respecte les règles.
    return (
      <PageWrapper>
        <PageTitle>Dashboard</PageTitle>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Initialisation du dashboard...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!hasValidFilters) {
    return (
      <PageWrapper>
        <PageTitle>Dashboard</PageTitle>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>
            Veuillez sélectionner un tarif et des produits dans la sidebar pour
            afficher le dashboard.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageTitle>Dashboard</PageTitle>

      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "#e8f5e8",
            margin: "10px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          DEBUG: hasValidFilters={hasValidFilters ? "true" : "false"} | KPI=
          {kpiLoading ? "loading" : kpiData ? "loaded" : "empty"} | Alertes=
          {Object.keys(alertesMap).length}
        </div>
      )}

      <KPISection
        data={kpiData}
        loading={kpiLoading}
        error={kpiError}
        clickedCodPro={clickedCodPro}
        onClearClicked={handleClearClicked}
        produitsData={produitsData}
      />

      <GraphSection
        selectedCodPro={selectedCodPro}
        filters={filters}
        historiqueData={historiqueData}
        historiqueLoading={historiqueLoading}
        produitsData={produitsData}
      />

      <ProductsTable
        filters={filters}
        clickedCodPro={clickedCodPro}
        setClickedCodPro={handleSetClickedCodPro}
        selectedCodPro={selectedCodPro}
        setSelectedCodPro={handleSetSelectedCodPro}
        onInspectProduct={handleInspectProduct}
        alertesMap={alertesMap}
      />

      <DashboardDetailPanel
        cod_pro={selectedProductDetails?.cod_pro}
        no_tarif={selectedProductDetails?.no_tarif}
        onClose={handleCloseDetailPanel}
      />
    </PageWrapper>
  );
}
