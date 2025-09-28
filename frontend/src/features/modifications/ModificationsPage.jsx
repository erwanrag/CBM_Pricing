// src/features/modifications/ModificationsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, Button, Divider, Paper, Alert } from "@mui/material";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import ModificationsSessionTable from "./components/ModificationsSessionTable";
import ModificationsHistoriqueTable from "./components/ModificationsHistoriqueTable";
import AddModificationDialog from "./components/AddModificationDialog";
import { postModificationsTarif } from "@/api/tarifModificationsApi";
import { AuthContext } from "@/context/auth/AuthContext";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";

export default function ModificationsPage() {
  const { user } = useContext(AuthContext);
  const [modificationsSession, setModificationsSession] = useState([]);
  const [refint, setRefint] = useState(null);
  const [noTarif, setNoTarif] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null); // Pour stocker la ligne en cours d'édition
  
  const editable = ["admin", "writer"].includes(user?.role);

  // Charger la session locale au chargement de la page
  useEffect(() => {
    const local = localStorage.getItem("modifications_en_cours");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setModificationsSession(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error("Erreur parsing localStorage:", error);
        localStorage.removeItem("modifications_en_cours");
      }
    }
  }, []);

  // Mise à jour locale et stockage dans localStorage
  const handleUpdateLigne = (index, field, value) => {
    let updated;
    if (field === null) {
      // Ajout nouvelle ligne ou modification d'une ligne existante
      if (editingRow !== null) {
        // Mode édition : remplacer la ligne existante
        updated = [...modificationsSession];
        updated[editingRow] = value;
        setEditingRow(null); // Reset du mode édition
      } else {
        // Mode ajout : ajouter une nouvelle ligne
        updated = [...modificationsSession, value];
      }
    } else {
      updated = [...modificationsSession];
      if (updated[index]) {
        updated[index][field] = value;
      }
    }
    setModificationsSession(updated);
    localStorage.setItem("modifications_en_cours", JSON.stringify(updated));
  };

  // Suppression d'une ligne par cod_pro + no_tarif
  const handleSupprimerLigne = (cod_pro, no_tarif) => {
    const updated = modificationsSession.filter(
      (m) => !(m.cod_pro === cod_pro && m.no_tarif === no_tarif),
    );
    setModificationsSession(updated);
    toast.success("Ligne supprimée.");
    localStorage.setItem("modifications_en_cours", JSON.stringify(updated));
  };

  // Ajout d'une nouvelle ligne vide
  const handleAjouterLigne = () => {
    setEditingRow(null); // Pas en mode édition
    setShowAddDialog(true);
  };

  // Édition d'une ligne existante
  const handleEditerLigne = (row) => {
    // Trouver l'index de la ligne dans le tableau
    const index = modificationsSession.findIndex(
      (m) => m.cod_pro === row.cod_pro && m.no_tarif === row.no_tarif
    );
    
    if (index !== -1) {
      setEditingRow(index); // Stocker l'index pour savoir qu'on édite
      setShowAddDialog(true);
    }
  };

  // Fonction pour récupérer les données produit
  const handleFetchProductData = async (codPro, noTarif) => {
    try {
      // Importation dynamique de l'API fiche produit
      const { getFicheProduit } = await import("@/api/ficheApi");
      
      const data = await getFicheProduit(codPro, noTarif);
      
      if (data && data.length > 0) {
        const product = data[0];
        console.log("Données brutes API:", product);
        
        const mappedData = {
          refint: product.refint,
          nom_pro: product.nom_pro, // Ajouter le nom du produit
          // Mapping correct des champs
          prix_actuel: product.prix_vente_tarif || product.px_vente || product.prix_actuel,
          px_achat: product.prix_achat || product.px_achat,
          marge_actuelle: product.marge_actuelle,
          statut: product.statut || "ACTIF",
          // Informations supplémentaires
          qualite: product.qualite,
          famille: product.famille,
          stock_total: product.stock_total,
          ca_tarif_0_3m: product.ca_tarif_0_3m
        };
        
        console.log("Données mappées:", mappedData);
        return mappedData;
      } else {
        throw new Error("Produit non trouvé");
      }
    } catch (error) {
      console.error("Erreur récupération données produit:", error);
      throw new Error("Impossible de récupérer les données du produit");
    }
  };

  // Ajout d'une modification depuis le dialog
  const handleAddModification = (formData) => {
    handleUpdateLigne(-1, null, formData);
    if (editingRow !== null) {
      toast.success("Modification mise à jour avec succès");
    } else {
      toast.success("Modification ajoutée avec succès");
    }
  };

  // Validation (envoi) des modifications et export Excel
  const handleValider = async () => {
    if (modificationsSession.length === 0) {
      toast.warning("Aucune modification à valider");
      return;
    }

    // Vérification des champs obligatoires
    const lignesIncompletes = modificationsSession.filter(
      m => !m.cod_pro || !m.no_tarif || !m.nouveau_prix
    );

    if (lignesIncompletes.length > 0) {
      toast.error("Certaines lignes sont incomplètes (Code produit, Tarif et Prix requis)");
      return;
    }

    setLoading(true);
    try {
      await postModificationsTarif(modificationsSession);

      // Export Excel
      const ws = XLSX.utils.json_to_sheet(modificationsSession);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modifications");
      XLSX.writeFile(wb, `modifications_tarifaires_${dayjs().format("YYYY-MM-DD_HH-mm")}.xlsx`);
      
      toast.success("Modifications enregistrées et fichier exporté.");
      localStorage.removeItem("modifications_en_cours");
      setModificationsSession([]);
    } catch (err) {
      console.error("Erreur validation:", err);
      toast.error("Erreur lors de la validation ou de l'export.");
    } finally {
      setLoading(false);
    }
  };

  // Suppression de toutes les modifications
  const handleSupprimerTout = () => {
    localStorage.removeItem("modifications_en_cours");
    setModificationsSession([]);
    toast.info("Toutes les modifications ont été supprimées");
  };

  // Reset des filtres historique
  const handleResetFiltres = () => {
    setRefint(null);
    setNoTarif(null);
    toast.info("Filtres réinitialisés");
  };

  return (
    <Box sx={{ px: 3, py: 2, maxWidth: 1400, margin: "0 auto" }}>
      {/* Section modifications en cours (seulement si éditable) */}
      {editable && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Modifications tarifaires
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gérez les modifications de prix en cours et consultez l'historique des changements.
            </Typography>
          </Box>

          <Paper sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2, 
            border: "1px solid #e0e0e0",
            backgroundColor: "#fafafa"
          }}>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              Session de modifications
            </Typography>

            <ModificationsSessionTable
              rows={modificationsSession}
              onUpdate={handleUpdateLigne}
              onDelete={handleSupprimerLigne}
              onEdit={handleEditerLigne}
            />

            {/* Boutons d'actions */}
            <Box sx={{ 
              mt: 3, 
              pt: 3,
              borderTop: "1px solid #e0e0e0",
              display: "flex", 
              gap: 2, 
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <Button
                variant="outlined"
                onClick={handleAjouterLigne}
                sx={{ fontWeight: 600 }}
              >
                Ajouter une ligne
              </Button>

              <Box sx={{ display: "flex", gap: 2 }}>
                {modificationsSession.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleSupprimerTout}
                  >
                    Supprimer tout
                  </Button>
                )}
                
                <Button 
                  variant="contained" 
                  onClick={handleValider}
                  disabled={modificationsSession.length === 0 || loading}
                  sx={{ 
                    fontWeight: 600,
                    minWidth: 180
                  }}
                >
                  {loading ? "Validation..." : "Valider les modifications"}
                </Button>
              </Box>
            </Box>

            {modificationsSession.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>{modificationsSession.length}</strong> modification(s) en attente. 
                Les données sont sauvegardées localement jusqu'à validation.
              </Alert>
            )}
          </Paper>

          <Divider sx={{ my: 4 }} />
        </>
      )}

      {/* Section historique */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Historique des modifications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consultez l'historique complet des modifications tarifaires avec possibilité de filtrage.
        </Typography>
      </Box>

      <Paper sx={{ 
        p: 3, 
        borderRadius: 2, 
        border: "1px solid #e0e0e0",
        backgroundColor: "#fafafa"
      }}>
        {/* Filtres pour l'historique */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtres de recherche
          </Typography>
          
          <Box sx={{ 
            display: "flex", 
            gap: 2, 
            mb: 2, 
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <AutocompleteRefint
              value={refint}
              onChange={setRefint}
              sx={{ width: 280 }}
              placeholder="Rechercher par Réf Interne"
            />
            
            <SelectNoTarif
              value={noTarif}
              onChange={setNoTarif}
              sx={{ width: 200 }}
            />
            
            <Button
              onClick={handleResetFiltres}
              variant="outlined"
              sx={{ height: 40 }}
            >
              Réinitialiser
            </Button>
          </Box>
        </Box>

        {/* Table historique */}
        <ModificationsHistoriqueTable 
          cod_pro={refint} 
          no_tarif={noTarif} 
        />
      </Paper>

      {/* Dialog d'ajout de modification */}
      <AddModificationDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingRow(null); // Reset du mode édition à la fermeture
        }}
        onAdd={handleAddModification}
        onFetchProductData={handleFetchProductData}
        editingData={editingRow !== null ? modificationsSession[editingRow] : null}
      />
    </Box>
  );
}