#backend/app/schemas/auth/user_schema.py

from pydantic import BaseModel, EmailStr
from typing import Optional

class UserInDB(BaseModel):
    email: str
    hashed_password: Optional[str]
    nom: Optional[str]
    role: str
    is_active: bool

