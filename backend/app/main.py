# 📄 backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import time
import redis.asyncio as redis

from app.settings import get_settings
from app.db.engine import test_db_connection
from app.common.logger import logger
from app.common.redis_client import test_connection, redis_client

# === Chargement des paramètres ===
settings = get_settings()

# === CORS dynamique via settings ===
FRONTEND_PORTS = settings.FRONTEND_PORTS
HOST = settings.FRONTEND_HOST

allow_origins = [
    f"http://{HOST}:{port.strip()}" for port in FRONTEND_PORTS.split(",")
] + [
    f"http://localhost:{port.strip()}" for port in FRONTEND_PORTS.split(",")
] + [
    f"http://127.0.0.1:{port.strip()}" for port in FRONTEND_PORTS.split(",")
]

print("CORS allow_origins:", allow_origins)

# === Application FastAPI ===
app = FastAPI(
    title="CBM Pricing API",
    version="0.1.0",
    docs_url="/docs"
)

# === Rate limiting (Redis) ===
limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# === Middleware CORS (doit être en tout premier !) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,   # obligatoire si tu envoies cookies / tokens
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Middleware compression GZIP ===
app.add_middleware(GZipMiddleware, minimum_size=1000)

# === Middleware TrustedHost ensuite ===
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["cbm.local", HOST, "localhost", "127.0.0.1"]
)

# ✅ === Middleware log durée requête + statut ===
@app.middleware("http")
async def log_request_duration(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} - {duration:.2f} ms - Status {response.status_code}")
    return response

# === Connexion Redis au démarrage ===
@app.on_event("startup")
async def startup():
    await test_connection()
    if not await test_db_connection():
        raise RuntimeError("La base de données est inaccessible.")

@app.get("/test-cors")
def test_cors():
    return {"ok": True}

# === Routers ===
from app.routers import (
    auth_router,
    dashboard_router,
    fiche_router,
    identifiers_router,
    suggestions_router,
    tarifs_router,
    parametres_router,
    log_router,
    export_router,
    alertes_router, 
    monitoring_router
)

app.include_router(auth_router)
app.include_router(alertes_router)
app.include_router(dashboard_router)
app.include_router(export_router)
app.include_router(fiche_router)
app.include_router(identifiers_router)
app.include_router(log_router)
app.include_router(parametres_router)
app.include_router(suggestions_router)
app.include_router(tarifs_router)
app.include_router(monitoring_router)

@app.get("/health")
async def healthcheck():
    try:
        await redis_client.ping()
        return {"status": "ok", "redis": "connected"}
    except:
        return JSONResponse(status_code=503, content={"status": "degraded", "redis": "unreachable"})

@app.get("/")
async def root():
    return JSONResponse(
        content={"message": "CBM Pricing API is alive"},
        headers={"Content-Type": "application/json; charset=UTF-8"}
    )

# === Handler global : erreurs non capturées ===
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[500] {request.method} {request.url.path} - {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Erreur serveur inattendue."}
    )

# === Handler validation Pydantic ===
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"[422] Validation error on {request.url.path} - {exc}")
    return JSONResponse(
        status_code=422,
        content={"message": "Erreur de validation", "details": exc.errors()}
    )

# === Handler HTTPException explicite (404, etc.) ===
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.info(f"[{exc.status_code}] {request.method} {request.url.path} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

@app.on_event("shutdown")
async def shutdown():
    await redis_client.aclose()
