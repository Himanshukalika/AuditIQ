from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, TallyEntry
from datetime import datetime
from dateutil.relativedelta import relativedelta
import time
import requests
import xml.etree.ElementTree as ET
import re

router = APIRouter()

TALLY_URL     = "http://localhost:9000"
TALLY_TIMEOUT = 120


def test_tally_connection() -> bool:
    try:
        requests.get(TALLY_URL, timeout=5)
        return True
    except Exception:
        return False


def fetch_tally_xml(from_date: str, to_date: str) -> str:
    xml_request = f"""<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVFROMDATE>{from_date}</SVFROMDATE>
          <SVTODATE>{to_date}</SVTODATE>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>"""
    response = requests.post(
        TALLY_URL,
        data=xml_request.encode('utf-8'),
        headers={"Content-Type": "text/xml"},
        timeout=TALLY_TIMEOUT
    )
    return response.text


def parse_amount(val_str: str) -> float:
    try:
        return abs(float(val_str.replace(",", "").strip()))
    except Exception:
        return 0.0

def get_amount_from_voucher(voucher) -> float:
    # ALLLEDGERENTRIES.LIST ke andar amount dhundho
    for tag in ["ALLLEDGERENTRIES.LIST", "LEDGERENTRIES.LIST"]:
        for entry in voucher.findall(tag):
            val = entry.findtext("AMOUNT")
            if val and val.strip():
                amt = parse_amount(val)
                if amt != 0.0:
                    return amt

    # Direct tags bhi try karo
    for tag in ["AMOUNT", "LEDGERAMOUNT"]:
        val = voucher.findtext(tag)
        if val and val.strip():
            amt = parse_amount(val)
            if amt != 0.0:
                return amt

    return 0.0

def parse_tally_xml(xml_text: str) -> list:
    vouchers = []
    try:
        # Clean XML — Tally kabhi kabhi garbage characters bhejta hai
        xml_text = xml_text.strip()
        if not xml_text:
            return []

        # Remove literal invalid XML control characters (0x00-0x1F) except tab, newline, return
        xml_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', xml_text)
        
        # Clean invalid XML entities using XML 1.0 valid character ranges
        def is_valid_xml_char(n):
            return (n == 0x9 or n == 0xA or n == 0xD or
                    (0x20 <= n <= 0xD7FF) or
                    (0xE000 <= n <= 0xFFFD) or
                    (0x10000 <= n <= 0x10FFFF))
                    
        # Remove invalid hex entities (e.g., &#x04;, &#x1A;, &#x9F;)
        xml_text = re.sub(r'&#x([0-9a-fA-F]+);', 
                          lambda m: m.group(0) if is_valid_xml_char(int(m.group(1), 16)) else '', 
                          xml_text)
                          
        # Remove invalid decimal entities (e.g., &#28;, &#150;)
        xml_text = re.sub(r'&#([0-9]+);', 
                          lambda m: m.group(0) if is_valid_xml_char(int(m.group(1))) else '', 
                          xml_text)

        root = ET.fromstring(xml_text)

        for voucher in root.iter("VOUCHER"):
            try:
                # Date parse karo — Tally format: YYYYMMDD
                date_raw = voucher.findtext("DATE", "").strip()
                try:
                    voucher_date = datetime.strptime(date_raw, "%Y%m%d").strftime("%Y-%m-%d")
                except Exception:
                    voucher_date = date_raw

                # Amount parse karo
                amount = get_amount_from_voucher(voucher)

                # Party name
                party = (
                    voucher.findtext("PARTYLEDGERNAME") or
                    voucher.findtext("PARTYMASTERNAME") or
                    ""
                ).strip()

                # Voucher type
                v_type = (voucher.findtext("VOUCHERTYPENAME") or "").strip()

                # Ledger name
                ledger = (voucher.findtext("LEDGERNAME") or "").strip()

                # Narration
                narration = (voucher.findtext("NARRATION") or "").strip()

                # Payment mode detect karo
                ledger_lower = ledger.lower()
                if "cash" in ledger_lower:
                    payment_mode = "cash"
                elif any(x in ledger_lower for x in ["hdfc", "sbi", "icici", "axis", "bank", "current", "saving"]):
                    payment_mode = "bank"
                else:
                    payment_mode = "bank"

                if date_raw:  # sirf valid entries save karo
                    vouchers.append({
                        "voucher_date":   voucher_date,
                        "voucher_type":   v_type,
                        "voucher_number": (voucher.findtext("VOUCHERNUMBER") or "").strip(),
                        "party_name":     party,
                        "amount":         amount,
                        "ledger_name":    ledger,
                        "narration":      narration,
                        "payment_mode":   payment_mode,
                        "bank_ledger":    ledger if payment_mode == "bank" else "",
                    })
            except Exception as row_err:
                print(f"Voucher parse error (skipping): {row_err}")
                continue

    except ET.ParseError as xml_err:
        print(f"XML parse error: {xml_err}")
        print(f"XML preview: {xml_text[:500]}")
        raise Exception(f"Tally se invalid XML aaya. TallyPrime mein ODBC properly enable hai? Error: {xml_err}")
    except Exception as e:
        print(f"General parse error: {e}")
        raise

    return vouchers


@router.get("/test-connection")
def test_connection():
    connected = test_tally_connection()
    return {
        "connected": connected,
        "tally_url": TALLY_URL,
        "message":   "Tally connected!" if connected
                     else "Tally not found. TallyPrime open karo aur ODBC enable karo (F12 → Connectivity → Port 9000)",
    }


@router.post("/sync/{client_id}")
def sync_tally(
    client_id: int,
    from_date: str = "01-04-2024",
    to_date:   str = "31-03-2025",
    db: Session = Depends(get_db)
):
    # Client check
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, f"Client ID {client_id} not found. Pehle client banao.")

    # Tally connection check
    if not test_tally_connection():
        raise HTTPException(503,
            "Tally not connected. Steps: 1) TallyPrime open karo "
            "2) F12 → Connectivity → Enable ODBC: Yes → Port: 9000 "
            "3) Ctrl+A save karo 4) Tally restart karo"
        )

    # Parse input dates
    try:
        start_date = datetime.strptime(from_date, "%d-%m-%Y")
        end_date = datetime.strptime(to_date, "%d-%m-%Y")
    except ValueError:
        raise HTTPException(400, "Date format must be DD-MM-YYYY (e.g., 01-04-2024)")

    # DB mein save karne se pehle purani entries delete karo
    db.query(TallyEntry).filter(TallyEntry.client_id == client_id).delete()
    db.commit()
    
    current_start = start_date
    total_saved = 0
    has_errors = False
    
    while current_start <= end_date:
        # 1 mahine ki window (e.g., 1-Apr se 30-Apr)
        current_end = current_start + relativedelta(months=1) - relativedelta(days=1)
        if current_end > end_date:
            current_end = end_date
            
        str_start = current_start.strftime("%d-%m-%Y")
        str_end = current_end.strftime("%d-%m-%Y")
        
        print(f"Fetching from Tally: {str_start} to {str_end}...")
        
        try:
            # Fetch XML for this specific chunk
            xml_text = fetch_tally_xml(str_start, str_end)
            
            # Parse XML
            vouchers = parse_tally_xml(xml_text)
            
            if vouchers:
                # Bulk DB Insert (Bahut fast hai)
                db.bulk_insert_mappings(TallyEntry, [
                    {"client_id": client_id, **v} for v in vouchers
                ])
                db.commit()
                total_saved += len(vouchers)
                print(f"  -> {len(vouchers)} vouchers saved for this chunk.")
            else:
                print("  -> No vouchers in this chunk.")
                
        except requests.exceptions.Timeout:
            print(f"Timeout on chunk {str_start} to {str_end}")
            has_errors = True
        except requests.exceptions.ConnectionError:
            print("Connection to Tally lost.")
            has_errors = True
            break # Ab aage fetch karne ka fayda nahi
        except Exception as e:
            print(f"Error on chunk {str_start} to {str_end}: {e}")
            has_errors = True
            
        # Agle mahine ke liye start date update karo
        current_start = current_start + relativedelta(months=1)
        time.sleep(0.5) # Tally ko saans lene ke liye chhota break
        
    if total_saved == 0 and has_errors:
        raise HTTPException(500, "Sync failed completely. Tally connection or data error.")

    # Client status update
    client.audit_status        = "data_uploaded"
    client.audit_progress_pct  = 20
    db.commit()

    print(f"✅ Tally sync done — Total {total_saved} vouchers saved for client {client_id}")

    return {
        "success":      True,
        "synced_count": total_saved,
        "client_id":    client_id,
        "message":      f"{total_saved} vouchers synced from Tally {'(with some chunk errors)' if has_errors else ''}",
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