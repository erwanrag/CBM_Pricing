// 📁 src/shared/layout/Sidebar.jsx
import React, { useEffect } from "react";
import { Drawer, Box, Divider, Typography } from "@mui/material";
import { useLayout } from "@/context/layout/LayoutContext";
import { AnimatePresence, motion } from "framer-motion";
import Navigation from "./Navigation";
import FiltersPanel from "./FiltersPanel";
import { useSidebar } from "@/context/sidebar/useSidebar";
import { useLocation } from "react-router-dom";
import logo from "@/assets/cbm-logo.png";

const Sidebar = () => {
  const { isSidebarOpen, isSidebarPinned, closeSidebar } = useSidebar();
  const location = useLocation();

  // 👉 Afficher les filtres uniquement si on est sur /dashboard
  const showFilters = location.pathname.startsWith("/dashboard");

  // Debug en dev
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Sidebar route change:", {
        pathname: location.pathname,
        showFilters,
      });
    }
  }, [location.pathname, showFilters]);

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
              width: 280,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 280,
                boxSizing: "border-box",
                backgroundColor: "#f9fafb",
                borderRight: "1px solid #e0e0e0",
                display: "flex",
                flexDirection: "column",
                pt: 9,
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
                px: 2,
              }}
            >
              <img src={logo} alt="CBM Logo" style={{ width: "60px" }} />
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "primary.main" }}
              >
                CBM Pricing
              </Typography>
            </Box>

            {/* Navigation */}
            <Box sx={{ px: 1 }}>
              <Navigation />
            </Box>

            {/* Filtres uniquement sur Dashboard */}
            {showFilters ? (
              <Box sx={{ mt: "auto", p: 2 }}>
                <FiltersPanel />
              </Box>
            ) : (
              <Box sx={{ mt: "auto" }} />
            )}

            {/* Debug visuel */}
            {process.env.NODE_ENV === "development" && (
              <Box sx={{ p: 1, bgcolor: "#f0f0f0", fontSize: "10px" }}>
                <Typography variant="caption">
                  Debug: pathname={location.pathname}, showFilters=
                  {showFilters ? "true" : "false"}
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
