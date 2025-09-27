// src/shared/components/inputs/selects/SelectQualite.jsx
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const QUALITE_OPTIONS = [
  { value: "OE", label: "OE - Origine" },
  { value: "OEM", label: "OEM - Équipementier" },
  { value: "PMQ", label: "PMQ - Qualité Pro" },
  { value: "PMV", label: "PMV - Dév. Interne" },
];

export default function SelectQualite({
  value,
  onChange,
  label = "Qualité",
  sx = {},
  fullWidth = true,
}) {
  return (
    <FormControl fullWidth={fullWidth} sx={sx} size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        label={label}
      >
        <MenuItem value="">(Toutes)</MenuItem>
        {QUALITE_OPTIONS.map((q) => (
          <MenuItem key={q.value} value={q.value}>
            {q.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
