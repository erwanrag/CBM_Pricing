// src/main.jsx
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "@/styles/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const App = lazy(() => import("@/app/App"));


ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={<div className="text-center p-4">Chargement…</div>}>
      <App />
    </Suspense>
  </QueryClientProvider>
);
