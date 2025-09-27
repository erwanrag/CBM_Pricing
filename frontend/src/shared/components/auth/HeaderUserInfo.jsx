// src/components/auth/HeaderUserInfo.jsx
import { useAuth } from "@/context/auth/useAuth";
import { Avatar, Typography, Box } from "@mui/material";

export default function HeaderUserInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Avatar sx={{ width: 32, height: 32 }}>{user.email?.charAt(0).toUpperCase()}</Avatar>
      <Box>
        <Typography variant="subtitle2">{user.email}</Typography>
        <Typography variant="caption" color="textSecondary">
          {user.role}
        </Typography>
      </Box>
    </Box>
  );
}
