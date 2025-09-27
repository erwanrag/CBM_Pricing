// src/api/tarifApi.js

import { api } from "@/api";

export async function getTarifOptions() {
  const { data } = await api.get("/tarifs/options");
  return data;
}
