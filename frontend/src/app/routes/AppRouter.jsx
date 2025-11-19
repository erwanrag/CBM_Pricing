// src/app/routes/AppRouter.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { publicRoutes } from "./publicRoutes";
// import { privateRoutes } from "./privateRoutes";
import PrivateRoute from "./privateRoute";
import Layout from "@/shared/layout/Layout";
import NotFound from "@/pages/NotFound";
import { Suspense, createElement } from "react";

import { lazy } from "react";

const Alertes = lazy(() => import("@/pages/Alertes"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CompareTarif = lazy(() => import("@/pages/CompareTarif"));
const TarifModificationsPage = lazy(() => import("@/pages/TarifModificationsPage"));
const Parametres = lazy(() => import("@/pages/Parametres"));

const privateRoutes = [
  { path: "", element: Alertes },
  { path: "alertes", element: Alertes },
  { path: "dashboard", element: Dashboard },
  { path: "compare-tarif", element: CompareTarif },
  { path: "modifications", element: TarifModificationsPage },
  { path: "parametres", element: Parametres },
];

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-4">Chargement…</div>}>
        <Routes>
          {publicRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={createElement(element)} />
          ))}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {privateRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={createElement(element)} />
            ))}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
