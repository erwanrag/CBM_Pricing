# 📄 backend/app/cache/cache_keys.py
import hashlib
import json

def _hash_if_needed(obj: dict, prefix: str, max_length: int = 150) -> str:
    json_str = json.dumps(obj, sort_keys=True, default=str)
    if len(json_str) > max_length:
        digest = hashlib.md5(json_str.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"
    return f"{prefix}:{json_str}"

def generic_cache_key(prefix: str, **params) -> str:
    """
    Génère une clé Redis générique basée sur un préfixe et des paramètres.
    """
    json_str = json.dumps(params, sort_keys=True, default=str)
    if len(json_str) > 150:
        import hashlib
        digest = hashlib.md5(json_str.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"
    return f"{prefix}:{json_str}"

# 🔔 Alertes
def alertes_summary_key(**kwargs) -> str:
    return _hash_if_needed(kwargs, "alertes_summary")

def alertes_details_key(cod_pro: int, no_tarif: int) -> str:
    return f"alertes:details:{cod_pro}:{no_tarif}"

def alertes_map_key(no_tarif: int, cod_pro_list: list[int]) -> str:
    key = ",".join(map(str, cod_pro_list))
    return f"alertes:map:{no_tarif}:{key}"

def alertes_parametrage_key() -> str:
    return "parametrage:alertes"

# 📊 Dashboard
def dashboard_kpi_key(no_tarif: int, cod_pro_list: list[int]) -> str:
    key = ",".join(map(str, sorted(cod_pro_list)))
    return f"dashboard:kpi:{no_tarif}:{key}"

def dashboard_histo_key(**kwargs) -> str:
    return _hash_if_needed(kwargs, "dashboard:histoprix")

def dashboard_products_key(payload: dict, page: int, limit: int) -> str:
    base = payload.copy()
    base["page"] = page
    base["limit"] = limit
    return _hash_if_needed(base, "dashboard:products")

# 📈 Comparatif Tarifaire
def comparatif_multi_key(**kwargs) -> str:
    return _hash_if_needed(kwargs, "comparatif_multi")

# 📦 Produit
def produit_key(cod_pro: int) -> str:
    return f"produit:{cod_pro}"

# 🧠 Résolution produits
def resolve_codpro_key(**kwargs) -> str:
    return _hash_if_needed(kwargs, "resolve_codpro")

def fiche_key(no_tarif: int, cod_pro: int) -> str:
    return f"fiche:{no_tarif}:{cod_pro}"
# ⚙️ Paramètres
def parametres_tarifs_key() -> str:
    return "parametres:tarifs"
# Tarifs
def tarif_filter_options_key() -> str:
    return "filter:tarif_options"
