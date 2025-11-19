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
    <Box sx={{
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Tooltip title={getMargeLabel(value)} arrow>
        <Box id='dzqdzq'
          sx={{
            borderRadius: "12px",
            bgcolor: color,
            textAlign: "center",
            maxHeight: '25px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '4px 8px 4px 8px'
          }}
        >
          <Typography variant="caption" fontWeight={500} color="white">
            {text}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}
