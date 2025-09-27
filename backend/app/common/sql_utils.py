# 📄 backend/app/common/sql_utils.py

def build_placeholders(name: str, count: int) -> str:
    return ", ".join(f":{name}{i}" for i in range(count))

def build_params(name: str, values: list) -> dict:
    return {f"{name}{i}": v for i, v in enumerate(values)}

def sanitize_sort_column(column: str | None, valid_columns: set[str] | list[str], default: str = "id", strict: bool = False) -> str:
    safe_columns = set(valid_columns)
    if column in safe_columns:
        return column
    if strict:
        raise ValueError(f"Colonne de tri interdite : {column}")
    return default

def sanitize_sort_direction(direction: str | None) -> str:
    """
    Valide la direction de tri (asc/desc). Par défaut : 'asc'.
    """
    return direction.lower() if direction and direction.lower() in {"asc", "desc"} else "asc"
