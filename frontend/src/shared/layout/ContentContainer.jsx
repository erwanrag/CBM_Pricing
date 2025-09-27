// src/shared/layout/ContentContainer.jsx
import { Box } from "@mui/material";
import { LAYOUT } from "@/shared/theme/theme";

const ContentContainer = ({ children }) => (
  <Box
    sx={{
      mt: `${LAYOUT.HEADER_HEIGHT}px`,
      px: { xs: 2, md: 4 },
      py: 3,
    }}
  >
    {children}
  </Box>
);

export default ContentContainer;
