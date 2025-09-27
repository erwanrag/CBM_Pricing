import pytest
from backend.app.services.produits.product_service import (
    get_tarif_filter_options,
    get_filtered_codpro_list,
    get_refcrn_by_codpro
)
from app.schemas.product_filter_schema import ProductFilterRequest

# === Test basique de récupération des options de tarifs ===
@pytest.mark.asyncio
async def test_get_tarif_filter_options(db_session):
    result = await get_tarif_filter_options(db_session)
    assert isinstance(result, list)
    if result:
        assert "no_tarif" in result[0]
        assert "lib_tarif" in result[0]

# === Test avec ref_crn seul ===
@pytest.mark.asyncio
async def test_filtered_codpro_ref_crn_only(db_session):
    payload = ProductFilterRequest(ref_crn="CRNTEST", grouping_crn=0)
    result = await get_filtered_codpro_list(payload, db_session)
    assert isinstance(result, list)

# === Test avec cod_pro + grouping_crn ===
@pytest.mark.asyncio
async def test_filtered_codpro_with_grouping_crn(db_session):
    payload = ProductFilterRequest(cod_pro=123456, grouping_crn=1)
    result = await get_filtered_codpro_list(payload, db_session)
    assert isinstance(result, list)

# === Test avec cod_pro et ref_crn ===
@pytest.mark.asyncio
async def test_filtered_codpro_cod_pro_and_ref_crn(db_session):
    payload = ProductFilterRequest(cod_pro=123456, ref_crn="CRNTEST", grouping_crn=0)
    result = await get_filtered_codpro_list(payload, db_session)
    assert isinstance(result, list)

# === Test récupération ref_crn par cod_pro ===
@pytest.mark.asyncio
async def test_get_refcrn_by_codpro(db_session):
    cod_pro = 123456
    result = await get_refcrn_by_codpro(cod_pro, db_session)
    assert isinstance(result, list)
