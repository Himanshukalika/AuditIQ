from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, TallyEntry, BankEntry, Reconciliation
from rapidfuzz import fuzz
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import re
from audit_rules import apply_rules, get_rules, update_rule, reset_rule

router = APIRouter()

FUZZY_THRESHOLD      = 75   # real-world name variations
DATE_TOLERANCE       = 3    # days for fuzzy pass
DATE_TOLERANCE_LOOSE = 7    # days for amount+date fallback pass

# Generic Tally ledger names that indicate cash/non-bank transactions
_GENERIC_CASH_LEDGERS = {
    "debtor", "debtors", "creditor", "creditors",
    "sundry debtors", "sundry creditors",
    "cash", "cash in hand", "petty cash",
    "customer", "supplier", "party",
}

# Tally ledger suffixes absent from bank descriptions
_TALLY_NOISE = re.compile(
    r'\b(DR|CR|A/C|AC|ACCOUNT|LTD|PVT|PRIVATE|LIMITED|ENTERPRISES?|TRADING|INDUSTRIES|DEBTORS?|CREDITORS?)\b',
    re.IGNORECASE,
)
_BANK_PREFIX  = re.compile(
    r'^(UPI|NEFT|RTGS|IMPS|CHQ|CMS|ACH|ECS|FT|MMT|TRANSFER)[/\-\s]*(CR|DR|REF|[0-9]+)?[/\-\s]*',
    re.IGNORECASE,
)
_REF_NUMBERS  = re.compile(r'\b[0-9]{6,}\b')


def _normalize_party(name: str) -> str:
    if not name:
        return ""
    name = _TALLY_NOISE.sub(' ', name)
    name = re.sub(r'[^\w\s]', ' ', name)
    return re.sub(r'\s+', ' ', name).strip().upper()


def _normalize_bank(desc: str) -> str:
    if not desc:
        return ""
    desc = _BANK_PREFIX.sub(' ', desc)
    desc = _REF_NUMBERS.sub(' ', desc)
    desc = re.sub(r'[^\w\s]', ' ', desc)
    return re.sub(r'\s+', ' ', desc).strip().upper()


def dates_close(d1: str, d2: str, tolerance: int = DATE_TOLERANCE) -> bool:
    try:
        dt1 = datetime.strptime(d1, "%Y-%m-%d")
        dt2 = datetime.strptime(d2, "%Y-%m-%d")
        return abs((dt1 - dt2).days) <= tolerance
    except Exception:
        return False


def amounts_match(a1, a2, tolerance: float = 1.0) -> bool:
    """Safe amount comparison — handles None / NaN gracefully."""
    try:
        v1 = abs(float(a1 or 0))
        v2 = abs(float(a2 or 0))
        import math
        if math.isnan(v1) or math.isnan(v2):
            return False
        return abs(v1 - v2) <= tolerance
    except (TypeError, ValueError):
        return False


def party_similarity(p1: str, p2: str) -> int:
    if not p1 or not p2:
        return 0
    p1u = p1.upper()
    p2u = p2.upper()
    p1n = _normalize_party(p1)
    p2n = _normalize_bank(p2)
    scores = [
        fuzz.token_sort_ratio(p1u, p2u),
        fuzz.token_sort_ratio(p1n, p2n),
        fuzz.token_set_ratio(p1n, p2n),
        fuzz.partial_ratio(p1n, p2n),
    ]
    if p1n and p2n and p1n in p2n:
        scores.append(95)
    return max(scores)


def _is_generic_ledger(name: str) -> bool:
    """Returns True if the Tally party name is a generic ledger (Debtor, Cash, etc.)"""
    return (name or "").strip().lower() in _GENERIC_CASH_LEDGERS


def detect_flags(t_entry: TallyEntry, b_entry: Optional[BankEntry], match_type: str) -> tuple:
    """
    Priority:
    1. Rule engine  (Sec 40A(3), TDS 194C/J/A/H/I, large cash, etc.)
    2. Generic ledger  (Debtor / Cash / Creditor)
    3. Party mismatch  (fuzzy match but names too different)
    4. No bank entry found
    """
    # ── 1. Rule engine ────────────────────────────────────────
    flag_type, flag_desc = apply_rules(
        party_name   = t_entry.party_name   or "",
        narration    = t_entry.narration    or "",
        amount       = t_entry.amount       or 0,
        voucher_type = t_entry.voucher_type or "",
        payment_mode = t_entry.payment_mode or "",
    )
    if flag_type != "none":
        return flag_type, flag_desc

    # ── 2. Generic ledger ─────────────────────────────────────
    if _is_generic_ledger(t_entry.party_name):
        return "cash_payment", f"Generic ledger '{t_entry.party_name}' — likely cash transaction, no bank entry expected"

    # ── 3. Party mismatch ─────────────────────────────────────
    if b_entry and match_type == "fuzzy":
        score = party_similarity(t_entry.party_name, b_entry.description)
        if score < FUZZY_THRESHOLD:
            return "party_mismatch", f"Party mismatch: Tally='{t_entry.party_name}' vs Bank='{b_entry.description}'"

    # ── 4. No bank entry ──────────────────────────────────────
    if not b_entry and t_entry.payment_mode != "cash":
        return "cash_payment", "No bank entry found — possible cash payment"

    return "none", ""


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

    # Voucher types that represent money going OUT (bank debit)
    DEBIT_TYPES = {"payment", "purchase", "contra", "debit note", "journal"}

    def bank_amount(te: TallyEntry, be: BankEntry) -> float:
        """
        Pick the right bank column based on voucher type.
        ALL Tally amounts are stored as positive — use voucher_type for direction.
        Falls back to whichever column (debit/credit) has a non-zero value.
        """
        vtype = (te.voucher_type or "").lower()
        is_outflow = any(t in vtype for t in DEBIT_TYPES)
        b_debit    = float(be.debit  or 0)
        b_credit   = float(be.credit or 0)
        if is_outflow:
            return b_debit if b_debit > 0 else b_credit
        else:
            return b_credit if b_credit > 0 else b_debit

    # ── Pass 1: Exact match ──────────────────────────────────
    for te in tally_entries:
        if _is_generic_ledger(te.party_name):
            continue  # Cash/Debtor/Creditor — no bank entry expected, skip matching
        for be in bank_entries:
            if be.id in matched_bank:
                continue
            t_amount = abs(te.amount)
            b_amount = bank_amount(te, be)
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

    # ── Pass 2: Fuzzy match (amount + date ±3d + party ≥75) ─
    for te in tally_entries:
        if te.id in matched_tally:
            continue
        if _is_generic_ledger(te.party_name):
            continue  # Skip generic ledgers — will be caught in Pass 4 as unmatched
        for be in bank_entries:
            if be.id in matched_bank:
                continue
            t_amount = abs(te.amount)
            b_amount = bank_amount(te, be)
            score    = party_similarity(te.party_name, be.description)
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

    # ── Pass 3: Amount + Date only (party names too different) ─
    # Handles UPI-phone-only narrations like "UPI-9772336247@YBL"
    for te in tally_entries:
        if te.id in matched_tally:
            continue
        if _is_generic_ledger(te.party_name):
            continue  # Skip generic ledgers
        best_be    = None
        best_diff  = 999
        for be in bank_entries:
            if be.id in matched_bank:
                continue
            t_amount = abs(te.amount)
            b_amount = bank_amount(te, be)
            if amounts_match(t_amount, b_amount) and \
               dates_close(te.voucher_date, be.transaction_date, DATE_TOLERANCE_LOOSE):
                try:
                    diff = abs((
                        datetime.strptime(te.voucher_date, "%Y-%m-%d") -
                        datetime.strptime(be.transaction_date, "%Y-%m-%d")
                    ).days)
                except Exception:
                    diff = 99
                if diff < best_diff:
                    best_be   = be
                    best_diff = diff
        if best_be:
            score = party_similarity(te.party_name, best_be.description)
            results.append(Reconciliation(
                client_id=client_id, tally_entry_id=te.id, bank_entry_id=best_be.id,
                match_type="fuzzy", match_score=max(score, 40),
                flag_type="party_mismatch",
                flag_description=(
                    f"Amount+date matched — verify party: "
                    f"Tally='{te.party_name}' vs Bank='{best_be.description[:60]}'"
                ),
            ))
            matched_tally.add(te.id)
            matched_bank.add(best_be.id)

    # ── Pass 4: Unmatched Tally entries ──────────────────────
    for te in tally_entries:
        if te.id in matched_tally:
            continue
        flag_t, flag_d = detect_flags(te, None, "unmatched_tally")
        results.append(Reconciliation(
            client_id=client_id, tally_entry_id=te.id, bank_entry_id=None,
            match_type="unmatched_tally", match_score=0,
            flag_type=flag_t, flag_description=flag_d,
        ))

    # ── Pass 5: Unmatched Bank entries ───────────────────────
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
        "tds_applicable":    sum(1 for r in recons if r.flag_type == "tds_applicable"),
        "pending_review":    sum(1 for r in recons if r.ca_review_status == "pending"),
    }


@router.get("/rules")
def list_audit_rules():
    """List all audit rules with current override state."""
    return {"rules": get_rules()}


class RuleUpdateInput(BaseModel):
    enabled:   Optional[bool]  = None
    amount_gt: Optional[float] = None

@router.put("/rules/{rule_id}")
def update_audit_rule(rule_id: str, body: RuleUpdateInput):
    """Update a rule's threshold or enabled state."""
    ok = update_rule(rule_id, enabled=body.enabled, amount_gt=body.amount_gt)
    if not ok:
        raise HTTPException(404, f"Rule '{rule_id}' not found")
    return {"success": True, "rule_id": rule_id}

@router.post("/rules/{rule_id}/reset")
def reset_audit_rule(rule_id: str):
    """Reset a rule to its default values."""
    reset_rule(rule_id)
    return {"success": True, "rule_id": rule_id}


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