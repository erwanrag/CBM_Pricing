// src/app/routes/privateRoutes.js
// 📁 Définit les routes protégées derrière authentification (dashboard, etc.)

import { lazy } from "react";

const Alertes = lazy(() => import("@/pages/Alertes"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CompareTarif = lazy(() => import("@/pages/CompareTarif"));
const TarifModificationsPage = lazy(() => import("@/pages/TarifModificationsPage"));
const Parametres = lazy(() => import("@/pages/Parametres"));

export const privateRoutes = [
  { path: "", element: Alertes },
  { path: "alertes", element: Alertes },
  { path: "dashboard", element: Dashboard },
  { path: "compare-tarif", element: CompareTarif },
  { path: "modifications", element: TarifModificationsPage },
  { path: "parametres", element: Parametres },
];
