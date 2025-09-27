// 📁 src/shared/components/inputs/autocomplete/AutocompleteRefCrn.jsx
import { useRef, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { autocompleteRefCrn } from "@/api/suggestionApi";
import debounce from "lodash.debounce";

export default function AutocompleteRefCrn({ value, onChange, sx = {} }) {
  const [options, setOptions] = useState([]);

  const fetchOptions = useRef(
    debounce(async (query) => {
      if (query.length < 2) return;
      try {
        const data = await autocompleteRefCrn(query);
        setOptions(data);
      } catch (err) {
        console.error("Erreur chargement ref_crn:", err);
      }
    }, 300),
  ).current;

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value || null}
      onInputChange={(e, val) => fetchOptions(val)}
      onChange={(e, val) => onChange(val || null)}
      sx={sx}
      renderInput={(params) => (
        <TextField {...params} label="Référence Constructeur" size="small" />
      )}
    />
  );
}
