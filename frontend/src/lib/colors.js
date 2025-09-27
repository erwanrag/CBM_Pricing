// src/lib/colors.js
// === Couleurs par statut produit ===
export const STATUT_COLORS = {
  0: "#27ae60",    // Vert
  1: "#F59E42",    // Jaune
  2: "#e57330",    // Orange
  8: "#8B5CF6",    // Violet
};
export const STATUT_LABELS = {
  0: "RAS",
  1: "Interdit Achat",
  2: "Interdit Vente",
  8: "Interdit Achat/Vente",
};

// === Couleurs par qualité produit ===
export const QUALITE_COLORS = {
  OE: "#2196f3",   // Bleu
  OEM: "#4caf50",  // Vert
  PMQ: "#ff9800",  // Orange
  PMV: "#9c27b0",  // Violet
};
export const QUALITE_LABELS = {
  OE: "OE",
  OEM: "OEM",
  PMQ: "PMQ",
  PMV: "PMV",
};

// === Couleur de marge (%) ===
export function getMargeColor(val) {
  if (val == null || isNaN(val)) return "#ccc";      // Gris (N/A)
  if (val < 10) return "#e53935";                    // Rouge vif (faible)
  if (val <= 20) return "#ff9800";                   // Orange
  return "#27ae60";                                  // Vert (OK)
}

export function getMargeLabel(val) {
  if (val == null || isNaN(val)) return "N/A";
  if (val < 10) return "Marge < 10% (faible)";
  if (val <= 20) return "Marge 10–20% (moyenne)";
  return "Marge > 20% (bonne)";
}

// Fonctions utilitaires
export function getQualiteColor(qualite) {
  return QUALITE_COLORS[qualite] || "#000";
}
export function getStatutColor(statut) {
  return STATUT_COLORS[statut] || "#999";
}
export function getStatutLabel(statut) {
  return STATUT_LABELS[statut] || `Code ${statut}`;
}
export function getQualiteLabel(qualite) {
  return QUALITE_LABELS[qualite] || qualite || "?";
}
