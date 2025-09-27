// src/features/dashboard/DashboardDetail.jsx
import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import dayjs from "dayjs";
import {
  Inventory,
  Euro,
  Category,
  Store,
  AssignmentTurnedIn,
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

const formatEur = (v) => (v != null ? `${v.toFixed(2)} €` : "-");

const DashboardDetailPanel = ({ cod_pro, no_tarif, onClose }) => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [product, setProduct] = useState(null);
  const [margeCible, setMargeCible] = useState("");
  const [nouveauPrix, setNouveauPrix] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [statut, setStatut] = useState("corrigée");
  const [datePrix, setDatePrix] = useState(dayjs().format("YYYY-MM-DD"));
  //useEffect(() => {
  //  console.log("cod_pro:", cod_pro, "no_tarif:", no_tarif);
  //}, [cod_pro, no_tarif]);
  useEffect(() => {
    if (!cod_pro || !no_tarif) {
      setProduct(null);
      return;
    }
    //console.log("🔁 Render DashboardDetailPanel", { cod_pro, no_tarif, product });
    const fetchData = async () => {
      try {
        const data = await getFicheProduit(cod_pro, no_tarif);
        //console.log("Réponse fiche produit:", data);
        if (data && data.length > 0) {
          setProduct(data[0]);
          //console.log("📦 setProduct", data[0]);
        } else {
          setProduct({ not_found: true });
        }
      } catch (err) {
        console.error("Erreur chargement fiche produit:", err);
        setProduct({ error: true });
      }
    };
    fetchData();
  }, [cod_pro, no_tarif]);

  useEffect(() => {
    if (!product || product.not_found || product.error) return;
    const marge = product.marge_actuelle
      ? Number((product.marge_actuelle * 100).toFixed(1))
      : "";
    setMargeCible(marge);
    setNouveauPrix(product.prix_vente_tarif);

    const modifications =
      JSON.parse(localStorage.getItem("modifications_en_cours")) || [];
    const modif = modifications.find(
      (m) => m.cod_pro === product.cod_pro && m.no_tarif === no_tarif
    );

    if (modif) {
      setNouveauPrix(modif.nouveau_prix);
      setMargeCible((modif.marge_simulee * 100).toFixed(1));
      setStatut(modif.statut_utilisateur || "corrigée");
      setCommentaire(modif.commentaire_utilisateur || "");
    }
  }, [product, no_tarif]);

  const prixAchat = Number(product?.prix_achat || 0);

  const handleMargeChange = (value) => {
    const marge = Number(value);
    setMargeCible(value);
    if (!isNaN(marge) && prixAchat > 0) {
      const price = Number((prixAchat / (1 - marge / 100)).toFixed(2));
      setNouveauPrix(price);
    }
  };

  const handlePrixChange = (value) => {
    const prix = Number(value);
    setNouveauPrix(value);
    if (!isNaN(prix) && prix > 0 && prixAchat > 0) {
      const marge = Number(((1 - prixAchat / prix) * 100).toFixed(1));
      setMargeCible(marge);
    }
  };

  const ajouterModificationSession = (modif) => {
    const modifications =
      JSON.parse(localStorage.getItem("modifications_en_cours")) || [];
    const sansDoublon = modifications.filter(
      (m) => !(m.cod_pro === modif.cod_pro && m.no_tarif === modif.no_tarif)
    );
    localStorage.setItem(
      "modifications_en_cours",
      JSON.stringify([...sansDoublon, modif])
    );
  };

  const graphData = [
    { name: "M-12", prix: product?.prix_vente_m12 ?? 0 },
    { name: "M-6", prix: product?.prix_vente_m6 ?? 0 },
    { name: "M-3", prix: product?.prix_vente_m3 ?? 0 },
  ];

  return (
    <Drawer
      anchor="right"
      open={Boolean(cod_pro && no_tarif)}
      onClose={onClose}
      sx={{ zIndex: 1300 }}
    >
      {product?.not_found ? (
        <Box sx={{ p: 2, width: 360 }}>
          <Typography variant="body2" color="text.secondary">
            Aucun produit trouvé pour ce tarif.
          </Typography>
        </Box>
      ) : product?.error ? (
        <Box sx={{ p: 2, width: 360 }}>
          <Typography variant="body2" color="error">
            Erreur lors du chargement de la fiche produit.
          </Typography>
        </Box>
      ) : product ? (
        <Box sx={{ p: 2, width: 360, maxWidth: "100vw" }}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h5" align="center">
                {product.refint}
              </Typography>
              <Typography variant="subtitle2" align="center">
                cod_pro : {product.cod_pro}
              </Typography>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Historique prix tarif</Typography>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={graphData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="prix" stroke="#3f51b5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>

          <List dense>
            <ListItem>
              <ListItemIcon><Inventory /></ListItemIcon>
              <ListItemText primary={`Qualité : ${product.qualite}`} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Category /></ListItemIcon>
              <ListItemText primary={`Famille : ${product.famille}`} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Store /></ListItemIcon>
              <ListItemText primary={`Stock total : ${product.stock_total}`} secondary={`Statut : ${product.statut}`} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Euro /></ListItemIcon>
              <ListItemText primary={`Prix Vente : ${formatEur(product.prix_vente_tarif)}`} secondary={`Prix Achat : ${formatEur(product.prix_achat)}`} />
            </ListItem>
            <ListItem>
              <ListItemIcon><AssignmentTurnedIn /></ListItemIcon>
              <ListItemText primary={`Marge actuelle : ${product.marge_actuelle != null ? (product.marge_actuelle * 100).toFixed(1) + "%" : "-"}`} />
            </ListItem>
            <ListItem>
              <ListItemIcon><Euro /></ListItemIcon>
              <ListItemText
                primary={`Prix Tarif : ${formatEur(product.prix_vente_tarif)}`}
                secondary={nouveauPrix != null && nouveauPrix !== product.prix_vente_tarif ? `💡 Nouveau Prix simulé : ${formatEur(Number(nouveauPrix))}` : null}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <TextField label="Marge Cible (%)" fullWidth type="number" value={margeCible} onChange={(e) => handleMargeChange(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Nouveau Prix (€)" fullWidth type="number" value={nouveauPrix} onChange={(e) => handlePrixChange(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Date d'application" type="date" fullWidth value={datePrix} onChange={(e) => setDatePrix(e.target.value)} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Statut utilisateur</InputLabel>
            <Select value={statut} label="Statut utilisateur" onChange={(e) => setStatut(e.target.value)}>
              <MenuItem value="corrigée">Corrigée</MenuItem>
              <MenuItem value="conservée">Conservée</MenuItem>
              <MenuItem value="maitrisée">Maitrisée</MenuItem>
              <MenuItem value="à revoir">À revoir</MenuItem>
              <MenuItem value="non concernée">Non concernée</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Commentaire utilisateur" fullWidth multiline value={commentaire} onChange={(e) => setCommentaire(e.target.value)} sx={{ mb: 2 }} />

          <Button variant="contained" fullWidth onClick={() => {
            const modif = {
              cod_pro: product.cod_pro,
              refint: product.refint,
              no_tarif: no_tarif,
              ancien_prix: product.prix_vente_tarif,
              nouveau_prix: Number(nouveauPrix),
              ancienne_marge: product.marge_actuelle,
              marge_simulee: parseFloat(margeCible) / 100,
              statut_utilisateur: statut,
              commentaire_utilisateur: commentaire,
              date_prix: datePrix,
            };
            ajouterModificationSession(modif);
            setOpenSnackbar(true);
          }}>
            Ajouter à la session
          </Button>

          <Button variant="outlined" fullWidth sx={{ mt: 1 }} onClick={onClose}>
            Fermer
          </Button>

          <Snackbar
            open={openSnackbar}
            autoHideDuration={2000}
            onClose={() => {
              setOpenSnackbar(false);
              onClose();
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => {
                setOpenSnackbar(false);
                onClose();
              }}
              severity="success"
              sx={{ width: "100%" }}
            >
              Modification ajoutée à la session ✔
            </Alert>
          </Snackbar>

          <Button
            variant="text"
            fullWidth
            sx={{ mt: 1 }}
            onClick={() => {
              window.open(`/compare-tarif?cod_pro=${product.cod_pro}&tarifs=${no_tarif}`, "_blank");
            }}
          >
            🔍 Voir dans Comparateur
          </Button>
        </Box>
      ) : (
        <Box sx={{ p: 2, width: 360 }}>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={100} sx={{ my: 2 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="60%" />
        </Box>
      )}
    </Drawer>
  );
};

export default DashboardDetailPanel;
