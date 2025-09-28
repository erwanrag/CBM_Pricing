# backend/app/config/production.py
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import logging

class ProductionSettings(BaseSettings):
    """Configuration sécurisée pour l'environnement de production CBM_Pricing"""
    
    # === Application ===
    APP_NAME: str = "CBM_Pricing_API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="production", description="Environnement d'exécution")
    DEBUG: bool = Field(default=False, description="Mode debug (JAMAIS en production)")
    
    # === Sécurité ===
    SECRET_KEY: str = Field(..., description="Clé secrète pour JWT et sessions")
    API_KEY_HEADER: str = Field(default="X-API-Key", description="Header pour l'authentification API")
    ALLOWED_HOSTS: List[str] = Field(default=["10.103.3.11", "localhost"], description="Hosts autorisés")
    CORS_ORIGINS: List[str] = Field(
        default=["http://10.103.3.11:5173", "https://cbm-pricing.internal"],
        description="Origins CORS autorisées"
    )
    
    # === Base de données ===
    DB_HOST: str = Field(..., description="Host SQL Server")
    DB_PORT: int = Field(default=1433, description="Port SQL Server")
    DB_NAME: str = Field(default="CBM_DATA", description="Nom de la base")
    DB_USER: str = Field(..., description="Utilisateur SQL Server")
    DB_PASSWORD: str = Field(..., description="Mot de passe SQL Server")
    DB_DRIVER: str = Field(default="ODBC Driver 17 for SQL Server", description="Driver ODBC")
    DB_POOL_SIZE: int = Field(default=20, description="Taille du pool de connexions")
    DB_MAX_OVERFLOW: int = Field(default=30, description="Connexions supplémentaires max")
    DB_POOL_TIMEOUT: int = Field(default=60, description="Timeout pool en secondes")
    
    # === Redis ===
    REDIS_HOST: str = Field(default="localhost", description="Host Redis")
    REDIS_PORT: int = Field(default=6379, description="Port Redis")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Mot de passe Redis")
    REDIS_DB: int = Field(default=0, description="Numéro de base Redis")
    REDIS_TTL_SHORT: int = Field(default=300, description="TTL court (5min)")
    REDIS_TTL_MEDIUM: int = Field(default=1800, description="TTL moyen (30min)")
    REDIS_TTL_LONG: int = Field(default=3600, description="TTL long (1h)")
    REDIS_MAX_CONNECTIONS: int = Field(default=100, description="Connexions Redis max")
    
    # === Performance ===
    MAX_REQUEST_SIZE: int = Field(default=16 * 1024 * 1024, description="Taille max requête (16MB)")
    REQUEST_TIMEOUT: int = Field(default=60, description="Timeout requête en secondes")
    SLOW_QUERY_THRESHOLD: float = Field(default=1.0, description="Seuil requête lente en secondes")
    PAGINATION_MAX_SIZE: int = Field(default=1000, description="Taille max pagination")
    CACHE_DEFAULT_TTL: int = Field(default=900, description="TTL cache par défaut (15min)")
    
    # === Monitoring ===
    ENABLE_MONITORING: bool = Field(default=True, description="Activer le monitoring")
    ENABLE_AI_ANALYSIS: bool = Field(default=True, description="Activer l'analyse IA")
    METRICS_RETENTION_DAYS: int = Field(default=30, description="Rétention métriques en jours")
    LOG_LEVEL: str = Field(default="INFO", description="Niveau de log")
    LOG_FILE_PATH: str = Field(default="/var/log/cbm_pricing/app.log", description="Chemin fichier de log")
    LOG_MAX_SIZE_MB: int = Field(default=100, description="Taille max log en MB")
    LOG_BACKUP_COUNT: int = Field(default=5, description="Nombre de fichiers de log à conserver")
    
    # === Alerting ===
    ALERT_EMAIL_ENABLED: bool = Field(default=False, description="Alertes par email")
    ALERT_EMAIL_SMTP_HOST: Optional[str] = Field(default=None, description="Host SMTP")
    ALERT_EMAIL_SMTP_PORT: int = Field(default=587, description="Port SMTP")
    ALERT_EMAIL_FROM: Optional[str] = Field(default=None, description="Email expéditeur")
    ALERT_EMAIL_TO: List[str] = Field(default=[], description="Destinataires alertes")
    ALERT_SLACK_ENABLED: bool = Field(default=False, description="Alertes Slack")
    ALERT_SLACK_WEBHOOK: Optional[str] = Field(default=None, description="Webhook Slack")
    
    # === Sécurité avancée ===
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Activer rate limiting")
    RATE_LIMIT_REQUESTS: int = Field(default=1000, description="Requêtes max par heure")
    RATE_LIMIT_WINDOW: int = Field(default=3600, description="Fenêtre rate limit en secondes")
    IP_WHITELIST: List[str] = Field(default=[], description="IPs en whitelist")
    IP_BLACKLIST: List[str] = Field(default=[], description="IPs bloquées")
    
    # === Backup et archivage ===
    BACKUP_ENABLED: bool = Field(default=True, description="Activer les sauvegardes")
    BACKUP_PATH: str = Field(default="/var/backups/cbm_pricing", description="Répertoire de sauvegarde")
    BACKUP_RETENTION_DAYS: int = Field(default=90, description="Rétention sauvegardes en jours")
    ARCHIVE_OLD_DATA: bool = Field(default=True, description="Archiver anciennes données")
    ARCHIVE_THRESHOLD_MONTHS: int = Field(default=24, description="Seuil archivage en mois")
    
    class Config:
        env_file = ".env.production"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @validator("DEBUG")
    def debug_must_be_false_in_production(cls, v, values):
        """S'assurer que DEBUG est False en production"""
        if values.get("ENVIRONMENT") == "production" and v is True:
            raise ValueError("DEBUG ne peut pas être True en production")
        return v
    
    @validator("SECRET_KEY")
    def secret_key_must_be_strong(cls, v):
        """Valider que la clé secrète est suffisamment forte"""
        if len(v) < 32:
            raise ValueError("SECRET_KEY doit faire au moins 32 caractères")
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        """Valider le niveau de log"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL doit être dans {valid_levels}")
        return v.upper()
    
    def get_database_url(self) -> str:
        """Construit l'URL de connexion à la base de données"""
        # URL pour SQLAlchemy avec pyodbc
        return (
            f"mssql+pyodbc://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/"
            f"{self.DB_NAME}?driver={self.DB_DRIVER.replace(' ', '+')}&charset=utf8"
        )
    
    def get_redis_url(self) -> str:
        """Construit l'URL de connexion Redis"""
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    def setup_logging(self) -> None:
        """Configure le système de logging pour la production"""
        import logging.handlers
        
        # Créer le répertoire de log s'il n'existe pas
        log_dir = os.path.dirname(self.LOG_FILE_PATH)
        os.makedirs(log_dir, exist_ok=True)
        
        # Configuration du logger principal
        logger = logging.getLogger()
        logger.setLevel(getattr(logging, self.LOG_LEVEL))
        
        # Formatter pour les logs
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Handler pour fichier avec rotation
        file_handler = logging.handlers.RotatingMaxBytes(
            filename=self.LOG_FILE_PATH,
            maxBytes=self.LOG_MAX_SIZE_MB * 1024 * 1024,
            backupCount=self.LOG_BACKUP_COUNT
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Handler pour console (avec niveau plus élevé)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # Réduire le verbosity des librairies externes
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
    
    def get_security_headers(self) -> dict:
        """Retourne les headers de sécurité à appliquer"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY", 
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }

# Instance globale des settings
settings = ProductionSettings()

# Fonction d'initialisation
def initialize_production_config():
    """Initialise la configuration de production"""
    
    # Setup logging
    settings.setup_logging()
    
    # Validation de l'environnement
    required_env_vars = [
        "SECRET_KEY",
        "DB_HOST", 
        "DB_USER",
        "DB_PASSWORD"
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not getattr(settings, var, None):
            missing_vars.append(var)
    
    if missing_vars:
        raise RuntimeError(
            f"Variables d'environnement manquantes pour la production: {', '.join(missing_vars)}"
        )
    
    logging.info("✅ Configuration de production initialisée")
    logging.info(f"🎯 Application: {settings.APP_NAME} v{settings.APP_VERSION}")
    logging.info(f"🌍 Environnement: {settings.ENVIRONMENT}")
    logging.info(f"📊 Monitoring activé: {settings.ENABLE_MONITORING}")
    logging.info(f"🤖 IA activée: {settings.ENABLE_AI_ANALYSIS}")
    
    return settings

# Validation de sécurité
def validate_security_config():
    """Valide la configuration de sécurité"""
    issues = []
    
    # Vérifications de base
    if settings.DEBUG:
        issues.append("❌ DEBUG activé en production")
    
    if len(settings.SECRET_KEY) < 32:
        issues.append("❌ SECRET_KEY trop courte")
    
    if not settings.CORS_ORIGINS:
        issues.append("⚠️ Aucune origine CORS configurée")
    
    if not settings.RATE_LIMIT_ENABLED:
        issues.append("⚠️ Rate limiting désactivé")
    
    if not settings.REDIS_PASSWORD and settings.ENVIRONMENT == "production":
        issues.append("⚠️ Redis sans mot de passe")
    
    if issues:
        logging.warning("🚨 Problèmes de sécurité détectés:")
        for issue in issues:
            logging.warning(f"  {issue}")
    
    return len(issues) == 0

# Export des configurations par environnement
def get_config():
    """Retourne la configuration selon l'environnement"""
    env = os.getenv("CBM_ENV", "development").lower()
    
    if env == "production":
        return initialize_production_config()
    elif env == "test":
        # Configuration de test (simplifié)
        class TestSettings(ProductionSettings):
            DEBUG: bool = True
            DB_NAME: str = "CBM_DATA_TEST"
            REDIS_DB: int = 1
            LOG_LEVEL: str = "DEBUG"
            ENABLE_MONITORING: bool = False
        
        return TestSettings()
    else:
        # Configuration de développement
        class DevSettings(ProductionSettings):
            DEBUG: bool = True
            LOG_LEVEL: str = "DEBUG"
            CORS_ORIGINS: List[str] = ["*"]
            RATE_LIMIT_ENABLED: bool = False
        
        return DevSettings()