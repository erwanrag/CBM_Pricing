//src/shared/components/skeleton/GlobalSkeleton.jsx
import React from "react";
import { Skeleton, Box } from "@mui/material";

const GlobalSkeleton = ({ height = "70vh", width = "100%", variant = "rectangular" }) => {
  return (
    <Box sx={{ width: width, height: height }}>
      <Skeleton variant={variant} width="100%" height="100%" animation="wave" />
    </Box>
  );
};

export default GlobalSkeleton;
