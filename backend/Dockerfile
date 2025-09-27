# Utilise une image officielle Python slim
FROM python:3.11-slim

WORKDIR /app

# Copie des requirements et installation
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code
COPY app/ ./app/

# Variable d'environnement pour FastAPI
ENV PYTHONPATH=/app

# Commande de démarrage (ici avec uvicorn)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
