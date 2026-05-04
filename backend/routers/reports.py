from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client

router = APIRouter()

@router.post("/generate/{client_id}")
def generate_report(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")
    # Phase 2 mein ReportLab se PDF generate hoga
    return {
        "success":   True,
        "message":   "Report generation coming in Phase 2",
        "client_id": client_id,
    }