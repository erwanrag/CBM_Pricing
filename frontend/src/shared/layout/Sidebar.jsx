// 📁 src/shared/layout/Sidebar.jsx
import React, { useEffect } from "react";
import { Drawer, Box, Divider, Typography, Paper } from "@mui/material";
import { useLayout } from "@/context/layout/LayoutContext";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "./Navigation";
import FiltersPanel from "./FiltersPanel";
import { useSidebar } from "@/context/sidebar/useSidebar";
import logo from "@/assets/cbm-logo.png";

const Sidebar = () => {
  const { isSidebarOpen, isSidebarPinned, closeSidebar } = useSidebar();
  const context = useLayout();
  const filterType = context?.filterType;
  const showFilters = filterType === "dashboard";

  // Debug pour identifier le problème (seulement aux changements significatifs)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Sidebar filterType change:", {
        filterType,
        showFilters,
        contextAvailable: !!context,
        isSidebarOpen,
        isSidebarPinned
      });
    }
  }, [filterType, showFilters]); // Log seulement quand ces valeurs changent

  return (
    <AnimatePresence>
      {(isSidebarOpen || isSidebarPinned) && (
        <motion.div
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -280, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Drawer
            variant={isSidebarPinned ? "permanent" : "temporary"}
            anchor="left"
            open={true}
            onClose={closeSidebar}
            sx={{
              width: 280, // Augmenté pour meilleur affichage des filtres
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 280,
                boxSizing: "border-box",
                backgroundColor: "#f9fafb",
                borderRight: "1px solid #e0e0e0",
                display: "flex",
                flexDirection: "column",
                pt: 2, // Réduit pour plus d'espace
              },
            }}
          >
            {/* Logo et titre */}
            <Box
              sx={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                gap: 1, 
                mb: 2,
                px: 2
              }}
            >
              <img src={logo} alt="CBM Logo" style={{ width: "60px" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.main" }}>
                CBM Pricing
              </Typography>
            </Box>

            {/* Navigation */}
            <Box sx={{ px: 1 }}>
              <Navigation />
            </Box>

            {/* Filtres Dashboard - Ajout conditionnel amélioré */}
            {showFilters ? (
              <Box sx={{ mt: "auto", p: 2 }}>
                <FiltersPanel />
              </Box>
            ) : (
              <Box sx={{ mt: "auto" }} />
            )}

            {/* Debug visuel en développement */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ p: 1, bgcolor: "#f0f0f0", fontSize: "10px" }}>
                <Typography variant="caption">
                  Debug: filterType={filterType}, showFilters={showFilters ? "true" : "false"}
                </Typography>
              </Box>
            )}
          </Drawer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;