// 📁 src/api/alertesApi.js - Version corrigée
import { api } from "@/api";

// 🔎 Récupère les règles d'alerte actives
export async function getParametrageRegles() {
  const response = await api.get("/alertes/parametrage");
  return response.data;
}

// 📊 Récupère les alertes sous forme paginée (tableau de synthèse)
export async function getAlertesSummary(payload, exportAll = false) {
  const fullPayload = exportAll ? { ...payload, export_all: true } : payload;
  const response = await api.post("/alertes/summary", fullPayload);
  return response.data;
}

// 📍 Récupère la carte des alertes (champ impacté par cod_pro)
export async function getAlertesMap(no_tarif, cod_pro_list = []) {
  try {
    // Validation des paramètres
    if (!no_tarif || !Array.isArray(cod_pro_list) || cod_pro_list.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("getAlertesMap: paramètres invalides", { no_tarif, cod_pro_list });
      }
      return { items: [] };
    }

    const payload = {
      no_tarif,
      cod_pro_list
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log("getAlertesMap payload:", payload);
    }
    
    const response = await api.post("/alertes/map", payload);
    return response.data || { items: [] };
  } catch (error) {
    console.error("Erreur getAlertesMap:", error);
    return { items: [] };
  }
}

// 📄 Détail des alertes pour un produit et un tarif donné
export async function getAlertesDetails(cod_pro, no_tarif) {
  const response = await api.get("/alertes/details", {
    params: { cod_pro, no_tarif },
  });
  return response.data;
}