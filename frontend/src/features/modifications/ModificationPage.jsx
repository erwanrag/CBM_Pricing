// src/features/modifications/TarifModificationsPage.jsx
import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, Button, Divider } from "@mui/material";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import ModificationsSessionTable from "./components/ModificationsSessionTable";
import ModificationsHistoriqueTable from "./components/ModificationsHistoriqueTable";
import { postModificationsTarif } from "@/api/tarifModificationsApi";
import { exportTarifsExcel } from "@/api/exportApi";
import { AuthContext } from "@/context/auth/AuthContext";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";

const TarifModificationsPage = () => {
  const { user } = useContext(AuthContext);
  const [modificationsSession, setModificationsSession] = useState([]);
  const [refint, setRefint] = useState(null);
  const [noTarif, setNoTarif] = useState(null);
  const editable = ["admin", "writer"].includes(user?.role);

  // Charger la session locale au chargement de la page
  useEffect(() => {
    const local = localStorage.getItem("modifications_en_cours");
    if (local) {
      setModificationsSession(JSON.parse(local));
    }
  }, []);

  // Mise à jour locale et stockage dans localStorage
  const handleUpdateLigne = (index, field, value) => {
    let updated;
    if (field === null) {
      // Ajout nouvelle ligne
      updated = [...modificationsSession, value];
    } else {
      updated = [...modificationsSession];
      updated[index][field] = value;
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
    toast.success("🗑️ Ligne supprimée.");
    localStorage.setItem("modifications_en_cours", JSON.stringify(updated));
  };

  // Validation (envoi) des modifications et export Excel
  const handleValider = async () => {
    try {
      await postModificationsTarif(modificationsSession);

      // Prépare CSV simple
      const ws = XLSX.utils.json_to_sheet(modificationsSession);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modifications");
      XLSX.writeFile(wb, "modifications_tarifaires.xlsx");
      toast.success("✅ Modifications enregistrées et fichier exporté.");
      localStorage.removeItem("modifications_en_cours");
      setModificationsSession([]);
    } catch (err) {
      console.error("Erreur export:", err);
      toast.error("❌ Erreur lors de la validation ou de l'export.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {editable && (
        <>
          <Typography variant="h5" gutterBottom>
            ✏️ Modifications tarifaires en cours
          </Typography>

          <ModificationsSessionTable
            rows={modificationsSession}
            onUpdate={handleUpdateLigne}
            onDelete={handleSupprimerLigne}
          />

          {modificationsSession.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={handleValider}>
                💾 Valider les modifications
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  localStorage.removeItem("modifications_en_cours");
                  setModificationsSession([]);
                }}
              >
                ❌ Supprimer toutes
              </Button>
              <Button
                variant="outlined"
                aria-label="Ajouter une ligne de modification"
                onClick={() =>
                  handleUpdateLigne(-1, null, {
                    cod_pro: "",
                    refint: "",
                    no_tarif: "",
                    nouveau_prix: "",
                    marge_simulee: "",
                    statut_utilisateur: "",
                    commentaire_utilisateur: "",
                    date_prix: dayjs().format("YYYY-MM-DD"),
                  })
                }
              >
                ➕ Ajouter une ligne
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />
        </>
      )}

      <Typography variant="h5" gutterBottom>
        🕘 Historique des modifications
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <AutocompleteRefint
          value={refint}
          onChange={setRefint}
          sx={{ width: 250 }}
          placeholder="Rechercher par Réf Interne"
        />
        <SelectNoTarif
          value={noTarif}
          onChange={setNoTarif}
          sx={{ width: 180 }}
        />
        <Button
          onClick={() => {
            setRefint(null);
            setNoTarif(null);
          }}
          variant="outlined"
          sx={{ height: 40 }}
        >
          ♻️ Réinitialiser
        </Button>
      </Box>

      <ModificationsHistoriqueTable cod_pro={refint} no_tarif={noTarif} />
    </Box>
  );
};

export default TarifModificationsPage;
