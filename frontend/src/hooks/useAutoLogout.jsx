//src/hooks/useAutoLogout.jsx
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const TIMEOUT = 15 * 60 * 1000;

export default function useAutoLogout() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    navigate("/login");
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "click", "scroll", "keypress"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
}
