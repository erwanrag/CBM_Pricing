// 📁 src/shared/layout/Layout.jsx - CORRIGÉ
import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/context/sidebar/SidebarProvider";
import { LayoutContext } from "@/context/layout/LayoutContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAutoLogout from "@/hooks/useAutoLogout";
import { LAYOUT } from "@/shared/theme/theme";
import ContentContainer from "./ContentContainer";

const Layout = () => {
  // CORRECTION: Initialiser avec un objet vide au lieu de null
  const [filters, setFilters] = useState({});
  const [filterType, setFilterType] = useState(null);
  
  useAutoLogout();

  // Debug pour vérifier les changements de filtres
  if (process.env.NODE_ENV === 'development') {
    console.log("Layout filters changed:", filters);
  }

  return (
    <SidebarProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-white text-black p-2 z-50">
        Aller au contenu principal
      </a>
      <LayoutContext.Provider value={{ filters, setFilters, filterType, setFilterType }}>
        <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
          <Box component="nav" aria-label="Navigation principale">
            <Sidebar />
          </Box>
          <Box
            component="main"
            role="main"
            id="main-content"
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Header />
            <Box sx={{ height: `${LAYOUT.HEADER_HEIGHT}px` }} />
            <ContentContainer>
              <Outlet />
            </ContentContainer>
          </Box>
        </Box>
        <ToastContainer
          position="bottom-right"
          role="status"
          aria-live="polite"
          closeOnClick
        />
      </LayoutContext.Provider>
    </SidebarProvider>
  );
};

export default Layout;