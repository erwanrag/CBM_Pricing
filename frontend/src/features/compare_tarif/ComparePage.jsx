import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Stack } from "@mui/material";
import PageWrapper from "@/shared/components/page/PageWrapper";
import PageTitle from "@/shared/components/page/PageTitle";
import CompareTarifSelectorForm from "./components/CompareTarifSelectorForm";
import CompareTarifTable from "./components/CompareTarifTable";
import ExportAsyncButton from "./components/ExportAsyncButton";
import { fetchComparatifTarifs } from "@/api/compareTarifApi";
import ErrorBoundary from "@/shared/components/error/ErrorBoundary";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";

export default function ComparePage() {
  const [selectedTarifs, setSelectedTarifs] = useState([]);
  const [searchParams] = useSearchParams();
  const [colVisibility, setColVisibility] = useState(null);
  const [filters, setFilters] = useState({
    cod_pro: null,
    ref_crn: null,
    qualite: null,
    grouping_crn: 0,
  });
  const [sortModel, setSortModel] = useState([]);

  const [options, setOptions] = useState({
    showQte: true,
    showMargeRealisee: true,
    showCA: true,
  });

  // ✅ Memoize du sort model par défaut
  const defaultSortModel = useMemo(() => {
    return selectedTarifs.length >= 2
      ? [{ field: "ratio_max_min", sort: "desc" }]
      : [{ field: "cod_pro", sort: "asc" }];
  }, [selectedTarifs.length]);

  // Lecture des paramètres URL
  useEffect(() => {
    const tarifsParam = searchParams.get("tarifs");
    const codProParam = searchParams.get("cod_pro");
    const refCrnParam = searchParams.get("ref_crn");
    const qualiteParam = searchParams.get("qualite");
    const groupingParam = searchParams.get("grouping_crn");

    if (tarifsParam) {
      const parsed = tarifsParam
        .split(",")
        .map((t) => parseInt(t.trim()))
        .filter((v) => !isNaN(v));
      setSelectedTarifs(parsed);
    }
    if (codProParam) setFilters((prev) => ({ ...prev, cod_pro: parseInt(codProParam) }));
    if (refCrnParam) setFilters((prev) => ({ ...prev, ref_crn: refCrnParam }));
    if (qualiteParam) setFilters((prev) => ({ ...prev, qualite: qualiteParam }));
    if (groupingParam !== null) setFilters((prev) => ({ ...prev, grouping_crn: parseInt(groupingParam) }));
  }, [searchParams]);

  // ✅ fetchRows stable avec useCallback pour éviter les re-renders
  const fetchRows = useCallback(
    async (page, limit) => {
      if (selectedTarifs.length < 1) return { rows: [], total: 0 };

      const sort_by = sortModel[0]?.field ?? defaultSortModel[0]?.field;
      const sort_dir = sortModel[0]?.sort ?? defaultSortModel[0]?.sort;

      try {
        const response = await fetchComparatifTarifs({
          tarifs: selectedTarifs,
          ...filters,
          sort_by,
          sort_dir,
          page: page + 1, // backend = 1-based
          limit,
          colVisibility,
        });

        return {
          rows: (response.rows ?? []).filter(Boolean).filter((r) => !!r.cod_pro),
          total: response.total,
        };
      } catch (err) {
        console.error("❌ Erreur fetchRows:", err);
        toast.error("Erreur lors du chargement des tarifs.");
        return { rows: [], total: 0 };
      }
    },
    [selectedTarifs, filters, sortModel, colVisibility, defaultSortModel]
  );

  // ✅ Initialisation du sort model uniquement si vide
  useEffect(() => {
    if (sortModel.length === 0) {
      setSortModel(defaultSortModel);
    }
  }, [defaultSortModel, sortModel.length]);

  // ✅ Auto-tri selon nb de tarifs sélectionnés - plus conservateur
  useEffect(() => {
    const currentField = sortModel[0]?.field;
    const expectedField = defaultSortModel[0]?.field;
    
    if (currentField !== expectedField) {
      setSortModel(defaultSortModel);
    }
  }, [selectedTarifs.length, sortModel, defaultSortModel]);

  // ✅ Memoize du resetKey pour éviter les rechargements inutiles
  const resetKey = useMemo(() => {
    return JSON.stringify({
      tarifs: selectedTarifs,
      filters: filters,
      sort: sortModel
    });
  }, [selectedTarifs, filters, sortModel]);

  return (
    <PageWrapper>
      <PageTitle>
        📊{" "}
        {selectedTarifs.length <= 1
          ? "Consultation tarifaire"
          : "Comparaison tarifaire"}
      </PageTitle>

      <Stack spacing={2} mb={3}>
        <CompareTarifSelectorForm
          onCompare={setSelectedTarifs}
          filters={filters}
          onFilterChange={setFilters}
        />
        <ExportAsyncButton tarifs={selectedTarifs} filters={filters} />
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mt: 1 }}>
          <Box>
            <strong>🎯 Marge</strong> : dégradé dynamique
          </Box>
          {selectedTarifs.length > 1 && (
            <Box>
              <strong>📈 Ratio</strong> max/min affiché (seuil ≥ 1.2)
            </Box>
          )}
        </Box>
      </Stack>

      <ErrorBoundary fallback={<div>Erreur lors du chargement des données.</div>}>
        {selectedTarifs.length < 1 ? (
          <Box py={5} textAlign="center" color="text.secondary">
            <strong>
              Veuillez sélectionner au moins un tarif pour lancer la comparaison.
            </strong>
          </Box>
        ) : (
          <CompareTarifTable
            key={resetKey} // ✅ Force le remount quand nécessaire
            tarifs={selectedTarifs}
            fetchRows={fetchRows}
            options={options}
            onOptionsChange={setOptions}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            colVisibility={colVisibility}
            setColVisibility={setColVisibility}
          />
        )}
      </ErrorBoundary>
    </PageWrapper>
  );
}