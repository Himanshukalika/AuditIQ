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


@router.get("/dashboard")
def dashboard_summary(firm_id: int, db: Session = Depends(get_db)):
    """Single endpoint for the dashboard — stats + client list + active client progress."""
    clients = db.query(Client).filter(Client.firm_id == firm_id).order_by(Client.created_at.desc()).all()

    total      = len(clients)
    completed  = sum(1 for c in clients if c.audit_status == "completed")
    in_progress = sum(1 for c in clients if c.audit_status not in ("completed", "pending", "error"))
    pending    = sum(1 for c in clients if c.audit_status == "pending")

    # Total flagged entries across all clients
    total_flagged = 0
    total_flag_amount = 0.0
    for c in clients:
        recons = db.query(Reconciliation).filter(
            Reconciliation.client_id == c.id,
            Reconciliation.flag_type != "none"
        ).all()
        total_flagged += len(recons)
        for r in recons:
            if r.tally_entry_id:
                te = db.query(TallyEntry).filter(TallyEntry.id == r.tally_entry_id).first()
                if te:
                    total_flag_amount += abs(te.amount or 0)

    # Client rows with counts
    client_rows = []
    for c in clients:
        tally_count = db.query(TallyEntry).filter(TallyEntry.client_id == c.id).count()
        bank_count  = db.query(BankEntry).filter(BankEntry.client_id == c.id).count()
        flagged     = db.query(Reconciliation).filter(
            Reconciliation.client_id == c.id,
            Reconciliation.flag_type != "none"
        ).count()
        client_rows.append({
            **client_to_dict(c),
            "tally_count":   tally_count,
            "bank_count":    bank_count,
            "flagged_count": flagged,
        })

    # Active client — highest progress, not completed
    active = next(
        (c for c in sorted(clients, key=lambda x: -(x.audit_progress_pct or 0))
         if c.audit_status not in ("completed", "pending")),
        clients[0] if clients else None
    )
    active_detail = None
    if active:
        recon = db.query(Reconciliation).filter(Reconciliation.client_id == active.id).all()
        active_detail = {
            "id":           active.id,
            "name":         active.client_name,
            "status":       active.audit_status,
            "progress":     active.audit_progress_pct or 0,
            "tally_count":  db.query(TallyEntry).filter(TallyEntry.client_id == active.id).count(),
            "bank_count":   db.query(BankEntry).filter(BankEntry.client_id == active.id).count(),
            "recon_total":  len(recon),
            "recon_exact":  sum(1 for r in recon if r.match_type == "exact"),
            "recon_fuzzy":  sum(1 for r in recon if r.match_type == "fuzzy"),
            "recon_flagged": sum(1 for r in recon if r.flag_type != "none"),
        }

    return {
        "stats": {
            "total_clients":    total,
            "completed":        completed,
            "in_progress":      in_progress,
            "pending":          pending,
            "total_flagged":    total_flagged,
            "total_flag_amount": total_flag_amount,
        },
        "clients":       client_rows,
        "active_client": active_detail,
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