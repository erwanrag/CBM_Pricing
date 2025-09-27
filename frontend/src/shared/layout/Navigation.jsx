// src/shared/layout/Navigation.jsx
import { List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuth } from "@/context/auth/useAuth";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const showSettings = ["admin", "editor"].includes(user?.role);

  const navItems = [
    { label: "Alertes", to: ROUTES.alertes, icon: <WarningAmberIcon /> },
    { label: "Analyse Produit", to: ROUTES.dashboard, icon: <AnalyticsIcon /> },
    { label: "Modifications tarif", to: ROUTES.modifications, icon: <AssignmentIcon /> },
    { label: "Comparatif Tarif", to: ROUTES.compare, icon: <Inventory2Icon /> },
    ...(showSettings
      ? [{ label: "Paramètres", to: ROUTES.parametres, icon: <SettingsIcon /> }]
      : []),
  ];

  return (
    <List sx={{ width: "100%" }}>
      {navItems.map(({ label, to, icon }) => {
        const isActive = location.pathname === to;

        return (
          <ListItemButton
            key={to}
            component={Link}
            to={to}
            selected={isActive}
            sx={{
              borderLeft: isActive ? "4px solid #1b365d" : "4px solid transparent",
              backgroundColor: isActive ? "#f0f4f8" : "transparent",
              color: isActive ? "primary.main" : "inherit",
              px: 2,
              py: 1.5,
              "&:hover": {
                backgroundColor: "#f5faff",
              },
            }}
          >
            <ListItemIcon sx={{ color: isActive ? "primary.main" : "#757575", minWidth: 36 }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
};

export default Navigation;
