def normalize_str(value: str) -> str:
    return value.strip().lower()

def truncate(value: str, max_len: int) -> str:
    return value[:max_len] + "..." if len(value) > max_len else value
