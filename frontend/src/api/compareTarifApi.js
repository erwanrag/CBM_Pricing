// src/api/compareTarifApi.js
import { api } from "@/api";

export async function fetchComparatifTarifs(params, exportAll = false) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== null && v !== "" && v !== undefined)
  );
  const fullPayload = exportAll ? { ...cleanedParams, export_all: true } : cleanedParams;
  const { data } = await api.post("/tarifs/comparatif-multi", fullPayload);
  return data;
}
