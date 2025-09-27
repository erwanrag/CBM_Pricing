// 📁 src/features/catalogue/CatalogueFilters.jsx
import { useState } from "react";
import { Box, Button } from "@mui/material";
import SelectNoTarif from "@/shared/components/inputs/selects/SelectNoTarif";
import AutocompleteRefint from "@/shared/components/inputs/autocomplete/AutocompleteRefint";
import AutocompleteRefCrn from "@/shared/components/inputs/autocomplete/AutocompleteRefCrn";
import FiltresBarreActions from "@/shared/components/filters/FiltresBarreActions"; 


export default function CatalogueFilters({ onChange }) {
  const [noTarif, setNoTarif] = useState("");
  const [codPro, setCodPro] = useState(null);
  const [refCrn, setRefCrn] = useState(null);


  const handleSubmit = () => {
    const items = [];
    if (noTarif) items.push({ field: "no_tarif", operator: "=", value: noTarif });
    if (codPro) items.push({ field: "cod_pro", operator: "=", value: codPro });
    if (refCrn) items.push({ field: "ref_crn", operator: "=", value: refCrn });

    onChange({ items });
  };

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
      <SelectNoTarif value={noTarif} onChange={setNoTarif} sx={{ minWidth: 200 }} />
      <AutocompleteRefint value={codPro} onChange={setCodPro} sx={{ minWidth: 250 }} />
      <AutocompleteRefCrn value={refCrn} onChange={setRefCrn} sx={{ minWidth: 250 }} />
      
      <FiltresBarreActions onSearch={handleSubmit} />
    </Box>
  );
}
