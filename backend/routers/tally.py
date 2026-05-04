from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, TallyEntry
from datetime import datetime
import requests
import xml.etree.ElementTree as ET

router = APIRouter()

TALLY_URL  = "http://localhost:9000"
TALLY_TIMEOUT = 30


def test_tally() -> bool:
    try:
        r = requests.get(TALLY_URL, timeout=5)
        return True
    except Exception:
        return False


def fetch_vouchers_xml(from_date: str, to_date: str) -> str:
    xml = f"""<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC>
    <REPORTNAME>Voucher Register</REPORTNAME>
    <STATICVARIABLES>
      <SVFROMDATE>{from_date}</SVFROMDATE>
      <SVTODATE>{to_date}</SVTODATE>
    </STATICVARIABLES>
  </REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>"""
    r = requests.post(TALLY_URL, data=xml, timeout=TALLY_TIMEOUT)
    return r.text


def parse_vouchers(xml_text: str) -> list:
    vouchers = []
    try:
        root = ET.fromstring(xml_text)
        for v in root.iter("VOUCHER"):
            date_raw = v.findtext("DATE", "")
            # Tally date format: YYYYMMDD → convert
            try:
                date = datetime.strptime(date_raw, "%Y%m%d").strftime("%Y-%m-%d")
            except Exception:
                date = date_raw

            amount_text = v.findtext("AMOUNT", "0").replace(",", "")
            try:
                amount = float(amount_text)
            except Exception:
                amount = 0.0

            vouchers.append({
                "voucher_date":   date,
                "voucher_type":   v.findtext("VOUCHERTYPENAME", ""),
                "voucher_number": v.findtext("VOUCHERNUMBER", ""),
                "party_name":     v.findtext("PARTYLEDGERNAME", ""),
                "amount":         amount,
                "ledger_name":    v.findtext("LEDGERNAME", ""),
                "narration":      v.findtext("NARRATION", ""),
                "payment_mode":   "cash" if "Cash" in v.findtext("LEDGERNAME", "") else "bank",
            })
    except Exception as e:
        print(f"XML parse error: {e}")
    return vouchers


@router.get("/test-connection")
def test_connection():
    connected = test_tally()
    return {
        "connected":    connected,
        "tally_url":    TALLY_URL,
        "message":      "Tally connected!" if connected else "Tally not found. Please open TallyPrime and enable ODBC server on port 9000.",
    }


@router.post("/sync/{client_id}")
def sync_tally(
    client_id: int,
    from_date: str = "01-04-2024",
    to_date:   str = "31-03-2025",
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")

    if not test_tally():
        raise HTTPException(503, "Tally not connected. Please open TallyPrime.")

    try:
        xml_text = fetch_vouchers_xml(from_date, to_date)
        vouchers = parse_vouchers(xml_text)
    except Exception as e:
        raise HTTPException(500, f"Tally fetch failed: {str(e)}")

    # Save to DB — delete old entries first
    db.query(TallyEntry).filter(TallyEntry.client_id == client_id).delete()

    saved = 0
    for v in vouchers:
        entry = TallyEntry(client_id=client_id, **v)
        db.add(entry)
        saved += 1

    # Update client status
    client.audit_status        = "data_uploaded"
    client.audit_progress_pct  = 20
    db.commit()

    return {
        "success":      True,
        "synced_count": saved,
        "client_id":    client_id,
        "message":      f"{saved} vouchers synced from Tally",
    }


@router.get("/entries/{client_id}")
def get_entries(
    client_id:    int,
    voucher_type: str = None,
    from_date:    str = None,
    db: Session = Depends(get_db)
):
    q = db.query(TallyEntry).filter(TallyEntry.client_id == client_id)
    if voucher_type:
        q = q.filter(TallyEntry.voucher_type == voucher_type)
    if from_date:
        q = q.filter(TallyEntry.voucher_date >= from_date)
    entries = q.order_by(TallyEntry.voucher_date.desc()).all()
    return {
        "data": [{
            "id":             e.id,
            "voucher_date":   e.voucher_date,
            "voucher_type":   e.voucher_type,
            "voucher_number": e.voucher_number,
            "party_name":     e.party_name,
            "amount":         e.amount,
            "ledger_name":    e.ledger_name,
            "narration":      e.narration,
            "payment_mode":   e.payment_mode,
            "is_reconciled":  e.is_reconciled,
        } for e in entries],
        "total": len(entries),
    }
    