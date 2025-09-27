// src/api/suggestionApi.js
import { api } from "@/api";

export async function autocompleteRefintOrCodpro(query) {
  const { data } = await api.get("/suggestions/refint-codpro", {
    params: { query },
  });
  return data;
}

export async function autocompleteRefCrn(query) {
  const { data } = await api.get("/suggestions/refcrn", {
    params: { query },
  });
  return data;
}

export async function getRefCrnByCodPro(cod_pro) {
  const { data } = await api.get("/suggestions/refcrn_by_codpro", {
    params: { cod_pro },
  });
  return data;
}
