from .alertes.alertes import alertes_router
from .auth.router import auth_router
from .dashboard.router import dashboard_router
from .exports.router import router as export_router
from .produits.fiche import router as  fiche_router
from .produits.identifiers import router as identifiers_router
from .produits.suggestions import router as suggestions_router
from .logs.router import log_router
from .parametres.router import parametres_router
from .tarifs.router import router as tarifs_router
from .monitoring.monitoring import router as monitoring_router

__all__ = [
    "alertes_router",
    "auth_router",
    "dashboard_router",
    "export_router",
    "fiche_router",
    "identifiers_router",
    "log_router",
    "parametres_router",
    "suggestions_router",
    "tarifs_router",
    "monitoring_router"
]