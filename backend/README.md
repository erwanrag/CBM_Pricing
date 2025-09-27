# 🚀 CBM Pricing API

Backend FastAPI pour la gestion des tarifs CBM, avec une architecture professionnelle, modulaire et scalable.  
Ce backend interagit avec un DataMart SQL Server et Redis, et fournit des services d'analyse tarifaire, d'alertes, de catalogue, de comparatifs, et de gestion des paramètres.

---

## 🏗️ Architecture technique

- **Framework** : FastAPI (async)
- **Base de données** : SQL Server (via pyodbc + SQLAlchemy async)
- **Cache** : Redis (`aiocache`)
- **Logs** : Personnalisés via `logger.py`
- **Tests** : `pytest` + `pytest-asyncio` + `coverage`
- **Compression** : GZIP
- **Sécurité CORS** : dynamique via environnement

---

## 📁 Structure du projet

```bash
backend/
├── app/
│   ├── main.py                # Entrée de l'application FastAPI
│   ├── settings.py            # Paramètres dynamiques (.env)
│   ├── routers/               # Endpoints API par domaine
│   ├── services/              # Logique métier par domaine
│   ├── schemas/               # Schémas Pydantic
│   ├── db/                    # Connexions, sessions, dépendances
│   ├── cache/                 # Clés Redis
│   ├── common/                # Utils communs (pagination, enums, SQL utils)
│   ├── utils/                 # Logger, factories, etc.
│   └── tests/                 # Tests backend avec couverture
