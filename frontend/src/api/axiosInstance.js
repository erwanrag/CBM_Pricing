// src/api/axiosInstance.js
import axios from "axios";
import { API_BASE_URL } from "@/config/env";
import qs from "qs";

const api = axios.create({
  baseURL: API_BASE_URL, // ✅ depuis env.js
  timeout: 30000,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }), // ✅ important pour FastAPI
});

// 🔐 Intercepteur auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🚫 Intercepteur d'erreur 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      console.warn("⛔ Token invalide ou expiré.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ✅ Export unique et final
export default api;
