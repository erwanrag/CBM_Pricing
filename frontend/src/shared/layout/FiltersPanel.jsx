// 📁 src/shared/layout/FiltersPanel.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Typography, FormControlLabel, Checkbox, Button, Stack, IconButton, Tooltip, Divider
} from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import AutocompleteRefCrn from "@/shared/components/inputs/autocomplete/AutocompleteRefCrn";
import AutocompleteRefCrnFromCodpro from "@/shared/components/inputs/autocomplete/AutocompleteRefCrnFromCodpro";
import { toast } from "react-toastify";
import { resolveCodPro } from "@/api";
import { useLayout } from "@/context/layout/LayoutContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const initialState = {
  no_tarif: "",
  cod_pro: null,
  ref_crn: null,
  use_grouping: false,
};

const FiltersPanel = () => {
  const { setFilters } = useLayout();
  const [localFilters, setLocalFilters] = useState(initialState);
  const [resetCount, setResetCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- Initialisation auto via URL
  useEffect(() => {
    const codProParam = searchParams.get("cod_pro");
    const noTarifParam = searchParams.get("no_tarif");
    const refCrnParam = searchParams.get("ref_crn");
    const groupingParam = searchParams.get("grouping_crn");
    if (codProParam && noTarifParam) {
      setLocalFilters({
        ...initialState,
        no_tarif: parseInt(noTarifParam),
        cod_pro: codProParam,
        ref_crn: refCrnParam || null,
        use_grouping: groupingParam === "1" ? true : false,
      });
    }
  }, [searchParams]);

  // --- Reset / clear
  const handleClear = () => {
    setLocalFilters(initialState);
    setFilters({});
    setResetCount(c => c + 1);
    navigate("/dashboard");
  };

  // --- Submit
  const handleSubmit = async () => {
    if (!localFilters.no_tarif) {
      toast.error("Veuillez sélectionner un tarif.");
      return;
    }
    const payload = {
      no_tarif: localFilters.no_tarif,
      cod_pro: localFilters.cod_pro || null,
      ref_crn: localFilters.ref_crn || null,
      grouping_crn: localFilters.use_grouping ? 1 : 0,
    };
    try {
      const res = await resolveCodPro(payload);
      const cod_pro_list = res?.data || res?.cod_pro_list || [];
      if (!cod_pro_list.length) {
        toast.info("Aucun produit trouvé.");
        return;
      }
      // AJOUTE UN TIMESTAMP À CHAQUE FILTRE POUR FORCER LE REFRESH
      const outputFilters = {
        no_tarif: localFilters.no_tarif,
        cod_pro_list,
        _forceRefresh: Date.now() // ← Ajoute ce champ unique
      };
      if (localFilters.cod_pro) outputFilters.selected_cod_pro = localFilters.cod_pro;
      setFilters(outputFilters);
      sessionStorage.setItem("dashboardInit", "1");

      // Change l'URL proprement
      const query = new URLSearchParams();
      query.set("no_tarif", outputFilters.no_tarif);
      if (localFilters.cod_pro) query.set("cod_pro", localFilters.cod_pro);
      if (localFilters.ref_crn) query.set("ref_crn", localFilters.ref_crn);
      query.set("grouping_crn", localFilters.use_grouping ? "1" : "0");
      navigate(`/dashboard?${query.toString()}`);
    } catch (err) {
      toast.error("Erreur lors de l'application des filtres.");
    }
  };

  // --- CRN proposition dynamique comme sur Alertes ---
  useEffect(() => {
    // Si cod_pro saisi, pas grouping, pas déjà de ref_crn
    if (!localFilters.cod_pro || localFilters.use_grouping || localFilters.ref_crn) return;
    import("@/api/suggestionApi").then(({ getRefCrnByCodPro }) => {
      getRefCrnByCodPro(localFilters.cod_pro)
        .then((list) => {
          if (list.length === 1) setLocalFilters(f => ({ ...f, ref_crn: list[0] }));
        })
        .catch(console.error);
    });
  }, [localFilters.cod_pro, localFilters.use_grouping]);
  useEffect(() => {
    // Si cod_pro ET ref_crn sélectionnés → décoche grouping automatiquement (pour éviter ambiguïté)
    if (localFilters.cod_pro && localFilters.ref_crn && localFilters.use_grouping) {
      setLocalFilters(f => ({ ...f, use_grouping: false }));
    }
    // eslint-disable-next-line
  }, [localFilters.cod_pro, localFilters.ref_crn]);
  // --- Panel UI ---
  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: 2,
        width: "100%",
        boxShadow: "0 2px 12px 0 #dde3ed",
        border: "1px solid #e0e7ed",
        maxWidth: 224, 
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          px: 2,
          py: 1.1,
          display: "flex",
          alignItems: "center",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          Filtres Produits
        </Typography>
        <Tooltip title="Réinitialiser les filtres">
          <IconButton color="inherit" onClick={handleClear} size="small">
            <ClearAllIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      {/* Inputs */}
      <Box sx={{ px: 2.5, py: 2 }}>
        <Stack spacing={2}>
          <SelectNoTarif
            value={localFilters.no_tarif}
            onChange={(val) => setLocalFilters((f) => ({ ...f, no_tarif: val }))}
            fullWidth
          />
          <AutocompleteRefint
            key={`refint-reset-${resetCount}`}
            fullWidth
            value={localFilters.cod_pro}
            onChange={(cod_pro) => setLocalFilters((f) => ({ ...f, cod_pro, ref_crn: null }))}
            
          />
          {/* Si grouping activé, pas de ref_crn */}
          {!localFilters.use_grouping && (
            localFilters.cod_pro ? (
              <AutocompleteRefCrnFromCodpro
                fullWidth
                key={`from-codpro-${localFilters.cod_pro}-${resetCount}`}
                cod_pro={localFilters.cod_pro}
                value={localFilters.ref_crn}
                onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
                
              />
            ) : (
                <AutocompleteRefCrn
                fullWidth
                key={`crn-reset-${resetCount}`}
                value={localFilters.ref_crn}
                onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
                
              />
            )
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={localFilters.use_grouping}
                onChange={(e) =>
                  setLocalFilters((f) => ({ ...f, use_grouping: e.target.checked, ref_crn: null }))
                }
              />
            }
            label="Grouper par CRN"
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ borderRadius: 2, fontWeight: 600, mt: 1.5 }}
            onClick={handleSubmit}
          >
            Valider les filtres
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default FiltersPanel;
