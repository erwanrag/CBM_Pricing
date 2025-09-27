// src/pages/NotFound.jsx
import React from "react";
import { Box, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" gutterBottom>
        404
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        Page introuvable
      </Typography>
    </Box>
  );
}
