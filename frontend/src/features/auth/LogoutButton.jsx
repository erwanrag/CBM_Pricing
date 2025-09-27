//src/features/auth/LogoutButton.jsx
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/context/AuthContext";
import { clearSession } from "@/api";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogout = () => {
    clearSession();
    setUser(null);
    navigate("/login");
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outlined"
      size="small"
      color="error"
      startIcon={<LogoutIcon />}
      sx={{ textTransform: "none" }}
    >
      Déconnexion
    </Button>
  );
}
