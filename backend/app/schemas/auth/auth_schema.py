#backend/app/schemas/auth/auth_schema.py

from pydantic import BaseModel, EmailStr
from typing import Optional

class ResetRequest(BaseModel):
    email: EmailStr

class CodeVerification(BaseModel):
    email: EmailStr
    code: str

class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    new_password: str
