//src / api / parametresApi.js
import { api } from "@/api";

export async function getTarifsVisibles() {
  const { data } = await api.get("/parametres/tarifs");
  return data;
}

export async function updateTarifsVisibles(payload) {
  const { data } = await api.post("/parametres/tarifs", payload);
  return data;
}
