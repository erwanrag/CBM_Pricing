// src/features/modifications/components/AddModificationDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Switch,
  FormControlLabel
} from "@mui/material";
import dayjs from "dayjs";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import { formatPrix } from "@/lib/format";

export default function AddModificationDialog({ 
  open, 
  onClose, 
  onAdd,
  onFetchProductData
}) {
  const [formData, setFormData] = useState({
    cod_pro: "",
    refint: "",
    no_tarif: "",
    nouveau_prix: "",
    marge_simulee: "",
    statut_utilisateur: "EN_ATTENTE",
    commentaire_utilisateur: "",
    date_prix: dayjs().format("YYYY-MM-DD"),
  });

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [calculMode, setCalculMode] = useState("prix"); // "prix" ou "marge"
  const [realRefint, setRealRefint] = useState(""); // Pour stocker la vraie refint

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        cod_pro: "",
        refint: "",
        no_tarif: "",
        nouveau_prix: "",
        marge_simulee: "",
        statut_utilisateur: "EN_ATTENTE",
        commentaire_utilisateur: "",
        date_prix: dayjs().format("YYYY-MM-DD"),
      });
      setProductData(null);
      setError("");
      setCalculMode("prix");
      setRealRefint("");
    }
  }, [open]);

  // Fetch product data when refint/cod_pro and no_tarif are both filled
  useEffect(() => {
    console.log("useEffect déclenché:", { 
      cod_pro: formData.cod_pro, 
      no_tarif: formData.no_tarif,
      both_filled: !!(formData.cod_pro && formData.no_tarif)
    });
    
    const fetchData = async () => {
      if (formData.cod_pro && formData.no_tarif && onFetchProductData) {
        setLoading(true);
        setError("");
        console.log("Récupération données pour:", { cod_pro: formData.cod_pro, no_tarif: formData.no_tarif });
        
        try {
          const data = await onFetchProductData(formData.cod_pro, formData.no_tarif);
          console.log("Données reçues:", data);
          setProductData(data);
          
          // Pre-fill nouveau_prix with current price for easier comparison
          if (data?.prix_actuel) {
            console.log("Pré-remplissage avec prix:", data.prix_actuel);
            setFormData(prev => ({ 
              ...prev, 
              nouveau_prix: data.prix_actuel.toString()
            }));
            // Calculate current margin for display
            if (data?.px_achat) {
              const currentMargin = ((data.prix_actuel - data.px_achat) / data.prix_actuel) * 100;
              console.log("Calcul marge:", currentMargin);
              setFormData(prev => ({ 
                ...prev, 
                marge_simulee: currentMargin.toFixed(1)
              }));
            }
          }
        } catch (err) {
          console.error("Erreur récupération données:", err);
          setError("Impossible de récupérer les données du produit");
          setProductData(null);
        } finally {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, [formData.cod_pro, formData.no_tarif, onFetchProductData]);

  // Calcul automatique prix/marge basé sur prix d'achat
  const calculateFromPrice = (prix) => {
    if (!productData?.px_achat || !prix || prix === "") return;
    const nouveauPrix = parseFloat(prix);
    const prixAchat = parseFloat(productData.px_achat);
    if (isNaN(nouveauPrix) || isNaN(prixAchat) || nouveauPrix <= 0) return;
    const marge = ((nouveauPrix - prixAchat) / nouveauPrix) * 100;
    setFormData(prev => ({ ...prev, marge_simulee: marge.toFixed(1) }));
  };

  const calculateFromMargin = (marge) => {
    if (!productData?.px_achat || !marge || marge === "") return;
    const nouvelleMarge = parseFloat(marge);
    const prixAchat = parseFloat(productData.px_achat);
    if (isNaN(nouvelleMarge) || isNaN(prixAchat) || nouvelleMarge >= 100 || nouvelleMarge < 0) return;
    const prix = prixAchat / (1 - (nouvelleMarge / 100));
    setFormData(prev => ({ ...prev, nouveau_prix: prix.toFixed(2) }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRefintChange = async (value) => {
    console.log("AutocompleteRefint value:", value, typeof value);
    
    // AutocompleteRefint retourne directement le cod_pro (nombre)
    if (value) {
      setFormData(prev => ({ 
        ...prev, 
        refint: value.toString(), // Temporaire, sera remplacé par la vraie refint
        cod_pro: value.toString()
      }));
      
      // Récupérer la vraie refint via l'API
      try {
        const { autocompleteRefintOrCodpro } = await import("@/api/suggestionApi");
        const data = await autocompleteRefintOrCodpro(value.toString());
        const foundItem = data.find(item => item.cod_pro === value);
        
        if (foundItem && foundItem.refint) {
          setRealRefint(foundItem.refint);
          console.log("Vraie refint récupérée:", foundItem.refint);
        } else {
          setRealRefint(`COD_${value}`);
        }
      } catch (error) {
        console.error("Erreur récupération refint:", error);
        setRealRefint(`COD_${value}`);
      }
    } else {
      setFormData(prev => ({ 
        ...prev, 
        refint: "",
        cod_pro: ""
      }));
      setRealRefint("");
    }
  };

  const handlePrixChange = (value) => {
    setFormData(prev => ({ ...prev, nouveau_prix: value }));
    calculateFromPrice(value);
  };

  const handleMargeChange = (value) => {
    setFormData(prev => ({ ...prev, marge_simulee: value }));
    calculateFromMargin(value);
  };

  const handleAdd = () => {
    if (!formData.cod_pro || !formData.no_tarif || !formData.nouveau_prix) {
      setError("Code produit, tarif et nouveau prix sont obligatoires");
      return;
    }

    // Utiliser la vraie refint récupérée au lieu de celle stockée dans formData
    const dataToAdd = {
      ...formData,
      refint: realRefint || formData.refint // Utiliser la vraie refint si disponible
    };

    console.log("Données à ajouter:", dataToAdd);
    onAdd(dataToAdd);
    onClose();
  };

  const isValid = formData.cod_pro && formData.no_tarif && formData.nouveau_prix;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, minHeight: "75vh" }
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Ajouter une modification tarifaire
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sélectionnez un produit et ajustez le prix ou la marge
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* Sélection du produit */}
          <Grid size={12}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              1. Sélection du produit
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <AutocompleteRefint
              value={formData.refint}
              onChange={handleRefintChange}
              fullWidth
              size="medium"
              placeholder="Rechercher par référence interne..."
              label="Référence Interne *"
              sx={{ minWidth: 300 }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <SelectNoTarif
              value={formData.no_tarif}
              onChange={(value) => handleChange("no_tarif", value)}
              size="medium"
              fullWidth
              label="Tarif *"
              sx={{ minWidth: 200 }}
            />
          </Grid>

          {/* Loading indicator */}
          {loading && (
            <Grid size={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body1" color="text.secondary">
                  Récupération des données produit...
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Données actuelles du produit */}
          {productData && !loading && (
            <>
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  2. Données actuelles
                </Typography>
              </Grid>

              <Grid size={12}>
                <Card variant="outlined" sx={{ bgcolor: "grey.50" }}>
                  <CardContent>
                    <Box sx={{ 
                      display: "flex", 
                      justifyContent: "space-around", 
                      alignItems: "center",
                      gap: 3,
                      flexWrap: "wrap"
                    }}>
                      <Box sx={{ textAlign: "center", minWidth: 200 }}>
                        <Typography variant="h3" sx={{ color: "#2563eb" }} fontWeight="bold">
                          {productData.prix_actuel ? formatPrix(productData.prix_actuel) : "N/A"}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" fontWeight="600">
                          Prix de vente actuel
                        </Typography>
                      </Box>
                      
                      <Box sx={{ textAlign: "center", minWidth: 200 }}>
                        <Typography variant="h3" sx={{ color: "#059669" }} fontWeight="bold">
                          {productData.marge_actuelle ? 
                            `${(productData.marge_actuelle * 100).toFixed(1)}%` : "N/A"}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" fontWeight="600">
                          Marge actuelle
                        </Typography>
                      </Box>
                      
                      <Box sx={{ textAlign: "center", minWidth: 200 }}>
                        <Typography variant="h3" sx={{ color: "#dc2626" }} fontWeight="bold">
                          {productData.px_achat ? formatPrix(productData.px_achat) : "N/A"}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" fontWeight="600">
                          Prix d'achat
                        </Typography>
                      </Box>
                    </Box>
                    
                    {productData.nom_pro && (
                      <Typography variant="body2" sx={{ mt: 2, textAlign: "center", fontStyle: "italic" }}>
                        {productData.nom_pro}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Interface de calcul */}
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  3. Nouvelles valeurs
                </Typography>
              </Grid>

              <Grid size={12}>
                <Card variant="outlined" sx={{ border: "2px solid", borderColor: "primary.main" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={4} alignItems="stretch">
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                            Nouveau Prix de Vente
                          </Typography>
                          <TextField
                            value={formData.nouveau_prix}
                            onChange={(e) => handlePrixChange(e.target.value)}
                            fullWidth
                            type="number"
                            inputProps={{ step: "0.01", min: "0" }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">€</InputAdornment>,
                            }}
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                height: "60px"
                              }
                            }}
                          />
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Box sx={{ 
                          textAlign: "center", 
                          display: "flex", 
                          flexDirection: "column", 
                          justifyContent: "center",
                          height: "100%"
                        }}>
                          <Typography variant="h6" color="text.secondary" fontWeight="bold">
                            OU
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            calcul auto
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, md: 5 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                            Nouvelle Marge
                          </Typography>
                          <TextField
                            value={formData.marge_simulee}
                            onChange={(e) => handleMargeChange(e.target.value)}
                            fullWidth
                            type="number"
                            inputProps={{ step: "0.1", min: "0", max: "100" }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                height: "60px"
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Indicateur visuel de la différence */}
                    {formData.nouveau_prix && productData.prix_actuel && (
                      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                        <Grid container spacing={2}>
                          <Grid size={6}>
                            <Typography variant="body2" color="text.secondary" fontWeight="600">
                              Écart de prix:
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color={parseFloat(formData.nouveau_prix) > productData.prix_actuel ? "success.main" : "error.main"}
                              fontWeight="bold"
                            >
                              {parseFloat(formData.nouveau_prix) > productData.prix_actuel ? "+" : ""}
                              {formatPrix(parseFloat(formData.nouveau_prix) - productData.prix_actuel)}
                            </Typography>
                          </Grid>
                          <Grid size={6}>
                            <Typography variant="body2" color="text.secondary" fontWeight="600">
                              Écart de marge:
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color={parseFloat(formData.marge_simulee) > (productData.marge_actuelle * 100) ? "success.main" : "error.main"}
                              fontWeight="bold"
                            >
                              {parseFloat(formData.marge_simulee) > (productData.marge_actuelle * 100) ? "+" : ""}
                              {(parseFloat(formData.marge_simulee) - (productData.marge_actuelle * 100)).toFixed(1)}%
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Informations complémentaires */}
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="Commentaire"
                  value={formData.commentaire_utilisateur}
                  onChange={(e) => handleChange("commentaire_utilisateur", e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Raison de la modification, contexte commercial..."
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Date d'application"
                  type="date"
                  value={formData.date_prix}
                  onChange={(e) => handleChange("date_prix", e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button onClick={onClose} color="inherit" size="large">
          Annuler
        </Button>
        <Button 
          onClick={handleAdd}
          variant="contained"
          disabled={!isValid}
          size="large"
          sx={{ fontWeight: 600, minWidth: 180 }}
        >
          Ajouter la modification
        </Button>
      </DialogActions>
    </Dialog>
  );
}