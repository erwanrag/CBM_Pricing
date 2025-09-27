//src/shared/components/badges/MargeColorBox.jsx
import { Box, Tooltip, Typography } from "@mui/material";
import { getMargeColor, getMargeLabel } from "@/lib/colors";
import { safeFixed } from "@/lib/format";

export default function MargeColorBox({ value }) {
  const color = getMargeColor(value);
  let text = "-";
  if (value != null && value !== 0 && !isNaN(value)) {
    text = `${safeFixed(value)}%`;
  }
  return (
    <Tooltip title={getMargeLabel(value)} arrow>
      <Box
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: "12px",
          bgcolor: color,
          minWidth: 60,
          textAlign: "center",
        }}
      >
        <Typography variant="caption" fontWeight={500} color="white">
          {text}
        </Typography>
      </Box>
    </Tooltip>
  );
}
