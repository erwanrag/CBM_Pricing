
// src/shared/components/badges/StatutBadge.jsx
import { Chip, Tooltip } from "@mui/material";
import { getStatutColor, getStatutLabel } from "@/lib/colors";

export default function StatutBadge({ value }) {
  const color = getStatutColor(value);
  const label = value ?? "-";
  const tooltip = getStatutLabel(value);

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        label={label}
        size="small"
        sx={{
          fontWeight: 700,
          bgcolor: `${color}33`, // transparence
          color,
          border: `1.5px solid ${color}`,
          borderRadius: "8px",
          minWidth: 40,
          textAlign: "center",
          fontSize: "1em",
        }}
      />
    </Tooltip>
  );
}
