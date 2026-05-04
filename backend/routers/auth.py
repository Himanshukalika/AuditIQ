from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Firm
from datetime import datetime

router = APIRouter()

class RegisterInput(BaseModel):
    firm_name: str
    ca_name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(body: RegisterInput, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(Firm).filter(Firm.email == body.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    
    firm = Firm(
        firm_name=body.firm_name,
        ca_name=body.ca_name,
        email=body.email,
        password_hash=body.password, # In production use hashing like passlib
        created_at=datetime.utcnow()
    )
    db.add(firm)
    db.commit()
    db.refresh(firm)
    return {"message": "Firm registered successfully", "firm_id": firm.id}

@router.post("/login")
def login(body: LoginInput, db: Session = Depends(get_db)):
    firm = db.query(Firm).filter(Firm.email == body.email).first()
    if not firm or firm.password_hash != body.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "message": "Login successful",
        "firm_id": firm.id,
        "ca_name": firm.ca_name,
        "token": "mock-token-12345" # In production use JWT
    }

@router.get("/me")
def get_me(firm_id: int, db: Session = Depends(get_db)):
    firm = db.query(Firm).filter(Firm.id == firm_id).first()
    if not firm:
        raise HTTPException(404, "Firm not found")
    return {
        "id": firm.id,
        "firm_name": firm.firm_name,
        "ca_name": firm.ca_name,
        "email": firm.email,
        "plan": firm.plan
    }