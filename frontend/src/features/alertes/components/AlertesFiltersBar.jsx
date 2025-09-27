// 📁 src/features/alertes/AlertesFiltersBar.jsx
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Button } from "@mui/material";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import AutocompleteRefCrn from "@/shared/components/inputs/autocomplete/AutocompleteRefCrn";
import AutocompleteRefCrnFromCodpro from "@/shared/components/inputs/autocomplete/AutocompleteRefCrnFromCodpro";
import { useEffect, useState, useRef } from "react";

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

  // Appelle onChange à chaque changement de filtre (100% live)
  useEffect(() => {
    const cleanedFilters = {
      ...localFilters,
      code_regle: localFilters.code_regle === "" ? null : localFilters.code_regle,
    };
    onChange(cleanedFilters);
    // eslint-disable-next-line
  }, [localFilters]);

  const handleReset = () => {
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
    onChange(reset);
  };

  useEffect(() => {
    if (!localFilters.cod_pro || localFilters.grouping_crn === 1 || localFilters.ref_crn) return;
    import("@/api/suggestionApi").then(({ getRefCrnByCodPro }) => {
      getRefCrnByCodPro(localFilters.cod_pro)
        .then((list) => {
          if (list.length === 1) {
            setLocalFilters((f) => ({ ...f, ref_crn: list[0] }));
          }
        })
        .catch(console.error);
    });
  }, [localFilters.cod_pro, localFilters.grouping_crn]);

  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
      <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Règle</InputLabel>
        <Select
          value={localFilters.code_regle || ""}
          onChange={(e) => setLocalFilters((f) => ({ ...f, code_regle: e.target.value }))}
          label="Règle"
        >
          <MenuItem value="">Toutes</MenuItem>
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
        onChange={(val) => setLocalFilters((f) => ({ ...f, cod_pro: val, ref_crn: null }))}
        sx={{ minWidth: 250 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={localFilters.force_single === true}
            onChange={(e) => setLocalFilters((f) => ({ ...f, force_single: e.target.checked }))}
          />
        }
        label="Recherche par référence unique"
      />

      {!localFilters.grouping_crn && (
        localFilters.cod_pro ? (
          <AutocompleteRefCrnFromCodpro
            key={`from-codpro-${localFilters.cod_pro}`}
            cod_pro={localFilters.cod_pro}
            value={localFilters.ref_crn}
            onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
            sx={{ minWidth: 250 }}
          />
        ) : (
          <AutocompleteRefCrn
            key={`crn-reset-${resetCount}`}
            value={localFilters.ref_crn}
            onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
            sx={{ minWidth: 250 }}
          />
        )
      )}

      <SelectNoTarif
        value={localFilters.no_tarif}
        onChange={(val) => setLocalFilters((f) => ({ ...f, no_tarif: val }))}
        sx={{ minWidth: 200 }}
      />

      <Button
        variant="contained"
        color="secondary"
        onClick={handleReset}
        sx={{ ml: 1 }}
      >
        Réinitialiser
      </Button>
    </Box>
  );
}
