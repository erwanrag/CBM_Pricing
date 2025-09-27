// src/shared/layout/Header.jsx

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Breadcrumbs,
  Link as MUILink,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PushPinIcon from "@mui/icons-material/PushPin";
import { useSidebar } from "@/context/sidebar/useSidebar";
import LogoutButton from "@/shared/components/auth/LogoutButton";
import HeaderUserInfo from "@/shared/components/auth/HeaderUserInfo";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { useMemo } from "react";
import { ROUTE_TITLES } from "@/constants/routes";

const Header = () => {
  const { toggleSidebar, togglePin, isSidebarPinned } = useSidebar();
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const pathSegments = segments.slice(0, -1); // exclude last segment (current page)
    return pathSegments.map((seg, idx) => {
      const to = "/" + segments.slice(0, idx + 1).join("/");
      return (
        <MUILink
          key={to}
          component={RouterLink}
          to={to}
          underline="hover"
          color="inherit"
          sx={{ textTransform: "capitalize", fontSize: 14 }}
        >
          {ROUTE_TITLES[to] || seg.replace(/-/g, " ")}
        </MUILink>
      );
    });
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    return ROUTE_TITLES[location.pathname] || "CBM Pricing Tool";
  }, [location.pathname]);

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: "1px solid #e0e0e0",
        backdropFilter: "blur(4px)",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", alignItems: "center" }}>
        {/* Left: toggle buttons + title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={togglePin}
            sx={{ border: "1px solid #ccc", borderRadius: 1, p: 0.5 }}
          >
            <PushPinIcon color={isSidebarPinned ? "primary" : "disabled"} />
          </IconButton>

          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleSidebar}
            sx={{ border: "1px solid #ccc", borderRadius: 1, p: 0.5 }}
          >
            <MenuIcon sx={{ fontSize: 26 }} />
          </IconButton>

          <Box sx={{ display: "flex", flexDirection: "column", ml: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {pageTitle}
            </Typography>
            {breadcrumbs.length > 0 && (
              <Breadcrumbs separator="/" sx={{ fontSize: 13, color: "text.secondary" }}>
                {breadcrumbs}
              </Breadcrumbs>
            )}
          </Box>
        </Box>

        {/* Right: user info + logout */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <HeaderUserInfo />
          <LogoutButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
