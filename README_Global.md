# 🚀 CBM Pricing – Industrialisation du Pricing

Projet open source destiné à la gestion avancée du pricing pour CBM, avec séparation Dev / Prod, scripts automatisés, et architecture évolutive.

---

## 📁 Structure du Projet


CBM_Pricing/
├── dev/                  # Code en développement
│   ├── backend/          # FastAPI
│   └── frontend/         # React + Vite
├── prod/                 # Code déployé en production
│   ├── backend/          # Copie de dev/backend
│   └── frontend/dist/    # Build React
├── scripts/              # Scripts de démarrage, build, déploiement, nettoyage
├── .venv/                # Environnement Python local (non versionné)
├── .gitignore
├── README.md


## ⚙️ Stack Technique
🧠 Backend : FastAPI + SQLAlchemy (connexion SQL Server)

💻 Frontend : React + Vite + Axios + MUI

💾 Base de données : SQL Server

🧊 Cache (optionnel) : Redis

🧰 Scripts : .bat (Windows), .ps1, Python utilitaires

## 🔧 Environnement Dev
Composant	Port
FastAPI	8001
React (Vite)	5174
Redis	6379

	### ▶️ Lancer le Dev :
	
	scripts\start_dev.bat

## 🚀 Environnement Prod
Composant	Port
FastAPI	8000
Serve React	5173
Redis	6379

	### ▶️ Déployer vers la prod :
	scripts\build_frontend.bat      # Compile React
	scripts\deploy_to_prod.bat      # Copie backend
	scripts\start_prod.bat          # Lance Redis + FastAPI + Serve

##  🧩 Scripts disponibles
Script	Rôle
start_dev.bat	Lance tout l’environnement de développement
start_prod.bat	Lance tout l’environnement de production
build_frontend.bat	Compile React et copie vers prod/frontend/dist
deploy_to_prod.bat	Copie dev/backend vers prod/backend
sync_dev_to_prod.bat	Combine build + déploiement backend
stop_cbm_pricing.bat	Stoppe Redis + FastAPI + Serve
convert_to_utf8.py	Convertit les fichiers en UTF-8 sans BOM
zip_clean_project.py	Crée une archive propre du projet

## 📝 Variables d’environnement
	### 🌐 Frontend (dans dev/frontend/.env)
		VITE_API_URL=http://localhost:8001
	### 🌐 Frontend prod (dans dev/frontend/.env.production)
		VITE_API_URL=http://10.103.3.11:8000
	### 🧠 Backend (CBM_ENV dans les .bat)
		CBM_ENV=dev → CORS libre
		CBM_ENV=prod → CORS restrictif vers http://10.103.3.11:5173