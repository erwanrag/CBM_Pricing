// src/app/routes/publicRoutes.js
// 📁 Définit les routes accessibles sans authentification (login, etc.)

import { lazy } from "react";

const Login = lazy(() => import("@/pages/Login"));

export const publicRoutes = [{ path: "/login", element: Login }];
