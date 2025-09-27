//src/lib/exportUtils.js
export function convertToCSV(data) {
  if (!data || !Array.isArray(data)) return "";
  const rows = data.map((row) => {
    const base = {
      cod_pro: row.cod_pro,
      refint: row.refint,
      nom_pro: row.nom_pro,
      qualite: row.qualite,
    };
    const prixParTarif = Object.entries(row.tarifs || {}).reduce((acc, [no_tarif, val]) => {
      acc[`prix_${no_tarif}`] = val.prix ?? "";
      acc[`marge_${no_tarif}`] = val.marge ?? "";
      acc[`qte_${no_tarif}`] = val.qte ?? "";
      acc[`ca_${no_tarif}`] = val.ca ?? "";
      acc[`marge_realisee_${no_tarif}`] = val.marge_realisee ?? "";
      return acc;
    }, {});
    return { ...base, ...prixParTarif };
  });

  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const csv = [allKeys.join(";")].concat(
    rows.map((r) => allKeys.map((k) => r[k] ?? "").join(";"))
  );
  return csv.join("\n");
}

export function downloadBlob(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
