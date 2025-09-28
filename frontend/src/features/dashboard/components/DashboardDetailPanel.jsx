// 📁 src/features/dashboard/components/DashboardDetailPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Skeleton,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import {
  Inventory,
  Euro,
  Category,
  Store,
  AssignmentTurnedIn,
  TrendingUp,
  Warning,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getFicheProduit } from "@/api/ficheApi";
import { fetchHistoriquePrixMarge } from "@/api/dashboardApi";
import { formatPrix, formatPourcentage } from "@/lib/format";

export default function DashboardDetailPanel({ cod_pro, no_tarif, onClose }) {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [product, setProduct] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // États pour modification des prix
  const [margeCible, setMargeCible] = useState("");
  const [nouveauPrix, setNouveauPrix] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [statut, setStatut] = useState("corrigée");
  const [datePrix, setDatePrix] = useState(dayjs().format("YYYY-MM-DD"));

  // Gestionnaires d'événements stables
  const handleClose = useCallback(() => {
    setProduct(null);
    setHistorique([]);
    setError(null);
    setMargeCible("");
    setNouveauPrix("");
    setCommentaire("");
    onClose();
  }, [onClose]);

  const handleSaveModification = useCallback(() => {
    // Simulation de sauvegarde - à implémenter selon votre logique
    console.log("Modification sauvegardée:", {
      cod_pro,
      margeCible,
      nouveauPrix,
      commentaire,
      statut,
      datePrix,
    });
    
    setOpenSnackbar(true);
    // Réinitialiser les champs après sauvegarde
    setMargeCible("");
    setNouveauPrix("");
    setCommentaire("");
  }, [cod_pro, margeCible, nouveauPrix, commentaire, statut, datePrix]);

  const handleOpenComparator = useCallback(() => {
    if (product?.no_tarif && cod_pro) {
      const url = `/compare-tarif?cod_pro=${cod_pro}&tarifs=${product.no_tarif}`;
      window.open(url, "_blank");
    }
  }, [cod_pro, product?.no_tarif]);

  // Chargement des données produit
  useEffect(() => {
    if (!cod_pro || !no_tarif) {
      setProduct(null);
      setError(null);
      return;
    }

    const fetchProductData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getFicheProduit(cod_pro, no_tarif);
        
        if (data && data.length > 0) {
          setProduct(data[0]);
          
          // Pré-remplir les champs avec les données actuelles
          if (data[0].marge_actuelle) {
            setMargeCible((data[0].marge_actuelle * 100).toFixed(2));
          }
          if (data[0].px_vente) {
            setNouveauPrix(data[0].px_vente.toFixed(2));
          }
        } else {
          setError("Produit non trouvé");
        }
      } catch (err) {
        console.error("Erreur chargement fiche produit:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [cod_pro, no_tarif]);

  // Chargement de l'historique réel depuis votre API
  useEffect(() => {
    if (!cod_pro || !no_tarif) {
      setHistorique([]);
      return;
    }

    const fetchHistoriqueData = async () => {
      setHistoriqueLoading(true);
      
      try {
        // Utilisation de votre API existante pour l'historique
        const payload = {
          no_tarif: no_tarif,
          cod_pro_list: [cod_pro], // Liste avec un seul produit
        };
        
        const data = await fetchHistoriquePrixMarge(payload);
        
        // Filtrer les données pour ce produit spécifique
        const produitHistorique = data.filter(item => item.cod_pro === cod_pro);
        
        // Transformer les données pour le graphique (période au format Date)
        const historiqueFormate = produitHistorique.map(item => ({
          date: item.periode, // Format "2024-01"
          periode: item.periode,
          ca_mensuel: item.ca_mensuel || 0,
          marge_mensuelle: item.marge_mensuelle || 0,
          qte_mensuelle: item.qte_mensuelle || 0,
          marge_mensuelle_pourcentage: item.marge_mensuelle_pourcentage || 0,
          // Pour le graphique, on peut calculer un prix moyen si nécessaire
          prix_moyen: item.ca_mensuel && item.qte_mensuelle ? 
            (item.ca_mensuel / item.qte_mensuelle) : 0
        }));
        
        setHistorique(historiqueFormate);
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Historique chargé pour produit", cod_pro, ":", historiqueFormate);
        }
      } catch (err) {
        console.error("Erreur chargement historique:", err);
        setHistorique([]);
      } finally {
        setHistoriqueLoading(false);
      }
    };

    fetchHistoriqueData();
  }, [cod_pro, no_tarif]);

  // Le panel ne s'ouvre que si cod_pro est défini
  const isOpen = Boolean(cod_pro);

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 480 },
            maxWidth: "100vw",
          },
        }}
      >
        <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">
              Détail Produit
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {loading && (
            <Box>
              <Skeleton variant="text" width="80%" height={30} />
              <Skeleton variant="rectangular" width="100%" height={200} sx={{ my: 2 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {product && !loading && (
            <>
              {/* Informations produit */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {product.refint || `Produit ${cod_pro}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Code produit: {cod_pro} • Tarif: {product.no_tarif}
                  </Typography>

                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <Euro fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Prix de vente actuel"
                        secondary={formatPrix(product.px_vente)}
                      />
                    </ListItem>

                    <ListItem disablePadding>
                      <ListItemIcon>
                        <TrendingUp fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Marge actuelle"
                        secondary={formatPourcentage(product.marge_actuelle * 100)}
                      />
                    </ListItem>

                    <ListItem disablePadding>
                      <ListItemIcon>
                        <Inventory fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Stock"
                        secondary={product.stock_total || "Non renseigné"}
                      />
                    </ListItem>

                    <ListItem disablePadding>
                      <ListItemIcon>
                        <Category fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Qualité"
                        secondary={product.qualite || "Non renseignée"}
                      />
                    </ListItem>

                    {product.alertes_actives > 0 && (
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <Warning fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Alertes actives"
                          secondary={`${product.alertes_actives} alerte(s)`}
                          secondaryTypographyProps={{ color: "error" }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>

              {/* Historique des prix RÉEL depuis votre API */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Évolution CA & Marge - 12 derniers mois
                  </Typography>
                  
                  {historiqueLoading ? (
                    <Skeleton variant="rectangular" width="100%" height={200} />
                  ) : historique.length > 0 ? (
                    <Box sx={{ width: "100%", height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historique}>
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              // Format "2024-01" → "Jan 24"
                              const [year, month] = value.split('-');
                              const date = new Date(year, month - 1);
                              return date.toLocaleDateString('fr-FR', { 
                                month: 'short', 
                                year: '2-digit' 
                              });
                            }}
                          />
                          <YAxis yAxisId="ca" orientation="left" />
                          <YAxis yAxisId="marge" orientation="right" />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === "ca_mensuel") return [formatPrix(value), "CA"];
                              if (name === "marge_mensuelle") return [formatPrix(value), "Marge"];
                              if (name === "marge_mensuelle_pourcentage") return [formatPourcentage(value), "Marge %"];
                              return [value, name];
                            }}
                            labelFormatter={(label) => `Période: ${label}`}
                          />
                          <Line 
                            yAxisId="ca"
                            type="monotone" 
                            dataKey="ca_mensuel" 
                            stroke="#1976d2" 
                            strokeWidth={2}
                            name="ca_mensuel"
                          />
                          <Line 
                            yAxisId="ca"
                            type="monotone" 
                            dataKey="marge_mensuelle" 
                            stroke="#ed6c02" 
                            strokeWidth={2}
                            name="marge_mensuelle"
                          />
                          <Line 
                            yAxisId="marge"
                            type="monotone" 
                            dataKey="marge_mensuelle_pourcentage" 
                            stroke="#9c27b0" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            name="marge_mensuelle_pourcentage"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucun historique disponible pour ce produit
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Modification des prix */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ajustement Pricing
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      label="Marge cible (%)"
                      value={margeCible}
                      onChange={(e) => setMargeCible(e.target.value)}
                      type="number"
                      size="small"
                      fullWidth
                    />

                    <TextField
                      label="Nouveau prix de vente (€)"
                      value={nouveauPrix}
                      onChange={(e) => setNouveauPrix(e.target.value)}
                      type="number"
                      size="small"
                      fullWidth
                    />

                    <TextField
                      label="Date d'application"
                      value={datePrix}
                      onChange={(e) => setDatePrix(e.target.value)}
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />

                    <FormControl size="small" fullWidth>
                      <InputLabel>Statut</InputLabel>
                      <Select
                        value={statut}
                        onChange={(e) => setStatut(e.target.value)}
                        label="Statut"
                      >
                        <MenuItem value="en_attente">En attente</MenuItem>
                        <MenuItem value="validée">Validée</MenuItem>
                        <MenuItem value="corrigée">Corrigée</MenuItem>
                        <MenuItem value="refusée">Refusée</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Commentaire"
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      multiline
                      rows={3}
                      size="small"
                      fullWidth
                    />

                    <Button
                      variant="contained"
                      onClick={handleSaveModification}
                      disabled={!margeCible && !nouveauPrix}
                      fullWidth
                    >
                      Sauvegarder la modification
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Actions */}
              <Button
                variant="outlined"
                fullWidth
                onClick={handleOpenComparator}
                sx={{ mb: 2 }}
              >
                Voir dans Comparateur Tarifs
              </Button>
            </>
          )}
        </Box>
      </Drawer>

      {/* Snackbar de confirmation */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Modification sauvegardée avec succès
        </Alert>
      </Snackbar>
    </>
  );
}