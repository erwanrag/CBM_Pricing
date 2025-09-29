// 📁 src/features/dashboard/components/DashboardDetailPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
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
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import {
  Inventory,
  Euro,
  Category,
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

  // --- Calculs automatiques ---
  const calculateFromPrice = (prix) => {
    if (!product?.px_achat || !prix) return;
    const nouveauPrix = parseFloat(prix);
    const prixAchat = parseFloat(product.px_achat);
    if (isNaN(nouveauPrix) || isNaN(prixAchat) || nouveauPrix <= 0) return;
    const marge = ((nouveauPrix - prixAchat) / nouveauPrix) * 100;
    setMargeCible(marge.toFixed(1));
  };

  const calculateFromMargin = (marge) => {
    if (!product?.px_achat || !marge) return;
    const nouvelleMarge = parseFloat(marge);
    const prixAchat = parseFloat(product.px_achat);
    if (
      isNaN(nouvelleMarge) ||
      isNaN(prixAchat) ||
      nouvelleMarge >= 100 ||
      nouvelleMarge < 0
    )
      return;
    const prix = prixAchat / (1 - nouvelleMarge / 100);
    setNouveauPrix(prix.toFixed(2));
  };

  // --- Handlers synchronisés ---
  const handlePrixChange = (value) => {
    setNouveauPrix(value);
    calculateFromPrice(value);
  };

  const handleMargeChange = (value) => {
    setMargeCible(value);
    calculateFromMargin(value);
  };

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
    console.log("Modification sauvegardée:", {
      cod_pro,
      margeCible,
      nouveauPrix,
      commentaire,
      statut,
      datePrix,
    });

    setOpenSnackbar(true);
    setMargeCible("");
    setNouveauPrix("");
    setCommentaire("");
  }, [cod_pro, margeCible, nouveauPrix, commentaire, statut, datePrix]);

  // --- Chargement produit ---
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

          if (data[0].marge_actuelle) {
            setMargeCible((data[0].marge_actuelle * 100).toFixed(1));
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

  // --- Chargement historique ---
  useEffect(() => {
    if (!cod_pro || !no_tarif) {
      setHistorique([]);
      return;
    }

    const fetchHistoriqueData = async () => {
      setHistoriqueLoading(true);

      try {
        const payload = {
          no_tarif: no_tarif,
          cod_pro_list: [cod_pro],
        };

        const data = await fetchHistoriquePrixMarge(payload);

        const produitHistorique = data.filter(
          (item) => item.cod_pro === cod_pro
        );

        const historiqueFormate = produitHistorique.map((item) => ({
          date: item.periode,
          periode: item.periode,
          ca_mensuel: item.ca_mensuel || 0,
          marge_mensuelle: item.marge_mensuelle || 0,
          qte_mensuelle: item.qte_mensuelle || 0,
          marge_mensuelle_pourcentage:
            item.marge_mensuelle_pourcentage || 0,
          prix_moyen:
            item.ca_mensuel && item.qte_mensuelle
              ? item.ca_mensuel / item.qte_mensuelle
              : 0,
        }));

        setHistorique(historiqueFormate);
      } catch (err) {
        console.error("Erreur chargement historique:", err);
        setHistorique([]);
      } finally {
        setHistoriqueLoading(false);
      }
    };

    fetchHistoriqueData();
  }, [cod_pro, no_tarif]);

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Détail Produit</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {loading && (
            <Box>
              <Skeleton variant="text" width="80%" height={30} />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={200}
                sx={{ my: 2 }}
              />
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
              {/* Infos produit */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {product.refint || `Produit ${cod_pro}`}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
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
                        secondary={formatPourcentage(
                          product.marge_actuelle * 100
                        )}
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

              {/* Historique */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Évolution CA & Marge - 12 derniers mois
                  </Typography>

                  {historiqueLoading ? (
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={200}
                    />
                  ) : historique.length > 0 ? (
                    <Box sx={{ width: "100%", height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historique}>
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => {
                              const [year, month] = value.split("-");
                              const date = new Date(year, month - 1);
                              return date.toLocaleDateString("fr-FR", {
                                month: "short",
                                year: "2-digit",
                              });
                            }}
                          />
                          <YAxis yAxisId="ca" orientation="left" />
                          <YAxis yAxisId="marge" orientation="right" />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "ca_mensuel")
                                return [formatPrix(value), "CA"];
                              if (name === "marge_mensuelle")
                                return [formatPrix(value), "Marge"];
                              if (name === "marge_mensuelle_pourcentage")
                                return [
                                  formatPourcentage(value),
                                  "Marge %",
                                ];
                              return [value, name];
                            }}
                            labelFormatter={(label) =>
                              `Période: ${label}`
                            }
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

              {/* Modification */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ajustement Pricing
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Marge cible (%)"
                      value={margeCible}
                      onChange={(e) => handleMargeChange(e.target.value)}
                      type="number"
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Nouveau prix de vente (€)"
                      value={nouveauPrix}
                      onChange={(e) => handlePrixChange(e.target.value)}
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
            </>
          )}
        </Box>
      </Drawer>

      {/* Snackbar */}
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
