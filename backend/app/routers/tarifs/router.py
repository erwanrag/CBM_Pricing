from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.dependencies import get_db
from app.services.tarifs.comparatif_multi_service import get_comparatif_multi
from app.services.tarifs.tarif_service import get_tarif_filter_options
from app.schemas.tarifs.tarif_schema import TarifFilterOption
from app.schemas.tarifs.comparatif_multi_schema import ComparatifFilterRequest, ComparatifMultiResponseList
from app.common.logger import logger

router = APIRouter(prefix="/tarifs", tags=["Tarifs"])

@router.get("/options", response_model=list[TarifFilterOption])
async def get_tarif_options(db: AsyncSession = Depends(get_db)):
    """Récupère la liste des tarifs disponibles pour les sélecteurs"""
    return await get_tarif_filter_options(db)

@router.post("/comparatif-multi", response_model=ComparatifMultiResponseList)
async def fetch_tarif_comparatif_multi(
    payload: ComparatifFilterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Comparaison tarifaire multi avec optimisations performance:
    - Préchargement intelligent des 500 premiers résultats
    - Cache adaptatif selon les filtres
    - Limitation automatique pour tables sans index
    - Métadonnées de performance pour le frontend
    """
    try:
        # Log pour monitoring des performances
        filter_summary = {
            "tarifs": payload.tarifs,
            "has_filters": any([payload.cod_pro, payload.refint, payload.qualite]),
            "is_export": payload.export_all,
            "page": payload.page
        }
        logger.info(f"Comparatif multi demandé: {filter_summary}")
        
        result = await get_comparatif_multi(db=db, payload=payload)
        
        # Log des résultats pour monitoring
        logger.info(f"Comparatif réponse: {len(result.get('rows', []))} lignes, "
                   f"total: {result.get('total', 0)}, "
                   f"performance_mode: {result.get('meta', {}).get('performance_mode', False)}")
        
        return result
        
    except ValueError as e:
        # Erreurs de validation
        logger.warning(f"Erreur validation comparatif: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Erreurs système
        logger.error(f"Erreur système comparatif: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Erreur lors de la comparaison tarifaire. Veuillez réessayer."
        )