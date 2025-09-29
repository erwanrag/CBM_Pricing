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
  InputAdornment,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import {
  Inventory,
  Euro,
  Category,
  TrendingUp,
  Warning,
  ShoppingCart,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

  // Normalisation des noms de champs
  const getPrixVente = (prod) => prod?.prix_vente_tarif || prod?.px_vente || 0;
  const getPrixAchat = (prod) => prod?.prix_achat || prod?.px_achat || 0;
  const getMarge = (prod) => prod?.marge_actuelle || 0;

  // Calculs automatiques
  const calculateFromPrice = useCallback((prix, prixAchat) => {
    if (!prixAchat || !prix || prix === "") return null;
    const nouveauPrix = parseFloat(prix);
    const pa = parseFloat(prixAchat);
    if (isNaN(nouveauPrix) || isNaN(pa) || nouveauPrix <= 0) return null;
    const marge = ((nouveauPrix - pa) / nouveauPrix) * 100;
    return marge.toFixed(1);
  }, []);

  const calculateFromMargin = useCallback((marge, prixAchat) => {
    if (!prixAchat || !marge || marge === "") return null;
    const nouvelleMarge = parseFloat(marge);
    const pa = parseFloat(prixAchat);
    if (isNaN(nouvelleMarge) || isNaN(pa) || nouvelleMarge >= 100 || nouvelleMarge < 0) return null;
    const prix = pa / (1 - nouvelleMarge / 100);
    return prix.toFixed(2);
  }, []);

  // Handlers
  const handlePrixChange = (value) => {
    setNouveauPrix(value);
    const prixAchat = getPrixAchat(product);
    const newMarge = calculateFromPrice(value, prixAchat);
    if (newMarge !== null) setMargeCible(newMarge);
  };

  const handleMargeChange = (value) => {
    setMargeCible(value);
    const prixAchat = getPrixAchat(product);
    const newPrix = calculateFromMargin(value, prixAchat);
    if (newPrix !== null) setNouveauPrix(newPrix);
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
      cod_pro, no_tarif, margeCible, nouveauPrix, commentaire, statut, datePrix,
    });
    setOpenSnackbar(true);
  }, [cod_pro, no_tarif, margeCible, nouveauPrix, commentaire, statut, datePrix]);

  // Chargement produit
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
          const prod = data[0];
          setProduct(prod);

          const prixVente = getPrixVente(prod);
          const prixAchat = getPrixAchat(prod);

          if (prixVente) {
            const prixActuel = parseFloat(prixVente);
            setNouveauPrix(prixActuel.toFixed(2));
            
            if (prixAchat) {
              const margeActuelle = ((prixActuel - parseFloat(prixAchat)) / prixActuel) * 100;
              setMargeCible(margeActuelle.toFixed(1));
            }
          } else if (prod.marge_actuelle) {
            setMargeCible((prod.marge_actuelle * 100).toFixed(1));
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

  // Chargement historique
  useEffect(() => {
    if (!cod_pro || !no_tarif) {
      setHistorique([]);
      return;
    }

    const fetchHistoriqueData = async () => {
      setHistoriqueLoading(true);

      try {
        const payload = { no_tarif: no_tarif, cod_pro_list: [cod_pro] };
        const data = await fetchHistoriquePrixMarge(payload);
        const produitHistorique = data.filter((item) => item.cod_pro === cod_pro);

        const historiqueFormate = produitHistorique.map((item) => ({
          date: item.periode,
          ca_mensuel: item.ca_mensuel || 0,
          marge_mensuelle: item.marge_mensuelle || 0,
          qte_mensuelle: item.qte_mensuelle || 0,
          marge_mensuelle_pourcentage: item.marge_mensuelle_pourcentage || 0,
          prix_moyen: item.ca_mensuel && item.qte_mensuelle ? item.ca_mensuel / item.qte_mensuelle : 0,
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

  // Construction historique prix depuis fiche produit
  const historiquePrix = product ? [
    { periode: "M-12", prix: product.prix_vente_m12 },
    { periode: "M-6", prix: product.prix_vente_m6 },
    { periode: "M-3", prix: product.prix_vente_m3 },
    { periode: "Actuel", prix: getPrixVente(product) },
  ].filter(item => item.prix != null && item.prix > 0) : [];

  const isOpen = Boolean(cod_pro);
  const prixVente = getPrixVente(product);
  const prixAchat = getPrixAchat(product);
  const margeActuelle = getMarge(product);

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 560 }, maxWidth: "100vw" },
        }}
      >
        <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Détail Produit</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {loading && (
            <Box>
              <Skeleton variant="text" width="80%" height={30} />
              <Skeleton variant="rectangular" width="100%" height={200} sx={{ my: 2 }} />
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {product && !loading && (
            <>
              {/* Infos produit */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {product.refint || `Produit ${cod_pro}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Code: {cod_pro} • Tarif: {no_tarif}
                  </Typography>

                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon><ShoppingCart fontSize="small" color="primary" /></ListItemIcon>
                      <ListItemText
                        primary="Prix de vente actuel"
                        secondary={
                          <Typography variant="body2" sx={{ fontWeight: "bold", color: "primary.main" }}>
                            {formatPrix(prixVente)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon><Euro fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Prix d'achat" secondary={formatPrix(prixAchat)} />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon><TrendingUp fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Marge actuelle" secondary={formatPourcentage(margeActuelle * 100)} />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon><Inventory fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Stock" secondary={product.stock_total || "N/A"} />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon><Category fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Qualité" secondary={product.qualite || "N/A"} />
                    </ListItem>
                    {product.alertes_actives > 0 && (
                      <ListItem disablePadding>
                        <ListItemIcon><Warning fontSize="small" color="error" /></ListItemIcon>
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

              {/* Historique Prix - Ouvert par défaut */}
              <Accordion defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight="600">
                    Historique Prix de Vente
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {historiquePrix.length > 0 ? (
                    <Box sx={{ width: "100%", height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historiquePrix}>
                          <XAxis dataKey="periode" />
                          <YAxis domain={['auto', 'auto']} />
                          <Tooltip
                            formatter={(value) => [formatPrix(value), "Prix"]}
                            labelFormatter={(label) => `Période: ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="prix"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#10b981" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune donnée d'historique prix disponible
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Historique CA & Marge - Fermé par défaut */}
              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight="600">
                    Historique CA & Marge (12 mois)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {historiqueLoading ? (
                    <Skeleton variant="rectangular" width="100%" height={200} />
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
                          <YAxis yAxisId="left" orientation="left" label={{ value: '€', position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: '%', position: 'insideRight' }} />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "CA") return [formatPrix(value), "CA"];
                              if (name === "Marge €") return [formatPrix(value), "Marge €"];
                              if (name === "Marge %") return [formatPourcentage(value), "Marge %"];
                              return [value, name];
                            }}
                            labelFormatter={(label) => `Période: ${label}`}
                          />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="ca_mensuel" stroke="#1976d2" strokeWidth={2} name="CA" />
                          <Line yAxisId="left" type="monotone" dataKey="marge_mensuelle" stroke="#ed6c02" strokeWidth={2} name="Marge €" />
                          <Line yAxisId="right" type="monotone" dataKey="marge_mensuelle_pourcentage" stroke="#9c27b0" strokeWidth={2} name="Marge %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Aucune donnée CA/Marge disponible pour ce produit
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Modification */}
              <Card sx={{ mb: 3, border: "2px solid", borderColor: "primary.main" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Ajustement Pricing
                  </Typography>

                  {nouveauPrix && prixVente && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">
                            Écart de prix:
                          </Typography>
                          <Typography
                            variant="h6"
                            color={parseFloat(nouveauPrix) > parseFloat(prixVente) ? "success.main" : "error.main"}
                            fontWeight="bold"
                          >
                            {parseFloat(nouveauPrix) > parseFloat(prixVente) ? "+" : ""}
                            {formatPrix(parseFloat(nouveauPrix) - parseFloat(prixVente))}
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">
                            Écart de marge:
                          </Typography>
                          <Typography
                            variant="h6"
                            color={parseFloat(margeCible) > margeActuelle * 100 ? "success.main" : "error.main"}
                            fontWeight="bold"
                          >
                            {parseFloat(margeCible) > margeActuelle * 100 ? "+" : ""}
                            {(parseFloat(margeCible) - margeActuelle * 100).toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={5}>
                        <TextField
                          label="Nouveau prix (€)"
                          value={nouveauPrix}
                          onChange={(e) => handlePrixChange(e.target.value)}
                          type="number"
                          size="small"
                          fullWidth
                          inputProps={{ step: "0.01", min: "0" }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                          }}
                          sx={{ "& .MuiInputBase-root": { fontWeight: "bold" } }}
                        />
                      </Grid>
                      <Grid size={2}>
                        <Typography variant="body2" color="text.secondary" textAlign="center">OU</Typography>
                      </Grid>
                      <Grid size={5}>
                        <TextField
                          label="Marge cible (%)"
                          value={margeCible}
                          onChange={(e) => handleMargeChange(e.target.value)}
                          type="number"
                          size="small"
                          fullWidth
                          inputProps={{ step: "0.1", min: "0", max: "100" }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          sx={{ "& .MuiInputBase-root": { fontWeight: "bold" } }}
                        />
                      </Grid>
                    </Grid>

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
                      <Select value={statut} onChange={(e) => setStatut(e.target.value)} label="Statut">
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
                      size="large"
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

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: "100%" }}>
          Modification sauvegardée avec succès
        </Alert>
      </Snackbar>
    </>
  );
}