//src/context/auth/AuthProvider.jsx

import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");

    if (email && role) {
      setUser({ email, role });
    }

    setLoading(false);
  }, []);

  const isAuthenticated = !!user;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
