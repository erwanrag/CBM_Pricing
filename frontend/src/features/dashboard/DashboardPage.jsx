// src/features/dashboard/DashboardPage.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLayout } from "@/context/layout/LayoutContext";
import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import KPISection from "./components/DashboardKPI";
import GraphSection from "./components/GraphSection";
import ProductsTable from "./components/ProductsTable";
import DashboardDetailPanel from "./components/DashboardDetail";
import {
  fetchDashboardKPI,
  fetchDashboardProducts,
  fetchHistoriquePrixMarge,
} from "@/api/dashboardApi";
import { getAlertesMap } from "@/api/alertesApi";
import { resolveCodPro } from "@/api/identifierApi";
import { toast } from "react-toastify";

export default function DashboardPage() {
  // ========== 1. Initialisation et CONTEXT ==========

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = useLayout();

  // Filtres issus du contexte global (sidebar)
  const filters = useMemo(() => context?.filters || { no_tarif: null }, [context?.filters]);

  // Sélection locale pour l’inspection détaillée
  const [selectedCodPro, setSelectedCodPro] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [clickedCodPro, setClickedCodPro] = useState(null);


  // ========== 2. Gestion du routing et initialisation des filtres ==========

  // 2.1. Si on arrive via une URL avec des paramètres, on résout la liste de produits à afficher
  const resolveInitialCodPro = useCallback(async () => {
    const cod_pro = searchParams.get("cod_pro");
    const ref_crn = searchParams.get("ref_crn");
    const no_tarif = Number(searchParams.get("no_tarif") || 0);

    const alreadyHandled = sessionStorage.getItem("dashboardInit") === "1";
    if (!initialFetchDone && !alreadyHandled && no_tarif && (cod_pro || ref_crn)) {
      try {
        const payload = {
          no_tarif,
          cod_pro: cod_pro ? Number(cod_pro) : undefined,
          ref_crn: ref_crn || undefined,
          grouping_crn: 1,
        };

        const res = await resolveCodPro(payload);
        if (!res.data?.length) {
          toast.info("Aucun produit trouvé pour les filtres sélectionnés.");
          return;
        }
        const outputFilters = {
          no_tarif,
          cod_pro_list: res.data,
          selected_cod_pro: cod_pro ? Number(cod_pro) : res.data[0] || null,
        };
        context?.setFilters?.(outputFilters);
        setSelectedCodPro(outputFilters.selected_cod_pro);
        sessionStorage.setItem("dashboardInit", "1");
        setInitialFetchDone(true);
      } catch (err) {
        console.error("Erreur résolution cod_pro_list :", err);
      }
    }
  }, [context, initialFetchDone, searchParams]);

  useEffect(() => { resolveInitialCodPro(); }, [resolveInitialCodPro]);

  // 2.2. Highlight automatique si context change (filtre sélectionné)
  useEffect(() => {
    if (filters?.selected_cod_pro) setSelectedCodPro(filters.selected_cod_pro);
    else setSelectedCodPro(null);
  }, [filters?.selected_cod_pro]);

  // 2.3. Marque la page Dashboard pour le context global (pour afficher les bons filtres dans la sidebar)
  useEffect(() => {
    context?.setFilterType?.("dashboard");
    return () => {
      context?.setFilterType?.(null);
    };
  }, [context]);

  // ========== 3. Déduction de la "source de vérité" pour codProList ==========

  const codProList = useMemo(
    () =>
      filters?.cod_pro_list && filters.cod_pro_list.length > 0
        ? filters.cod_pro_list
        : filters?.selected_cod_pro
          ? [filters.selected_cod_pro]
          : [],
    [filters.cod_pro_list, filters.selected_cod_pro, filters._forceRefresh] // <-- ajoute ici
  );
  // Définition de la pagination

  const pageSize = 200;
  const limitGraph = Math.min(400, codProList.length || 400);
  // Filtres stables pour requêtes paginées ou usages répétés
  const stableFilters = useMemo(
    () => ({
      no_tarif: filters.no_tarif,
      cod_pro_list: codProList,
      _forceRefresh: filters._forceRefresh
    }),
    [filters.no_tarif, codProList.join(","), filters._forceRefresh]
  );

  // Pour éviter les requêtes inutiles (et les 422)
  const enabled =
    !!filters?.no_tarif && Array.isArray(codProList) && codProList.length > 0;

  // ========== 4. Récupération des données via React Query ==========

  // 4.1. KPI principaux (CA, marge, etc.)
  const { data: productsKpiData = { items: [] }, isLoading: loadingKpi } = useQuery({
    enabled,
    queryKey: ["dashboard-kpi", filters.no_tarif, codProList, filters._forceRefresh],
    queryFn: () =>
      fetchDashboardKPI({
        no_tarif: filters.no_tarif,
        cod_pro_list: codProList,
        _forceRefresh: filters._forceRefresh
      }),
  });

  // 4.2. Historique prix / marge (pour le graphique)
  const { data: historiqueData = [], isLoading: loadingHist } = useQuery({
    enabled,
    queryKey: ["dashboard-historique", filters.no_tarif, codProList, filters._forceRefresh],
    queryFn: () =>
      fetchHistoriquePrixMarge({
        no_tarif: filters.no_tarif,
        cod_pro_list: codProList,
        _forceRefresh: filters._forceRefresh
      }),
  });

  // 4.3. Tableau produits
  const { data: productsData = { rows: [] } } = useQuery({
    enabled,
    queryKey: ["dashboard-products", filters.no_tarif, codProList, filters._forceRefresh],
    queryFn: () =>
      fetchDashboardProducts(
        {
          no_tarif: filters.no_tarif,
          cod_pro_list: codProList,
          _forceRefresh: filters._forceRefresh
        },
        0,
        pageSize
      ),
  });

  // 4.4. Alertes map (cod_pro → alertes) pour surlignage
  const { data: alertesMap = {}, isLoading: loadingAlertes } = useQuery({
    enabled,
    queryKey: ["dashboard-alertes", filters.no_tarif, codProList, filters._forceRefresh],
    queryFn: async () => {
      const res = await getAlertesMap(filters.no_tarif, codProList);
      const items = res.items || []; // ← Prends bien la propriété items !
      const map = {};
      items.forEach(({ cod_pro, code_regle, champ }) => {
        map[String(cod_pro)] = map[String(cod_pro)] || [];
        map[String(cod_pro)].push({ code_regle, champ });
      });
      return map;
    },
  });

  // 4.5. Produits complets pour le graph de répartition
  const { data: allProductsData = { rows: [] } } = useQuery({
    enabled,
    queryKey: ["dashboard-products-full", filters.no_tarif, codProList, filters._forceRefresh],
    queryFn: () =>
      fetchDashboardProducts(
        {
          no_tarif: filters.no_tarif,
          cod_pro_list: codProList,
          _forceRefresh: filters._forceRefresh
        },
        0,
        limitGraph
      ),
  });

  // ========== 5. Affichage conditionnel (si pas de filtre sélectionné) ==========

  if (!enabled) {
    return (
      <PageWrapper>
        <PageTitle>📊 Dashboard Pricing CBM</PageTitle>
        <p>
          Aucun produit à afficher. Veuillez sélectionner des filtres et cliquer sur
          "Valider".
        </p>
      </PageWrapper>
    );
  }

  // ========== 6. Rendu UI principal ==========

  return (
    <PageWrapper>
      <PageTitle>📊 Dashboard Pricing CBM</PageTitle>

      <KPISection
        products={productsKpiData.items ?? []}
        clickedCodPro={clickedCodPro}
        onClearClicked={() => setClickedCodPro(null)}
      />

      <GraphSection
        selectedCodPro={clickedCodPro}
        historique={historiqueData}
        produits={allProductsData.rows}
      />

      <ProductsTable
        filters={stableFilters}
        clickedCodPro={clickedCodPro}
        setClickedCodPro={setClickedCodPro}
        selectedCodPro={selectedCodPro}
        setSelectedCodPro={setSelectedCodPro}
        onInspectProduct={setSelectedProductDetails}
        alertesMap={alertesMap}
      />

      <DashboardDetailPanel
        cod_pro={selectedProductDetails?.cod_pro}
        no_tarif={filters.no_tarif}
        onClose={() => setSelectedProductDetails(null)}
      />
    </PageWrapper>
  );
}
