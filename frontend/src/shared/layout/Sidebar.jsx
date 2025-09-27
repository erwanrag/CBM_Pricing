// 📁 src/shared/layout/Sidebar.jsx
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
              width: 240,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 240,
                boxSizing: "border-box",
                backgroundColor: "#f9fafb",
                borderRight: "1px solid #e0e0e0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pt: 8,
              },
            }}
          >
            <Box
              sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, mb: 3 }}
            >
              <img src={logo} alt="CBM Logo" style={{ width: "80px" }} />
              {isSidebarPinned && (
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "primary.main" }}>
                  CBM Pricing
                </Typography>
              )}
            </Box>

            <Navigation />

            <Divider sx={{ width: "100%", mt: "auto" }} />

            {showFilters && (
              <Box sx={{ width: "100%", px: 0, py: 3 }}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <FiltersPanel />
                </Paper>
              </Box>
            )}
          </Drawer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
