//src/features/auth/HeaderUserInfo.jsx
import { useState, useEffect } from "react";
import {
  Avatar,
  Menu,
  MenuItem,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  ListItemIcon,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { clearSession } from "@/api";

export default function HeaderUserInfo() {
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const { setUser: setAuthUser } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      setUser({ email: decoded.sub, role: decoded.role });
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    setAuthUser(null);
    navigate("/login");
  };

  if (!user) return null;

  const initials = user.email?.slice(0, 2).toUpperCase();

  return (
    <>
      <Tooltip title="Compte utilisateur">
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
          <Avatar>{initials}</Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        onClick={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled>
          <Typography variant="body2">{user.email}</Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="caption" color="text.secondary">
            Rôle : {user.role}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Se déconnecter
        </MenuItem>
      </Menu>
    </>
  );
}
