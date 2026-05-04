from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, TallyEntry, BankEntry, Reconciliation
from rapidfuzz import fuzz
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

FUZZY_THRESHOLD  = 80
DATE_TOLERANCE   = 3   # days


def dates_close(d1: str, d2: str, tolerance: int = DATE_TOLERANCE) -> bool:
    try:
        dt1 = datetime.strptime(d1, "%Y-%m-%d")
        dt2 = datetime.strptime(d2, "%Y-%m-%d")
        return abs((dt1 - dt2).days) <= tolerance
    except Exception:
        return False


def amounts_match(a1: float, a2: float, tolerance: float = 1.0) -> bool:
    return abs(abs(a1) - abs(a2)) <= tolerance


def party_similarity(p1: str, p2: str) -> int:
    if not p1 or not p2:
        return 0
    return fuzz.token_sort_ratio(p1.upper(), p2.upper())


def detect_flags(t_entry: TallyEntry, b_entry: Optional[BankEntry], match_type: str) -> tuple:
    flag_type = "none"
    flag_desc = ""

    # Cash payment flag — Sec 40A(3)
    if t_entry.payment_mode == "cash" and abs(t_entry.amount) > 10000:
        flag_type = "sec_40a3_risk"
        flag_desc = f"Cash payment ₹{abs(t_entry.amount):,.0f} exceeds ₹10,000 limit — Sec 40A(3) risk"
        return flag_type, flag_desc

    # Party mismatch
    if b_entry and match_type == "fuzzy":
        score = party_similarity(t_entry.party_name, b_entry.description)
        if score < FUZZY_THRESHOLD:
            flag_type = "party_mismatch"
            flag_desc = f"Party mismatch: Tally='{t_entry.party_name}' vs Bank='{b_entry.description}'"
            return flag_type, flag_desc

    # No bank entry for non-cash
    if not b_entry and t_entry.payment_mode != "cash":
        flag_type = "cash_payment"
        flag_desc = "No bank entry found — possible cash payment"

    return flag_type, flag_desc


@router.post("/start/{client_id}")
def start_reconciliation(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")

    tally_entries = db.query(TallyEntry).filter(TallyEntry.client_id == client_id).all()
    bank_entries  = db.query(BankEntry).filter(BankEntry.client_id == client_id).all()

    if not tally_entries:
        raise HTTPException(400, "No Tally entries found. Please sync Tally first.")
    if not bank_entries:
        raise HTTPException(400, "No bank entries found. Please upload bank statement first.")

    # Clear old reconciliations
    db.query(Reconciliation).filter(Reconciliation.client_id == client_id).delete()

    matched_tally = set()
    matched_bank  = set()
    results       = []

    # ── Pass 1: Exact match ──────────────────────────────
    for te in tally_entries:
        for be in bank_entries:
            if be.id in matched_bank:
                continue
            t_amount = abs(te.amount)
            b_amount = be.debit if te.amount < 0 else be.credit
            if (
                amounts_match(t_amount, b_amount) and
                te.voucher_date == be.transaction_date and
                party_similarity(te.party_name, be.description) >= 95
            ):
                flag_t, flag_d = detect_flags(te, be, "exact")
                results.append(Reconciliation(
                    client_id=client_id, tally_entry_id=te.id, bank_entry_id=be.id,
                    match_type="exact", match_score=100,
                    flag_type=flag_t, flag_description=flag_d,
                ))
                matched_tally.add(te.id)
                matched_bank.add(be.id)
                break

    # ── Pass 2: Fuzzy match ──────────────────────────────
    for te in tally_entries:
        if te.id in matched_tally:
            continue
        for be in bank_entries:
            if be.id in matched_bank:
                continue
            t_amount = abs(te.amount)
            b_amount = be.debit if te.amount < 0 else be.credit
            score = party_similarity(te.party_name, be.description)
            if (
                amounts_match(t_amount, b_amount) and
                dates_close(te.voucher_date, be.transaction_date) and
                score >= FUZZY_THRESHOLD
            ):
                flag_t, flag_d = detect_flags(te, be, "fuzzy")
                results.append(Reconciliation(
                    client_id=client_id, tally_entry_id=te.id, bank_entry_id=be.id,
                    match_type="fuzzy", match_score=score,
                    flag_type=flag_t, flag_description=flag_d,
                ))
                matched_tally.add(te.id)
                matched_bank.add(be.id)
                break

    # ── Pass 3: Unmatched Tally entries ──────────────────
    for te in tally_entries:
        if te.id in matched_tally:
            continue
        flag_t, flag_d = detect_flags(te, None, "unmatched_tally")
        results.append(Reconciliation(
            client_id=client_id, tally_entry_id=te.id, bank_entry_id=None,
            match_type="unmatched_tally", match_score=0,
            flag_type=flag_t, flag_description=flag_d,
        ))

    # ── Pass 4: Unmatched Bank entries ───────────────────
    for be in bank_entries:
        if be.id in matched_bank:
            continue
        results.append(Reconciliation(
            client_id=client_id, tally_entry_id=None, bank_entry_id=be.id,
            match_type="unmatched_bank", match_score=0,
            flag_type="none", flag_description="",
        ))

    # Save all
    for r in results:
        db.add(r)

    # Update client progress
    client.audit_status        = "bank_recon"
    client.audit_progress_pct  = 50
    db.commit()

    exact   = sum(1 for r in results if r.match_type == "exact")
    fuzzy   = sum(1 for r in results if r.match_type == "fuzzy")
    unmatched = sum(1 for r in results if "unmatched" in r.match_type)
    flagged = sum(1 for r in results if r.flag_type != "none")

    return {
        "success":        True,
        "total":          len(results),
        "exact_matched":  exact,
        "fuzzy_matched":  fuzzy,
        "unmatched":      unmatched,
        "flagged":        flagged,
        "message":        f"Reconciliation complete — {exact} exact, {fuzzy} fuzzy, {unmatched} unmatched",
    }


@router.get("/results/{client_id}")
def get_results(
    client_id:   int,
    match_type:  Optional[str] = None,
    flag_only:   bool = False,
    db: Session = Depends(get_db)
):
    q = db.query(Reconciliation).filter(Reconciliation.client_id == client_id)
    if match_type:
        q = q.filter(Reconciliation.match_type == match_type)
    if flag_only:
        q = q.filter(Reconciliation.flag_type != "none")

    recons = q.all()
    data   = []
    for r in recons:
        te = db.query(TallyEntry).filter(TallyEntry.id == r.tally_entry_id).first() if r.tally_entry_id else None
        be = db.query(BankEntry).filter(BankEntry.id == r.bank_entry_id).first()   if r.bank_entry_id  else None
        data.append({
            "id":                r.id,
            "match_type":        r.match_type,
            "match_score":       r.match_score,
            "flag_type":         r.flag_type,
            "flag_description":  r.flag_description,
            "ca_review_status":  r.ca_review_status,
            "tally": {
                "date":          te.voucher_date   if te else None,
                "party":         te.party_name     if te else None,
                "amount":        te.amount         if te else None,
                "voucher_type":  te.voucher_type   if te else None,
                "narration":     te.narration      if te else None,
            } if te else None,
            "bank": {
                "date":          be.transaction_date if be else None,
                "description":   be.description      if be else None,
                "debit":         be.debit             if be else None,
                "credit":        be.credit            if be else None,
                "balance":       be.balance           if be else None,
            } if be else None,
        })
    return {"data": data, "total": len(data)}


@router.get("/summary/{client_id}")
def get_summary(client_id: int, db: Session = Depends(get_db)):
    recons = db.query(Reconciliation).filter(Reconciliation.client_id == client_id).all()
    return {
        "total":             len(recons),
        "exact_matched":     sum(1 for r in recons if r.match_type == "exact"),
        "fuzzy_matched":     sum(1 for r in recons if r.match_type == "fuzzy"),
        "unmatched_tally":   sum(1 for r in recons if r.match_type == "unmatched_tally"),
        "unmatched_bank":    sum(1 for r in recons if r.match_type == "unmatched_bank"),
        "flagged":           sum(1 for r in recons if r.flag_type != "none"),
        "sec_40a3_risk":     sum(1 for r in recons if r.flag_type == "sec_40a3_risk"),
        "pending_review":    sum(1 for r in recons if r.ca_review_status == "pending"),
    }


class ReviewInput(BaseModel):
    ca_review_status: str
    ca_notes: Optional[str] = None
    reviewed_by: Optional[str] = None

@router.put("/review/{recon_id}")
def review_entry(recon_id: int, body: ReviewInput, db: Session = Depends(get_db)):
    r = db.query(Reconciliation).filter(Reconciliation.id == recon_id).first()
    if not r:
        raise HTTPException(404, "Reconciliation entry not found")
    r.ca_review_status = body.ca_review_status
    r.ca_notes         = body.ca_notes
    r.reviewed_by      = body.reviewed_by
    r.reviewed_at      = datetime.utcnow()
    db.commit()
    return {"success": True, "recon_id": recon_id, "status": body.ca_review_status}