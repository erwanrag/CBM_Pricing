# app/routers/exports/router.py

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.common.logger import logger
import aiofiles
import os
import json

from app.db.dependencies import get_db
from app.schemas.tarifs.comparatif_multi_schema import ComparatifFilterRequest
from app.services.tarifs.comparatif_multi_service import get_comparatif_multi

from app.schemas.alertes.alertes_schema import AlertesSummaryRequest
from app.services.alertes.alertes_service import get_alertes_summary  


# Dossier d'export - modifie selon ton environnement réel
EXPORT_DIR = r"\\asp.local\cbm$\DOCBUR\PROD\BI-Sharing\CBM_Pricing_Link\Export"
CSV_SEPARATOR = ";"
router = APIRouter(prefix="/export", tags=["Exports"])

# Helper : écriture fichier csv asynchrone
async def write_csv_file(filename: str, content: str):
    full_path = os.path.join(EXPORT_DIR, filename)
    async with aiofiles.open(full_path, mode="w", encoding="utf-8-sig") as f:
        await f.write(content)

# Helper : génération contenu CSV dynamique selon structure des données
def generate_csv_from_rows(rows):
    if not rows:
        # En-tête CSV même si pas de données
        return "cod_pro,refint,nom_pro,qualite,statut,prix_achat,pmp_LM,stock_LM,ca_LM,qte_LM,marge_LM," \
               "tarif_no,prix,marge,qte,ca,marge_realisee\n"
    
    # Trouver toutes les clés de tarifs dynamiques présentes
    tarif_keys = set()
    for row in rows:
        tarif_keys.update(row.get("tarifs", {}).keys())
    tarif_keys = sorted(tarif_keys)

    # En-têtes fixes + dynamiques par tarif
    headers = [
        "cod_pro", "refint", "nom_pro", "qualite", "statut", "prix_achat", "pmp_LM", "stock_LM",
        "ca_LM", "qte_LM", "marge_LM"
    ]
    dynamic_headers = []
    for tk in tarif_keys:
        dynamic_headers.extend([
            f"prix_{tk}", f"marge_{tk}", f"qte_{tk}", f"ca_{tk}", f"marge_realisee_{tk}"
        ])
    header_line = CSV_SEPARATOR.join(headers + dynamic_headers) + "\n"

    lines = [header_line]
    for row in rows:
        fixed_values = [str(row.get(h, "")) for h in headers]
        dynamic_values = []
        for tk in tarif_keys:
            tarif = row.get("tarifs", {}).get(tk, {})
            dynamic_values.extend([
                str(tarif.get("prix", "")),
                str(tarif.get("marge", "")),
                str(tarif.get("qte", "")),
                str(tarif.get("ca", "")),
                str(tarif.get("marge_realisee", "")),
            ])
        lines.append(CSV_SEPARATOR.join(fixed_values + dynamic_values) + "\n")

    return "".join(lines)

# Endpoint POST pour lancer un export CSV asynchrone
@router.post("/compare-tarif")
async def export_compare_tarif(
    payload: ComparatifFilterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if not os.path.exists(EXPORT_DIR):
        raise HTTPException(status_code=500, detail="Dossier export inaccessible")

    try:
        # Forcer récupération de toutes les données pour export complet
        payload.export_all = True
        payload.page = 0
        payload.limit = 999999

        data = await get_comparatif_multi(db, payload)
        csv_content = generate_csv_from_rows(data.get("rows", []))
        filename = f"export_compare_tarif_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        background_tasks.add_task(write_csv_file, filename, csv_content)
        return {"message": "Export lancé", "filename": filename}

    except Exception as exc:
        # Affiche juste le nom/type de l'erreur et son message :
        import traceback
        logger.error(f"[EXPORT ERROR] {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {str(exc)}"
        )


# Fonction pour générer CSV pour alertes (au même niveau que les autres fonctions)
def generate_csv_from_alertes(rows):
    if not rows:
        return "cod_pro,refint,qualite,grouping_crn,no_tarif,nb_alertes,regles,ca_total,date_detection,px_vente,px_achat,marge_relative\n"
    headers = [
        "cod_pro", "refint", "qualite", "grouping_crn", "no_tarif",
        "nb_alertes", "regles", "ca_total", "date_detection",
        "px_vente", "px_achat", "marge_relative"
    ]
    lines = [CSV_SEPARATOR.join(headers) + "\n"]
    for row in rows:
        line = CSV_SEPARATOR.join([
            str(row.get(h, "")) if not isinstance(row.get(h, ""), datetime) else row.get(h).isoformat()
            for h in headers
        ])
        lines.append(line + "\n")
    return "".join(lines)


@router.post("/alertes/export-csv")
async def export_alertes_csv(
    payload: AlertesSummaryRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if not os.path.exists(EXPORT_DIR):
        raise HTTPException(status_code=500, detail="Dossier export inaccessible")

    # Forcer export complet
    payload.export_all = True
    payload.page = 0
    payload.limit = 999999

    data = await get_alertes_summary(payload, db)

    csv_content = generate_csv_from_alertes(data.get("rows", []))
    filename = f"export_alertes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    background_tasks.add_task(write_csv_file, filename, csv_content)

    return {"message": "Export lancé", "filename": filename}





# Endpoint GET pour lister les fichiers CSV exportés
@router.get("/files")
async def list_export_files():
    if not os.path.exists(EXPORT_DIR):
        raise HTTPException(status_code=500, detail="Dossier export inaccessible")
    files = [f for f in os.listdir(EXPORT_DIR) if f.endswith(".csv")]
    return {"files": files}

# Endpoint GET pour télécharger un fichier CSV exporté
@router.get("/download/{filename}")
async def download_export(filename: str):
    full_path = os.path.join(EXPORT_DIR, filename)
    if not os.path.isfile(full_path):
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(full_path, media_type="text/csv", filename=filename)
