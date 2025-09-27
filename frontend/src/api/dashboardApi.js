// src/api/dashboardApi.js
import { api } from "@/api";

export async function fetchDashboardKPI(payload) {
  const response = await api.post("/dashboard/kpi", payload);
  return response.data ?? [];
}

export async function fetchHistoriquePrixMarge(payload) {
  const response = await api.post("/dashboard/historique", payload);
  return response.data ?? [];
}

export async function fetchDashboardProducts(payload, page = 0, limit = 100) {
  const response = await api.post(`/dashboard/products?page=${page}&limit=${limit}`, payload);
  return response.data ?? { rows: [], total: 0 };
}

