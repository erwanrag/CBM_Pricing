// 📁 src/shared/layout/FiltersPanel.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, FormControlLabel, Checkbox, Button, Stack, 
  IconButton, Tooltip, Divider, CircularProgress
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Debug en développement (réduction des logs)
  const isDev = process.env.NODE_ENV === 'development';
  
  // Log seulement lors des changements significatifs
  useEffect(() => {
    if (isDev) {
      console.log("FiltersPanel state change:", { localFilters, location: location.pathname });
    }
  }, [localFilters.no_tarif, localFilters.cod_pro, localFilters.ref_crn, localFilters.use_grouping, isDev]);

  // Initialisation auto via URL
  useEffect(() => {
    const codProParam = searchParams.get("cod_pro");
    const noTarifParam = searchParams.get("no_tarif");
    const refCrnParam = searchParams.get("ref_crn");
    const groupingParam = searchParams.get("grouping_crn");
    
    if (noTarifParam) {
      const newFilters = {
        ...initialState,
        no_tarif: parseInt(noTarifParam),
        cod_pro: codProParam || null,
        ref_crn: refCrnParam || null,
        use_grouping: groupingParam === "1",
      };
      
      setLocalFilters(newFilters);
      if (isDev) {
        console.log("FiltersPanel init from URL:", newFilters);
      }
    }
  }, [searchParams, isDev]);

  // Reset / clear
  const handleClear = useCallback(() => {
    setLocalFilters(initialState);
    setFilters({});
    setResetCount(c => c + 1);
    navigate("/dashboard");
    toast.info("Filtres réinitialisés");
  }, [setFilters, navigate]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!localFilters.no_tarif) {
      toast.error("Veuillez sélectionner un tarif.");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      no_tarif: localFilters.no_tarif,
      cod_pro: localFilters.cod_pro || null,
      ref_crn: localFilters.ref_crn || null,
      grouping_crn: localFilters.use_grouping ? 1 : 0,
    };

    try {
      if (isDev) {
        console.log("Envoi payload:", payload);
      }
      
      const res = await resolveCodPro(payload);
      const cod_pro_list = res?.data || res?.cod_pro_list || [];
      
      if (!cod_pro_list.length) {
        toast.info("Aucun produit trouvé.");
        return;
      }

      const outputFilters = {
        no_tarif: localFilters.no_tarif,
        cod_pro_list,
        _forceRefresh: Date.now().toString(),
      };
      
      if (localFilters.cod_pro) {
        outputFilters.selected_cod_pro = localFilters.cod_pro;
      }

      setFilters(outputFilters);
      sessionStorage.setItem("dashboardInit", "1");

      // Mise à jour URL
      const query = new URLSearchParams();
      query.set("no_tarif", outputFilters.no_tarif);
      if (localFilters.cod_pro) query.set("cod_pro", localFilters.cod_pro);
      if (localFilters.ref_crn) query.set("ref_crn", localFilters.ref_crn);
      query.set("grouping_crn", localFilters.use_grouping ? "1" : "0");
      
      navigate(`/dashboard?${query.toString()}`);
      toast.success(`${cod_pro_list.length} produit(s) trouvé(s)`);
      
      if (isDev) {
        console.log("Filtres appliqués:", outputFilters);
      }
    } catch (err) {
      console.error("Erreur lors de l'application des filtres:", err);
      toast.error("Erreur lors de l'application des filtres.");
    } finally {
      setIsSubmitting(false);
    }
  }, [localFilters, setFilters, navigate, isDev]);

  // Auto-suggestion CRN (si cod_pro saisi, pas grouping, pas déjà de ref_crn)
  useEffect(() => {
    if (!localFilters.cod_pro || localFilters.use_grouping || localFilters.ref_crn) {
      return;
    }
    
    let cancelled = false;
    
    import("@/api/suggestionApi")
      .then(({ getRefCrnByCodPro }) => getRefCrnByCodPro(localFilters.cod_pro))
      .then((list) => {
        if (!cancelled && list.length === 1) {
          setLocalFilters(f => ({ ...f, ref_crn: list[0] }));
        }
      })
      .catch(console.error);
      
    return () => { cancelled = true; };
  }, [localFilters.cod_pro, localFilters.use_grouping]);

  // Si cod_pro ET ref_crn sélectionnés → décoche grouping automatiquement
  useEffect(() => {
    if (localFilters.cod_pro && localFilters.ref_crn && localFilters.use_grouping) {
      setLocalFilters(f => ({ ...f, use_grouping: false }));
    }
  }, [localFilters.cod_pro, localFilters.ref_crn, localFilters.use_grouping]);

  // Validation du formulaire
  const canSubmit = useMemo(() => {
    return Boolean(localFilters.no_tarif && !isSubmitting);
  }, [localFilters.no_tarif, isSubmitting]);

  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: 2,
        width: "100%",
        boxShadow: "0 2px 12px 0 #dde3ed",
        border: "1px solid #e0e7ed",
        maxWidth: 280,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          px: 2,
          py: 1.5,
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
          <IconButton 
            color="inherit" 
            onClick={handleClear} 
            size="small"
            disabled={isSubmitting}
          >
            <ClearAllIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      {/* Inputs */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Stack spacing={2.5}>
          <SelectNoTarif
            value={localFilters.no_tarif}
            onChange={(val) => setLocalFilters((f) => ({ ...f, no_tarif: val }))}
            fullWidth
            disabled={isSubmitting}
          />
          
          <AutocompleteRefint
            key={`refint-reset-${resetCount}`}
            fullWidth
            value={localFilters.cod_pro}
            onChange={(cod_pro) => setLocalFilters((f) => ({ ...f, cod_pro, ref_crn: null }))}
            disabled={isSubmitting}
          />
          
          {/* Si grouping activé, pas de ref_crn */}
          {!localFilters.use_grouping && (
            localFilters.cod_pro ? (
              <>
                <AutocompleteRefCrnFromCodpro
                  fullWidth
                  key={`from-codpro-${localFilters.cod_pro}-${resetCount}`}
                  cod_pro={localFilters.cod_pro}
                  value={localFilters.ref_crn}
                  onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
                  disabled={isSubmitting}
                />
              </>
            ) : (
              <AutocompleteRefCrn
                fullWidth
                key={`crn-reset-${resetCount}`}
                value={localFilters.ref_crn}
                onChange={(ref_crn) => setLocalFilters((f) => ({ ...f, ref_crn }))}
                disabled={isSubmitting}
              />
            )
          )}
          
          <FormControlLabel
            control={
              <Checkbox
                checked={localFilters.use_grouping}
                onChange={(e) =>
                  setLocalFilters((f) => ({ 
                    ...f, 
                    use_grouping: e.target.checked, 
                    ref_crn: null 
                  }))
                }
                disabled={isSubmitting}
              />
            }
            label="Grouper par CRN"
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ 
              borderRadius: 2, 
              fontWeight: 600, 
              mt: 1.5,
              position: "relative"
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Chargement...
              </>
            ) : (
              "Valider les filtres"
            )}
          </Button>
          
          {/* Indication du nombre de critères */}
          {localFilters.no_tarif && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", fontSize: "0.7rem" }}>
              Tarif: {localFilters.no_tarif}
              {localFilters.cod_pro && ` • Produit: ${localFilters.cod_pro}`}
              {localFilters.ref_crn && ` • CRN: ${localFilters.ref_crn}`}
              {localFilters.use_grouping && " • Groupé"}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default FiltersPanel;