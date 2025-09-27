import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Box sx={{ maxWidth: "1600px", mx: "auto", mt: 2 }}>{children}</Box>
    </motion.div>
  );
};

export default PageWrapper;
