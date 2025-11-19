# app/routers/exports/router.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.common.logger import logger
from io import StringIO
import csv

from app.db.dependencies import get_db
from app.schemas.tarifs.comparatif_multi_schema import ComparatifFilterRequest
from app.services.tarifs.comparatif_multi_service import get_comparatif_multi
from app.schemas.alertes.alertes_schema import AlertesSummaryRequest
from app.services.alertes.alertes_service import get_alertes_summary

router = APIRouter(prefix="/export", tags=["Exports"])

CSV_SEPARATOR = ";"

# ========================================
# Helper : Génération CSV pour compare-tarif
# ========================================
def generate_csv_from_rows(rows):
    """Génère un CSV avec colonnes dynamiques pour les tarifs"""
    output = StringIO()

    print('log row generate csv :')

    if not rows:
        output.write("cod_pro;refint;nom_pro;qualite;statut;prix_achat;pmp_LM;stock_LM;ca_LM;qte_LM;marge_LM;ratio_max_min;\n")
        return output.getvalue()

    # Détecte si au moins une ligne contient plus d’un tarif
    multi_tarifs = any(len(r.get("tarifs", {})) > 1 for r in rows)

    # Trouver toutes les clés de tarifs dynamiques
    tarif_keys = set()
    for row in rows:
        tarif_keys.update(row.get("tarifs", {}).keys())
    tarif_keys = sorted(tarif_keys)

    # En-têtes fixes
    headers = [
        "cod_pro", "refint", "nom_pro", "qualite", "statut", "prix_achat",
        "pmp_LM", "stock_LM", "ca_LM", "qte_LM", "marge_LM"
    ]

    # Ajoute ratio_max_min seulement si plusieurs tarifs
    if multi_tarifs:
        headers.append("ratio_max_min")

    # En-têtes dynamiques pour chaque tarif
    for tk in tarif_keys:
        headers.extend([
            f"prix_{tk}", f"marge_{tk}", f"qte_{tk}", f"ca_{tk}", f"marge_realisee_{tk}"
        ])

    writer = csv.DictWriter(output, fieldnames=headers, delimiter=CSV_SEPARATOR, extrasaction='ignore')
    writer.writeheader()

    for row in rows:
        flat_row = {
            "cod_pro": row.get("cod_pro", ""),
            "refint": row.get("refint", ""),
            "nom_pro": row.get("nom_pro", ""),
            "qualite": row.get("qualite", ""),
            "statut": row.get("statut", ""),
            "prix_achat": row.get("prix_achat", ""),
            "pmp_LM": row.get("pmp_LM", ""),
            "stock_LM": row.get("stock_LM", ""),
            "ca_LM": row.get("ca_LM", ""),
            "qte_LM": row.get("qte_LM", ""),
            "marge_LM": row.get("marge_LM", "")
        }

        # ratio uniquement si plusieurs tarifs
        if multi_tarifs:
            flat_row["ratio_max_min"] = row.get("ratio_max_min", "")

        # Ajoute les colonnes dynamiques des tarifs
        for tk in tarif_keys:
            tarif = row.get("tarifs", {}).get(tk, {})
            flat_row[f"prix_{tk}"] = tarif.get("prix", "")
            flat_row[f"marge_{tk}"] = tarif.get("marge", "")
            flat_row[f"qte_{tk}"] = tarif.get("qte", "")
            flat_row[f"ca_{tk}"] = tarif.get("ca", "")
            flat_row[f"marge_realisee_{tk}"] = tarif.get("marge_realisee", "")

        writer.writerow(flat_row)

    return output.getvalue()


# ========================================
# Helper : Génération CSV pour alertes
# ========================================
def generate_csv_from_alertes(rows):
    """Génère un CSV pour les alertes"""
    output = StringIO()
    
    if not rows:
        output.write("cod_pro;refint;qualite;grouping_crn;no_tarif;nb_alertes;regles;ca_total;date_detection;px_vente;px_achat;marge_relative\n")
        return output.getvalue()
    
    headers = [
        "cod_pro", "refint", "qualite", "grouping_crn", "no_tarif",
        "nb_alertes", "regles", "ca_total", "date_detection",
        "px_vente", "px_achat", "marge_relative"
    ]
    
    writer = csv.DictWriter(output, fieldnames=headers, delimiter=CSV_SEPARATOR, extrasaction='ignore')
    writer.writeheader()
    
    for row in rows:
        # Formate les dates ISO
        flat_row = {k: v for k, v in row.items()}
        if isinstance(flat_row.get("date_detection"), datetime):
            flat_row["date_detection"] = flat_row["date_detection"].isoformat()
        
        writer.writerow(flat_row)
    
    return output.getvalue()

# ========================================
# Endpoint : Export compare-tarif (streaming)
# ========================================
@router.post("/compare-tarif")
async def export_compare_tarif(
    payload: ComparatifFilterRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        logger.info(f"Export CSV demandé pour tarifs: {payload.tarifs}, filtres: cod_pro={payload.cod_pro}, refint={payload.refint}")
        
        # Crée une copie du payload avec pagination désactivée
        export_payload = payload.model_copy(update={
            "page": 1,
            "limit": 999999,
            "sort_by": payload.sort_by or "cod_pro",
            "sort_dir": payload.sort_dir or "asc"
        })
        
        # Récupère toutes les données
        data = await get_comparatif_multi(db, export_payload)
        rows = data.get("rows", [])
        
        logger.info(f"Export CSV: {len(rows)} lignes récupérées sur {data.get('total', 0)} total")
        
        if not rows:
            logger.warning("Export CSV: aucune donnée à exporter")
            raise HTTPException(status_code=404, detail="Aucune donnée à exporter avec ces filtres")
        
        # Génère le CSV
        csv_content = generate_csv_from_rows(rows)
        filename = f"export_compare_tarif_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"Export CSV généré: {filename}, taille: {len(csv_content)} bytes")
        
        # Retourne en streaming direct
        return StreamingResponse(
            iter([csv_content.encode('utf-8-sig')]),  # BOM UTF-8 pour Excel
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8"
            }
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[EXPORT ERROR] {type(exc).__name__}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur export: {type(exc).__name__}: {str(exc)}"
        )

# ========================================
# Endpoint : Export alertes (streaming)
# ========================================
@router.post("/alertes/export-csv")
async def export_alertes_csv(
    payload: AlertesSummaryRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        logger.info(f"Export CSV alertes demandé avec filtres: {payload}")
        
        # Force export complet
        export_payload = payload.model_copy(update={
            "export_all": True,
            "page": 0,
            "limit": 999999
        })
        
        data = await get_alertes_summary(export_payload, db)
        rows = data.get("rows", [])
        
        logger.info(f"Export CSV alertes: {len(rows)} lignes récupérées")
        
        if not rows:
            logger.warning("Export CSV alertes: aucune donnée")
            raise HTTPException(status_code=404, detail="Aucune alerte à exporter")
        
        # Génère le CSV
        csv_content = generate_csv_from_alertes(rows)
        filename = f"export_alertes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"Export CSV alertes généré: {filename}")
        
        # Retourne en streaming direct
        return StreamingResponse(
            iter([csv_content.encode('utf-8-sig')]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8"
            }
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[EXPORT ALERTES ERROR] {type(exc).__name__}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur export alertes: {str(exc)}"
        )