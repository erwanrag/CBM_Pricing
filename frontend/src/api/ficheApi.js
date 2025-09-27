// src/api/ficheApi.js

import { api } from "@/api";

export async function getFicheProduit(cod_pro, no_tarif) {
  //console.log("📡 appel fiche produit API avec :", { no_tarif, cod_pro });
  const { data } = await api.get("/produit/fiche", {
    params: { no_tarif, cod_pro },
  });
  return data;
}
