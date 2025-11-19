// 📁 src/shared/components/inputs/autocomplete/AutocompleteRefint.jsx
import { useEffect, useRef, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { autocompleteRefintOrCodpro } from "@/api/suggestionApi";
import debounce from "lodash.debounce";

export default function AutocompleteRefint({
  value,
  onChange,
  sx = {},
  fullWidth,
  disabled,
}) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState("");

  const fetchOptions = useRef(
    debounce(async (query) => {
      if (!query || query.length < 2) return;
      try {
        const data = await autocompleteRefintOrCodpro(query);
        setOptions(data);
      } catch (err) {
        console.error("Erreur chargement refint:", err);
      }
    }, 300),
  ).current;

  // 👉 Quand cod_pro vient de l'URL, on déclenche la recherche
  useEffect(() => {
    if (!value) return;

    const alreadyLoaded = options.some(
      (opt) => String(opt.cod_pro) === String(value),
    );
    if (alreadyLoaded) return;

    // On "simule" une saisie pour réutiliser la logique existante
    setInput(String(value));
  }, [value, options]);

  // 👉 Recherche à chaque changement de texte saisi
  useEffect(() => {
    if (!input) return;
    fetchOptions(input);
  }, [input, fetchOptions]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      fullWidth={fullWidth}
      disabled={disabled}
      getOptionLabel={(opt) =>
        typeof opt === "string"
          ? opt
          : `${opt.refint} (${opt.cod_pro})`
      }
      value={
        options.find(
          (opt) => String(opt.cod_pro) === String(value),
        ) || null
      }
      onInputChange={(e, val) => setInput(val)}
      onChange={(e, val) => onChange(val?.cod_pro || null)}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Réf. CBM ou Code Pro."
          size="small"
        />
      )}
    />
  );
}
