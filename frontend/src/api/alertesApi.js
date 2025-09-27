// src/api/alertesApi.js
import { api } from "@/api";

// 🔎 Récupère les règles d’alerte actives
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
  const response = await api.post("/alertes/map", {
    no_tarif,
    cod_pro_list,
  });
  return response.data;
}

// 📄 Détail des alertes pour un produit et un tarif donné
export async function getAlertesDetails(cod_pro, no_tarif) {
  const response = await api.get("/alertes/details", {
    params: { cod_pro, no_tarif },
  });
  return response.data;
}
