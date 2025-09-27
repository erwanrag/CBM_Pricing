// src/app/routes/privateRoute.js
import { useAuth } from "@/context/auth/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-4 text-center">Chargement...</div>;

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}
