// 📁 src/features/alertes/components/AlertesFiltersBar.jsx
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button } from "@mui/material";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import AutocompleteRefCrn from "@/shared/components/inputs/autocomplete/AutocompleteRefCrn";
import AutocompleteRefCrnFromCodpro from "@/shared/components/inputs/autocomplete/AutocompleteRefCrnFromCodpro";
import { useEffect, useState, useCallback, useRef } from "react";

export default function AlertesFiltersBar({ regles = [], onChange }) {
  const [localFilters, setLocalFilters] = useState({
    code_regle: "",
    cod_pro: null,
    ref_crn: null,
    grouping_crn: 0,
    no_tarif: null,
    force_single: false,
  });
  const [resetCount, setResetCount] = useState(0);
  
  // ✅ FIXE: Ref pour éviter les re-créations de notifyChange
  const onChangeRef = useRef(onChange);
  
  // Maintenir la ref à jour
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ✅ FIXE: notifyChange stable sans dépendance onChange
  const notifyChange = useCallback((filters) => {
    const cleanedFilters = {
      ...filters,
      code_regle: filters.code_regle === "" ? null : filters.code_regle,
    };
    onChangeRef.current(cleanedFilters);
  }, []); // Pas de dépendances = fonction stable

  // Appelle onChange à chaque changement de filtre (100% live)
  useEffect(() => {
    notifyChange(localFilters);
  }, [localFilters, notifyChange]);

  // ✅ FIXE: handleReset stable
  const handleReset = useCallback(() => {
    const reset = {
      code_regle: "",
      cod_pro: null,
      ref_crn: null,
      grouping_crn: 0,
      no_tarif: null,
      force_single: false,
    };
    setLocalFilters(reset);
    setResetCount(c => c + 1);
    notifyChange(reset);
  }, [notifyChange]);

  // ✅ FIXE: Auto-sélection ref_crn optimisée
  useEffect(() => {
    if (!localFilters.cod_pro || localFilters.grouping_crn === 1 || localFilters.ref_crn) {
      return;
    }
    
    let cancelled = false;
    
    import("@/api/suggestionApi")
      .then(({ getRefCrnByCodPro }) => {
        return getRefCrnByCodPro(localFilters.cod_pro);
      })
      .then((list) => {
        if (!cancelled && list && list.length === 1) {
          setLocalFilters((f) => ({ ...f, ref_crn: list[0] }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Erreur auto-sélection ref_crn:", error);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [localFilters.cod_pro, localFilters.grouping_crn, localFilters.ref_crn]);

  // ✅ FIXE: Gestionnaires d'événements optimisés
  const handleRegleChange = useCallback((e) => {
    setLocalFilters((f) => ({ ...f, code_regle: e.target.value }));
  }, []);

  const handleRefintChange = useCallback((val) => {
    setLocalFilters((f) => ({ ...f, cod_pro: val, ref_crn: null }));
  }, []);

  const handleForceSingleChange = useCallback((e) => {
    setLocalFilters((f) => ({ ...f, force_single: e.target.checked }));
  }, []);

  const handleRefCrnChange = useCallback((ref_crn) => {
    setLocalFilters((f) => ({ ...f, ref_crn }));
  }, []);

  const handleNoTarifChange = useCallback((val) => {
    setLocalFilters((f) => ({ ...f, no_tarif: val }));
  }, []);

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2, alignItems: "center" }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Règle</InputLabel>
        <Select
          value={localFilters.code_regle || ""}
          onChange={handleRegleChange}
          label="Règle"
        >
          <MenuItem value="">
            <em>Toutes les règles</em>
          </MenuItem>
          {regles.map((r) => (
            <MenuItem key={r.code_regle} value={r.code_regle}>
              {r.code_regle} – {r.libelle_regle}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <AutocompleteRefint
        key={`refint-reset-${resetCount}`}
        value={localFilters.cod_pro}
        onChange={handleRefintChange}
        sx={{ minWidth: 250 }}
        size="small"
      />
      
      <FormControlLabel
        control={
          <Checkbox
            checked={localFilters.force_single === true}
            onChange={handleForceSingleChange}
            size="small"
          />
        }
        label="Recherche par référence unique"
        sx={{ ml: 1 }}
      />

      {!localFilters.grouping_crn && (
        localFilters.cod_pro ? (
          <AutocompleteRefCrnFromCodpro
            key={`from-codpro-${localFilters.cod_pro}`}
            cod_pro={localFilters.cod_pro}
            value={localFilters.ref_crn}
            onChange={handleRefCrnChange}
            sx={{ minWidth: 250 }}
            size="small"
          />
        ) : (
          <AutocompleteRefCrn
            key={`crn-reset-${resetCount}`}
            value={localFilters.ref_crn}
            onChange={handleRefCrnChange}
            sx={{ minWidth: 250 }}
            size="small"
          />
        )
      )}

      <SelectNoTarif
        value={localFilters.no_tarif}
        onChange={handleNoTarifChange}
        sx={{ minWidth: 200 }}
        size="small"
      />

      <Button
        variant="contained"
        color="secondary"
        onClick={handleReset}
        sx={{ ml: 1, minWidth: 120 }}
        size="small"
      >
        Réinitialiser
      </Button>
    </Box>
  );
}