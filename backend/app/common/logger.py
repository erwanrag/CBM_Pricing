from loguru import logger
import os
import sys

ENV = os.getenv("CBM_ENV", "dev")
LOG_LEVEL = "DEBUG" if ENV == "dev" else "INFO"

# 🔐 Chemin absolu du dossier logs basé sur le fichier .env
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
log_dir = os.path.join(base_dir, os.getenv("CBM_LOG_DIR", "logs"))
os.makedirs(log_dir, exist_ok=True)

log_file_path = os.path.join(log_dir, "cbm_api.log")

# 🔧 Config Loguru
logger.remove()
logger.add(sys.stdout, format="{time} | {level} | {message}", level=LOG_LEVEL)
logger.add(log_file_path, level=LOG_LEVEL, serialize=True, rotation="10 MB", retention="7 days")