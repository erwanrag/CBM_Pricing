# CBM Pricing - Déploiement

## Structure

- `dev/` → développement
- `prod/` → production
- `scripts/` → outils d'automatisation

## Scripts importants

| Script | Description |
|--------|-------------|
| `start_dev.bat` | Lance le backend + frontend React en dev |
| `start_prod.bat` | Lance Redis + FastAPI + Serve |
| `build_frontend.bat` | Compile React et copie vers prod |
| `deploy_to_prod.bat` | Copie backend dev → prod |
| `sync_dev_to_prod.bat` | Combine build + deploy |
| `stop_cbm_pricing.bat` | Ferme tous les processus liés |

## Environnement

- React : port `5174` en dev, `5173` en prod
- FastAPI : `8001` en dev, `8000` en prod
- Redis : `6379`

## Déploiement classique

1. `scripts\build_frontend.bat`
2. `scripts\deploy_to_prod.bat`
3. `scripts\start_prod.bat`

