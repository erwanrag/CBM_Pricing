// src/shared/components/auth/LogoutButton.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth/useAuth";
import CBMButton from "@/shared/components/buttons/CBMButton";
import { LogOut } from "lucide-react"; // si tu utilises lucide-react

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Déconnecte l'utilisateur
    navigate("/login");
  };

  return (
    <CBMButton
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2 text-sm"
    >
      <LogOut size={16} /> Déconnexion
    </CBMButton>
  );
}
