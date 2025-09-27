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
    refint: null,  // Corrigé : utiliser refint au lieu de ref_crn
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
    const refintParam = searchParams.get("refint") || searchParams.get("ref_crn"); // Support des deux
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
    if (refintParam) setFilters((prev) => ({ ...prev, refint: refintParam }));
    if (qualiteParam) setFilters((prev) => ({ ...prev, qualite: qualiteParam }));
    if (groupingParam !== null) setFilters((prev) => ({ ...prev, grouping_crn: parseInt(groupingParam) }));
  }, [searchParams]);

  // ✅ fetchRows optimisé pour gérer la pagination correctement
  const fetchRows = useCallback(
    async (page, limit, filterModel, sortModelParam) => {
      if (selectedTarifs.length < 1) return { rows: [], total: 0 };

      // Utiliser le sortModel passé en paramètre ou le modèle actuel
      const effectiveSortModel = sortModelParam || sortModel;
      const sort_by = effectiveSortModel[0]?.field ?? defaultSortModel[0]?.field;
      const sort_dir = effectiveSortModel[0]?.sort ?? defaultSortModel[0]?.sort;

      // Ajuster la limite pour optimiser les performances
      // Le backend précharge 500 lignes sur la page 1 sans filtres
      const effectiveLimit = limit || 100;

      try {
        const response = await fetchComparatifTarifs({
          tarifs: selectedTarifs,
          ...filters,
          sort_by,
          sort_dir,
          page: page + 1, // backend = 1-based
          limit: effectiveLimit,
        });

        // Validation et nettoyage des données
        const cleanRows = (response.rows ?? [])
          .filter(Boolean)
          .filter((r) => !!r.cod_pro)
          .map(row => ({
            ...row,
            // S'assurer que tarifs est toujours un objet
            tarifs: row.tarifs || {},
            // Valeurs par défaut pour éviter les erreurs d'affichage
            refint: row.refint || '',
            nom_pro: row.nom_pro || '',
            qualite: row.qualite || '',
            statut: row.statut || 0,
          }));

        return {
          rows: cleanRows,
          total: response.total || 0,
          meta: response.meta || {}
        };
      } catch (err) {
        console.error("❌ Erreur fetchRows:", err);
        toast.error("Erreur lors du chargement des tarifs.");
        return { rows: [], total: 0 };
      }
    },
    [selectedTarifs, filters, sortModel, defaultSortModel]
  );

  // ✅ Initialisation du sort model uniquement si vide
  useEffect(() => {
    if (sortModel.length === 0) {
      setSortModel(defaultSortModel);
    }
  }, [defaultSortModel]);

  // ✅ Auto-tri selon nb de tarifs sélectionnés
  useEffect(() => {
    const currentField = sortModel[0]?.field;
    const expectedField = defaultSortModel[0]?.field;
    
    // Changement de tri seulement si on passe d'un mode à l'autre (1 tarif <-> 2+ tarifs)
    if (currentField !== expectedField && 
        ((currentField === "ratio_max_min" && selectedTarifs.length < 2) ||
         (currentField === "cod_pro" && selectedTarifs.length >= 2))) {
      setSortModel(defaultSortModel);
    }
  }, [selectedTarifs.length, sortModel, defaultSortModel]);

  // ✅ Memoize du resetKey pour éviter les rechargements inutiles
  const resetKey = useMemo(() => {
    return JSON.stringify({
      tarifs: selectedTarifs,
      filters: filters,
    });
  }, [selectedTarifs, filters]);

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
              <strong>📈 Ratio</strong> : max/min affiché (seuil ≥ 1.2)
            </Box>
          )}
        </Box>
        
        {/* Info sur le nombre total de produits */}
        {selectedTarifs.length > 0 && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            bgcolor: 'info.lighter', 
            borderRadius: 1,
            fontSize: '0.9rem'
          }}>
            💡 Conseil : Utilisez la pagination en bas du tableau pour naviguer dans les résultats. 
            Pour de meilleures performances avec beaucoup de produits, augmentez la taille de page à 100 ou 200 lignes.
          </Box>
        )}
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
            key={resetKey}
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