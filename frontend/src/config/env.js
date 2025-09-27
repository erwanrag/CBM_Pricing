// frontend/src/config/env.js

const env = import.meta.env.MODE;
const apiUrl = import.meta.env.VITE_API_URL;

let baseUrl = apiUrl;

if (!apiUrl) {
  if (env === "development") {
    baseUrl = "http://127.0.0.1:8001";
    console.warn("⚠️ VITE_API_URL manquant. Fallback utilisé :", baseUrl);
  } else {
    throw new Error("❌ VITE_API_URL est manquant en production ! Corrige ton .env.production.");
  }
} else {
  console.log("✅ API_BASE_URL =", baseUrl);
}

export const API_BASE_URL = baseUrl;
