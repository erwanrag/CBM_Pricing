import asyncio
import time
from sqlalchemy import text
from app.db.session import get_session

async def test_comparatif_performance():
    """Test performance avec les nouveaux index"""
    
    async with get_session() as db:
        
        # Test 1: Requête simple
        print("🧪 Test 1: 1000 produits sans filtre")
        start = time.time()
        
        query = """
        SELECT TOP 1000 cod_pro, refint, nom_pro, qualite, prix_7, prix_13
        FROM [Pricing].[Comparatif_Tarif_Pivot] WITH (INDEX(CX_Comparatif_Tarif_Pivot))
        ORDER BY cod_pro
        """
        
        result = await db.execute(text(query))
        rows = result.fetchall()
        elapsed = time.time() - start
        
        print(f"✅ {len(rows)} produits en {elapsed:.3f}s")
        assert elapsed < 1.0, f"Trop lent: {elapsed:.3f}s"
        
        # Test 2: Avec ratio
        print("\n🧪 Test 2: Calcul ratio min/max")
        start = time.time()
        
        query = """
        SELECT TOP 100 
            cod_pro,
            prix_7, prix_13, prix_26,
            CAST(
                GREATEST(prix_7, prix_13, prix_26) / 
                NULLIF(LEAST(prix_7, prix_13, prix_26), 0)
            AS DECIMAL(10,2)) AS ratio
        FROM [Pricing].[Comparatif_Tarif_Pivot]
        WHERE prix_7 > 0 AND prix_13 > 0
        ORDER BY ratio DESC
        """
        
        result = await db.execute(text(query))
        rows = result.fetchall()
        elapsed = time.time() - start
        
        print(f"✅ Top 100 ratios en {elapsed:.3f}s")
        
        # Test 3: Filtre refint
        print("\n🧪 Test 3: Recherche par refint")
        start = time.time()
        
        query = """
        SELECT cod_pro, refint, nom_pro
        FROM [Pricing].[Comparatif_Tarif_Pivot] 
        WHERE refint LIKE '%123%'
        """
        
        result = await db.execute(text(query))
        rows = result.fetchall()
        elapsed = time.time() - start
        
        print(f"✅ {len(rows)} résultats en {elapsed:.3f}s")

if __name__ == "__main__":
    print("🚀 Tests de performance CBM Pricing\n")
    asyncio.run(test_comparatif_performance())
    print("\n✨ Tous les tests passés!")