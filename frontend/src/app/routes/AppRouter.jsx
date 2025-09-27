// src/app/routes/AppRouter.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { publicRoutes } from "./publicRoutes";
import { privateRoutes } from "./privateRoutes";
import PrivateRoute from "./privateRoute";
import Layout from "@/shared/layout/Layout";
import NotFound from "@/pages/NotFound";
import { Suspense, createElement } from "react";

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
