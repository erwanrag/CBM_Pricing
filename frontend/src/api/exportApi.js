//src/api/exportApi.js
import { api } from "@/api";

export async function exportTarifsExcel(params) {
  const response = await api.get("/exports/tarifs", {
    params,
    responseType: "blob",
  });
  return response;
}


// Lance l'export CSV asynchrone (POST /export/compare-tarif)
export async function startExportCompareTarif(params) {
  const response = await api.post("/export/compare-tarif", params);
  return response.data; // { message, filename }
}

// Lance l'export CSV asynchrone pour alertes (POST /export/alertes/export-csv)
export async function startExportAlertes(params) {
  const response = await api.post("/export/alertes/export-csv", params);
  return response.data; // { message, filename }
}

// Liste les fichiers CSV exportés (GET /export/files)
export async function listExportFiles() {
  const response = await api.get("/export/files");
  return response.data; // { files: [...] }
}

// Télécharge un fichier CSV exporté (GET /export/download/{filename})
export async function downloadExportFile(filename) {
  const response = await api.get(`/export/download/${filename}`, {
    responseType: "blob", // Important pour téléchargement binaire
  });
  return response;
}
