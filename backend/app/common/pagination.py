def calculate_offset(page: int, limit: int) -> int:
    return max((page - 1), 0) * limit
