//src/features/auth/LoginForm.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api";
import { api } from "@/api";
import { useAuth } from "@/context/auth/useAuth";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";

export default function LoginForm() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/alertes");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token } = await login(email, password);
      localStorage.setItem("token", access_token);
      localStorage.setItem("email", email);

      const roleRes = await api.get("/tarifs/roles/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const role = roleRes.data.role;

      localStorage.setItem("role", role);
      setUser({ email, role });
      navigate("/alertes");
    } catch {
      setError("Email ou mot de passe invalide.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      await api.post("/auth/request-reset", { email });
      setCodeSent(true);
      setError("");
      setMessage("Code envoyé par email.");
    } catch {
      setMessage("");
      setError("Erreur lors de l'envoi du code.");
    }
  };

  const handleResetPassword = async () => {
    try {
      await api.post("/auth/reset-password", {
        email,
        code,
        new_password: newPassword,
      });
      setMessage("Mot de passe réinitialisé.");
      setError("");
      setTimeout(() => {
        setMode("login");
        setCodeSent(false);
        setPassword("");
        setCode("");
        setNewPassword("");
      }, 2000);
    } catch {
      setError("Code invalide ou expiré.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" align="center" gutterBottom>
          {mode === "login" ? "Connexion" : "Réinitialisation"}
        </Typography>

        <Stack spacing={2}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            type="email"
            label="Email"
            value={email}
            fullWidth
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode === "login" ? (
            <>
              <TextField
                type="password"
                label="Mot de passe"
                value={password}
                fullWidth
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button onClick={handleLogin} variant="contained" fullWidth disabled={loading}>
                {loading ? <CircularProgress size={20} /> : "Se connecter"}
              </Button>
              <Typography
                variant="body2"
                align="center"
                sx={{ textDecoration: "underline", cursor: "pointer" }}
                onClick={() => {
                  setMode("reset");
                  setError("");
                  setMessage("");
                }}
              >
                Mot de passe oublié ?
              </Typography>
            </>
          ) : (
            <>
              {codeSent ? (
                <>
                  <TextField
                    label="Code reçu"
                    value={code}
                    fullWidth
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <TextField
                    label="Nouveau mot de passe"
                    type="password"
                    value={newPassword}
                    fullWidth
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleResetPassword} fullWidth>
                    Valider
                  </Button>
                </>
              ) : (
                <Button variant="contained" onClick={handleSendCode} fullWidth>
                  Envoyer le code
                </Button>
              )}
              <Divider />
              <Typography
                variant="body2"
                align="center"
                sx={{ textDecoration: "underline", cursor: "pointer" }}
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                ← Retour à la connexion
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
