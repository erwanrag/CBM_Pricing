// 📄 src/features/compare_tarif/components/CompareTarifSelectorForm.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Stack,
  Chip,
  Checkbox,
  FormControlLabel,
  Grid,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import AutocompleteRefCrn from "@/shared/components/inputs/autocomplete/AutocompleteRefCrn";
import AutocompleteRefCrnFromCodpro from "@/shared/components/inputs/autocomplete/AutocompleteRefCrnFromCodpro";
import SelectQualite from "@/shared/components/inputs/selects/SelectQualite";
import { getRefCrnByCodPro } from "@/api/suggestionApi";

const TARIF_COLORS = ["#FDE68A", "#FCA5A5", "#A5F3FC"];

export default function CompareTarifSelectorForm({
  onCompare,
  filters,
  onFilterChange,
}) {
  const [tarifs, setTarifs] = useState([null, null]);

  const handleTarifChange = (index, value) => {
    const newTarifs = [...tarifs];
    newTarifs[index] = value;
    setTarifs(newTarifs);
    onCompare(newTarifs.filter(Boolean));
  };

  const handleAddTarif = () => {
    if (tarifs.length < 3) {
      setTarifs([...tarifs, null]);
    }
  };

  const handleRemoveTarif = (index) => {
    setTarifs((currentTarifs) => {
      if (currentTarifs.length <= 2) {
        const newTarifs = [...currentTarifs];
        newTarifs[index] = null;
        onCompare(newTarifs.filter(Boolean));
        return newTarifs;
      }
      const filtered = currentTarifs.filter((_, i) => i !== index);
      onCompare(filtered.filter(Boolean));
      return filtered;
    });
  };

  const handleResetFilters = () => {
    setTarifs([null, null]);
    onCompare([]);
    onFilterChange({
      cod_pro: null,
      ref_crn: null,
      qualite: null,
      grouping_crn: 0,
      force_single: false,
    });
  };

  useEffect(() => {
    if (!filters.cod_pro || filters.grouping_crn === 1 || filters.ref_crn) return;

    getRefCrnByCodPro(filters.cod_pro)
      .then((list) => {
        if (list.length === 1) {
          onFilterChange({ ...filters, ref_crn: list[0] });
        }
      })
      .catch(console.error);
    // eslint-disable-next-line
  }, [filters.cod_pro, filters.grouping_crn]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        🔎 Recherche Produit / Référence
      </Typography>

      <Grid container spacing={2} alignItems="flex-end">
        <Grid>
          <AutocompleteRefint
            value={filters.cod_pro}
            onChange={(cod_pro) =>
              onFilterChange({ ...filters, cod_pro, ref_crn: null })
            }
            sx={{ minWidth: 250 }}
          />
        </Grid>
        <FormControlLabel
          control={
            <Checkbox
              checked={filters.force_single || false}
              onChange={e => onFilterChange({ ...filters, force_single: e.target.checked })}
            />
          }
          label="Recherche par référence unique"
        />

        {!filters.grouping_crn && (
          <Grid>
            {filters.cod_pro ? (
              <AutocompleteRefCrnFromCodpro
                key={`from-codpro-${filters.cod_pro}`}
                cod_pro={filters.cod_pro}
                value={filters.ref_crn}
                onChange={(ref_crn) => onFilterChange({ ...filters, ref_crn })}
                sx={{ minWidth: 250 }}
              />
            ) : (
              <AutocompleteRefCrn
                key="standard-crn"
                value={filters.ref_crn}
                onChange={(ref_crn) => onFilterChange({ ...filters, ref_crn })}
                sx={{ minWidth: 250 }}
              />
            )}
          </Grid>
        )}

        <Grid>
          <SelectQualite
            value={filters.qualite || ""}
            onChange={(qualite) => onFilterChange({ ...filters, qualite })}
            sx={{ minWidth: 180 }}
          />
        </Grid>

        <Grid sx={{ display: "flex", alignItems: "center" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.grouping_crn === 1}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    grouping_crn: e.target.checked ? 1 : 0,
                    ref_crn: null,
                  })
                }
              />
            }
            label="Grouper par réf constructeur"
          />
          <Button
            size="small"
            variant="outlined"
            onClick={handleResetFilters}
            sx={{ ml: 2 }}
          >
            ♻️ Réinitialiser
          </Button>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight="bold">
        🎯 Tarifs à consulter (1 à 3)
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
        {tarifs.map((value, index) => (
          <Stack direction="row" spacing={1} alignItems="center" key={index}>
            <SelectNoTarif
              label={`Tarif ${index + 1}`}
              value={value}
              onChange={(val) => handleTarifChange(index, val)}
              sx={{
                minWidth: 220,
                backgroundColor: TARIF_COLORS[index % TARIF_COLORS.length] + "55",
              }}
            />
            {value && (
              <IconButton
                size="small"
                onClick={() => handleRemoveTarif(index)}
                sx={{
                  border: "1px solid #ccc",
                  bgcolor: "#fff",
                  "&:hover": { bgcolor: "#eee" },
                }}
              >
                <CloseIcon
                  fontSize="small"
                  aria-label={`Retirer le tarif ${value}`}
                />
              </IconButton>
            )}
          </Stack>
        ))}

        {tarifs.length < 3 && tarifs.filter(Boolean).length === 2 && (
          <Tooltip title="Ajouter un 3e tarif" arrow>
            <IconButton
              color="primary"
              onClick={handleAddTarif}
              aria-label="Ajouter un troisième tarif"
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      
    </Box>
  );
}
