// 📁 src/shared/components/inputs/autocomplete/AutocompleteRefint.jsx
import { useEffect, useRef, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { autocompleteRefintOrCodpro } from "@/api/suggestionApi";
import debounce from "lodash.debounce";

export default function AutocompleteRefint({ value, onChange, sx = {} }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState("");

  const fetchOptions = useRef(
    debounce(async (query) => {
      if (query.length < 2) return;
      try {
        const data = await autocompleteRefintOrCodpro(query);
        setOptions(data);
      } catch (err) {
        console.error("Erreur chargement refint:", err);
      }
    }, 300),
  ).current;

  useEffect(() => {
    fetchOptions(input);
  }, [input, fetchOptions]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(opt) => `${opt.refint} (${opt.cod_pro})`}
      value={options.find((opt) => opt.cod_pro === value) || null}
      onInputChange={(e, val) => setInput(val)}
      onChange={(e, val) => onChange(val?.cod_pro || null)}
      sx={sx}
      renderInput={(params) => <TextField {...params} label="Réf. CBM ou Code Pro." size="small" />}
    />
  );
}
