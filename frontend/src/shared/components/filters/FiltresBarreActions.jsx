//src/shared/components/filters/FiltresBarreActions.jsx
import { Box } from "@mui/material";
import CBMButton from "@/shared/components/buttons/CBMButton";

export default function FiltresBarreActions({ onSearch, onReset }) {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <CBMButton onClick={onSearch} variant="primary" size="sm">
        Rechercher
      </CBMButton>
      <CBMButton onClick={onReset} variant="tertiary" size="sm">
        Réinitialiser
      </CBMButton>
    </Box>
  );
}
