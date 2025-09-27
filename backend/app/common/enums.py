from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"

class Criticite(str, Enum):
    FAIBLE = "faible"
    MOYENNE = "moyenne"
    FORTE = "forte"
