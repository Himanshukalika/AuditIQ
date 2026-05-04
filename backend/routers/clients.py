from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, Client, TallyEntry, BankEntry, Reconciliation

router = APIRouter()


class ClientCreate(BaseModel):
    client_name:     str
    pan:             str
    gstin:           Optional[str] = None
    business_type:   Optional[str] = "Pvt Ltd"
    financial_year:  str = "2024-25"
    turnover_approx: Optional[float] = None
    city:            Optional[str] = None
    state:           Optional[str] = None

class ClientUpdate(ClientCreate):
    pass


def client_to_dict(c: Client):
    return {
        "id":                 c.id,
        "firm_id":            c.firm_id,
        "client_name":        c.client_name,
        "pan":                c.pan,
        "gstin":              c.gstin,
        "business_type":      c.business_type,
        "financial_year":     c.financial_year,
        "turnover_approx":    c.turnover_approx,
        "city":               c.city,
        "state":              c.state,
        "audit_status":       c.audit_status,
        "audit_progress_pct": c.audit_progress_pct,
        "notes":              c.notes,
        "created_at":         str(c.created_at),
    }


@router.get("/")
def list_clients(
    firm_id: int,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Client).filter(Client.firm_id == firm_id)
    if search:
        q = q.filter(
            Client.client_name.ilike(f"%{search}%") |
            Client.pan.ilike(f"%{search}%")
        )
    clients = q.order_by(Client.created_at.desc()).all()
    return {"data": [client_to_dict(c) for c in clients], "total": len(clients)}


@router.post("/")
def create_client(body: ClientCreate, firm_id: int, db: Session = Depends(get_db)):
    if len(body.pan) != 10:
        raise HTTPException(400, "Invalid PAN — must be 10 characters")
    client = Client(firm_id=firm_id, **body.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client_to_dict(client)


@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")
    return client_to_dict(c)


@router.put("/{client_id}")
def update_client(client_id: int, body: ClientUpdate, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")
    for k, v in body.dict().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return client_to_dict(c)


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    # Client exists check
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")

    try:
        # Pehle related data delete karo — order important hai
        # 1. Reconciliations (references tally + bank entries)
        db.query(Reconciliation).filter(
            Reconciliation.client_id == client_id
        ).delete(synchronize_session=False)

        # 2. Tally entries
        db.query(TallyEntry).filter(
            TallyEntry.client_id == client_id
        ).delete(synchronize_session=False)

        # 3. Bank entries
        db.query(BankEntry).filter(
            BankEntry.client_id == client_id
        ).delete(synchronize_session=False)

        # 4. Finally client delete karo
        db.delete(c)
        db.commit()

        return {
            "success": True,
            "message": f"Client '{c.client_name}' deleted successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Delete failed: {str(e)}")


@router.get("/{client_id}/audit-status")
def audit_status(client_id: int, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")

    tally_count = db.query(TallyEntry).filter(
        TallyEntry.client_id == client_id
    ).count()
    bank_count = db.query(BankEntry).filter(
        BankEntry.client_id == client_id
    ).count()
    recon_count = db.query(Reconciliation).filter(
        Reconciliation.client_id == client_id
    ).count()

    return {
        "client_id":           c.id,
        "client_name":         c.client_name,
        "audit_status":        c.audit_status,
        "audit_progress_pct":  c.audit_progress_pct,
        "tally_entries_count": tally_count,
        "bank_entries_count":  bank_count,
        "recon_count":         recon_count,
    }