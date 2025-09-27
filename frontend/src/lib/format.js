//src/lib/format.js
export const safeFixed = (value, decimals = 2) => {
  const num = parseFloat(value ?? 0);
  if (isNaN(num)) return "-";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatPrix = (val) => {
  if (val == null || val === 0) return "-";
  const num = parseFloat(val);
  if (isNaN(num)) return "-";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
};
export const formatPourcentage = (val) => {
  if (val == null || val === 0) return "-";
  const num = parseFloat(val);
  if (isNaN(num)) return "-";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " %";
};
export const formatDateFR = (dateStr) => new Date(dateStr).toLocaleDateString("fr-FR");
