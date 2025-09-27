# 📋 CBM Pricing - Document DataMart + Règles d’Alertes

## 🏛️ Schéma DataMart CBM\_DATA (SQL Server)

```plaintext
CBM_DATA
├── pricing.
│   ├── Dimensions_Produit
│   ├── Ventes
│   ├── Prix_Achat
│   ├── Prix_Vente
│   ├── Stocks
│   ├── Alertes_Tarif
│   ├── Alertes_Qualite
│   ├── Condition_Client
│   ├── Condition_Fournisseur
│   └── Tarifs
└── produit.
    ├── Bridge_cod_pro_ref_pc
    ├── Grouping_crn
    └── Dimensions supplémentaires (famille, s_famille...)
```

---

## 🎯 Détail des principales tables (exemple)

### 📄 pricing.Dimensions\_Produit

* cod\_pro
* refint
* qualite (OE, OEM, PMQ, PMV)
* famille, s\_famille
* grouping\_crn, ref\_crn
* no\_tarif, statut

### 📄 produit.Bridge\_cod\_pro\_ref\_pc

* cod\_pro
* ref\_pc (références concurrentes)

### 📄 pricing.Ventes

* cod\_pro
* depot
* mois, année
* quantités, chiffre\_affaires

### 📄 pricing.Prix\_Achat / Prix\_Vente

* cod\_pro
* no\_tarif
* prix actuel / historique
* date début / date fin

### 📄 pricing.Stocks

* cod\_pro
* depot
* stock actuel

---

## 🚦 Règles d’Alertes CBM Pricing

### ✅ Règles Tarifaires

* R03 : PMQ < 75% de OEM
* R04 : OEM < 75% de OE
* R06 : PMQ > OEM (écart > 1-2x)
* R07 : OE ≥ OEM ≥ PMQ (cohérence qualité)
* Alerte si un produit PMQ n’a pas de ventes (dormant)

### ✅ Règles Regroupement

* Anomalies sur grouping\_crn : incohérence famille, s\_famille, nom\_pro
* Groupes hétérogènes trop larges (trop de cod\_pro sur un ref\_pc)

### ✅ Règles Qualité

* QLT\_01 → QLT\_09 : détection cohérence qualité / gamme / prix

---

## 📝 Remarques internes

➡️ Ce document doit être mis à jour à chaque modification majeure de structure ou de logique métier.
➡️ Ne pas inclure d’informations confidentielles dans la version publique.

---

## 🛠️ Zone libre - Personnalisation CBM

* Ajouter ici les extensions spécifiques à CBM : nouvelles dimensions, nouvelles règles, nouveaux calculs IA.

Exemple :

```plaintext
Ajout 2025 : Table pricing.Recommandations_IA
Ajout 2025 : R10 = Si produit > 12 mois sans ventes + stock > 100 pcs → recommandation = A_SUPPRIMER
```

---

CBM Pricing - Document DataMart + Règles | Version initiale : mai 2025
