// src/shared/components/badges/BadgeQualite.jsx
import { Chip } from "@mui/material";
import { getQualiteColor, getQualiteLabel } from "@/lib/colors";

export default function BadgeQualite({ qualite }) {
  const color = getQualiteColor(qualite);
  return (
    <Chip
      label={getQualiteLabel(qualite)}
      size="small"
      sx={{
        fontWeight: 600,
        bgcolor: `${color}33`,
        color,
        border: `1px solid ${color}`,
        borderRadius: "8px",
      }}
    />
  );
}
