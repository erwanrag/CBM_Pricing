#backend/app/models/comparatif_tarif.py
from sqlalchemy import Column, Integer, String, Float
from app.db.base_class import Base

class ComparatifTarif(Base):
    __tablename__ = "Comparatif_Tarif"
    __table_args__ = {"schema": "Pricing"}

    cod_pro = Column(Integer, primary_key=True)
    no_tarif = Column(Integer, primary_key=True)
    refint = Column(String)
    nom_pro = Column(String)
    qualite = Column(String)
    statut = Column(Integer)

    prix_vente = Column(Float)
    prix_achat = Column(Float)
    marge = Column(Float)
    qte = Column(Integer)
    marge_realisee = Column(Float)
    ca_total = Column(Float)

    stock_LM = Column(Integer)
    pmp_LM = Column(Float)
    qte_LM = Column(Integer)
    ca_LM = Column(Float)
    marge_LM = Column(Float)

class ComparatifTarifPivot(Base):
    __tablename__ = "Comparatif_Tarif_Pivot"
    __table_args__ = {"schema": "Pricing"}

    cod_pro = Column(Integer, primary_key=True, index=True)
    refint = Column(String(100))
    nom_pro = Column(String(100))
    qualite = Column(String(10))
    statut = Column(Integer)

    # prix achat unique par produit
    prix_achat = Column(Float)

    # colonnes fixes LM
    stock_LM = Column(Float)
    pmp_LM = Column(Float)
    qte_LM = Column(Integer)
    ca_LM = Column(Float)
    marge_LM = Column(Float)

    # ⚡ colonnes dynamiques prix_X, qte_X, ca_X, marge_X, marge_realisee_X
    # accessibles via getattr(row, "prix_7"), etc.