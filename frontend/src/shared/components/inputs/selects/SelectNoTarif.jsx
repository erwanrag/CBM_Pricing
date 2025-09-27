// 📁 src/shared/components/inputs/selects/SelectNoTarif.jsx
import { useEffect, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { getTarifOptions } from "@/api";

export default function SelectNoTarif({
  value,
  onChange,
  label = "Tarif",
  sx = {},
  fullWidth = true,
}) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getTarifOptions().then(setOptions).catch(console.error);
  }, []);

  const isValueInOptions = options.some((opt) => opt.no_tarif === value);

  return (
    <FormControl fullWidth={fullWidth} sx={sx} size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        label={label}
      >
        {!isValueInOptions && value && (
          <MenuItem value={value}>Tarif #{value}</MenuItem>
        )}
        {options.map((t) => (
          <MenuItem key={t.no_tarif} value={t.no_tarif}>
            {t.lib_tarif} (#{t.no_tarif})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

