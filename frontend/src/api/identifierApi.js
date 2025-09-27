// src/api/identifierApi.js
import { api } from "@/api";

export async function resolveCodPro(payload) {
  const { data } = await api.post("/identifiers/resolve-codpro", payload);
  return data;
}
