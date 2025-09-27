// src/services/tarifModificationsApi.js
import { api } from "@/api";

// 📤 Envoie des modifications tarifaires (log + update alertes)
export async function postModificationsTarif(data) {
  const response = await api.post("/tarifs/log-modifications", data); // 🔁 corrigé
  return response.data;
}

// 📄 Historique des modifications (filtré ou global)
export async function fetchHistoriqueModifications({
  cod_pro,
  refint,
  no_tarif,
  page = 1,
  page_size = 50,
}) {
  const params = { page, page_size };
  if (cod_pro) params.cod_pro = cod_pro;
  if (refint) params.refint = refint;
  if (no_tarif) params.no_tarif = no_tarif;

  const response = await api.get("/tarifs/historique", { params }); // 🔁 corrigé
  return response.data;
}
