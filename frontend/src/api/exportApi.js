// frontend/src/api/exportApi.js

import { API_BASE_URL } from "@/config/env";

/**
 * Helper pour récupérer le token d'authentification
 */
const getAuthToken = () => {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
};

/**
 * Helper pour télécharger un blob en tant que fichier
 */
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Export compare-tarif (streaming direct)
 */
export const exportCompareTarif = async (payload) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/export/compare-tarif`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Export failed: ${response.statusText}`);
  }

  // Récupère le blob
  const blob = await response.blob();

  // Extrait le nom de fichier depuis Content-Disposition
  const contentDisposition = response.headers.get("Content-Disposition");
  const filename = contentDisposition
    ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
    : `export_compare_tarif_${Date.now()}.csv`;

  // Télécharge automatiquement
  downloadBlob(blob, filename);
};

/**
 * Export alertes (streaming direct)
 */
export const exportAlertes = async (payload) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/export/alertes/export-csv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Export alertes failed: ${response.statusText}`);
  }

  // Récupère le blob
  const blob = await response.blob();

  // Extrait le nom de fichier
  const contentDisposition = response.headers.get("Content-Disposition");
  const filename = contentDisposition
    ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
    : `export_alertes_${Date.now()}.csv`;

  // Télécharge automatiquement
  downloadBlob(blob, filename);
};

// ========================================
// DEPRECATED: Anciennes fonctions (ne plus utiliser)
// ========================================

/**
 * @deprecated Utiliser exportCompareTarif() à la place
 */
export const startExportCompareTarif = async (payload) => {
  console.warn("⚠️ startExportCompareTarif() est déprécié, utilisez exportCompareTarif()");
  await exportCompareTarif(payload);
};

/**
 * @deprecated Utiliser exportAlertes() à la place
 */
export const startExportAlertes = async (payload) => {
  console.warn("⚠️ startExportAlertes() est déprécié, utilisez exportAlertes()");
  await exportAlertes(payload);
};

/**
 * @deprecated Ne plus utiliser (streaming direct remplace le polling)
 */
export const listExportFiles = async () => {
  console.warn("⚠️ listExportFiles() est déprécié (plus nécessaire avec streaming)");
  return { files: [] };
};