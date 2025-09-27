// src/shared/components/tables/ColumnPicker.jsx
import React from "react";
import { Button, Popover, FormGroup, FormControlLabel, Checkbox, FormLabel } from "@mui/material";

export default function ColumnPicker({
  allColumns,
  visibility,
  setVisibility,
  onReset,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const toggle = (field) =>
    setVisibility((v) => ({ ...v, [field]: !v[field] }));

  return (
    <>
      <Button variant="outlined" size="small" onClick={e => setAnchorEl(e.currentTarget)}>
        ☰ Afficher/masquer colonnes
      </Button>
      <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
        <FormGroup sx={{ p: 2, minWidth: 200 }}>
          <FormLabel sx={{ fontWeight: 700, mb: 1 }}>Afficher/masquer colonnes</FormLabel>
          {allColumns.map(col => (
            <FormControlLabel
              key={col.field}
              control={
                <Checkbox
                  checked={visibility[col.field] ?? true}
                  onChange={() => toggle(col.field)}
                />
              }
              label={col.headerName}
            />
          ))}
          <Button size="small" onClick={onReset} sx={{ mt: 1 }}>Réinitialiser</Button>
        </FormGroup>
      </Popover>
    </>
  );
}
