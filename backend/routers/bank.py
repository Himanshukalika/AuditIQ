from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, BankEntry
import pdfplumber
import pandas as pd
import io
import re
from datetime import datetime

router = APIRouter()


def detect_bank(text: str) -> str:
    text = text.upper()
    if "HDFC"     in text: return "HDFC"
    if "STATE BANK" in text or "SBI" in text: return "SBI"
    if "ICICI"    in text: return "ICICI"
    if "AXIS"     in text: return "AXIS"
    if "PUNJAB"   in text or "PNB" in text:   return "PNB"
    return "UNKNOWN"


def normalize_amount(val) -> float:
    if val is None:
        return 0.0
    s = str(val).strip().lower()
    if s in ("", "-", "—", "nil", "nan", "none") or s.startswith("*"):
        return 0.0
    s = s.replace(",", "").replace("₹", "").replace(" ", "")
    try:
        result = abs(float(s))
        import math
        return 0.0 if math.isnan(result) or math.isinf(result) else result
    except Exception:
        return 0.0


def normalize_date(val) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    val = str(val).strip()
    # Handle pandas 'YYYY-MM-DD HH:MM:SS' strings
    if " " in val:
        val = val.split(" ")[0]
    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d %b %Y", "%d-%b-%Y", "%d/%m/%y"]:
        try:
            return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    return val


def parse_pdf_statement(content: bytes) -> list:
    entries = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        bank_name = "UNKNOWN"
        all_text = ""
        for page in pdf.pages:
            all_text += page.extract_text() or ""

        bank_name = detect_bank(all_text)

        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue
                # Find header row
                headers = [str(h).lower().strip() if h else "" for h in table[0]]
                date_col = next((i for i, h in enumerate(headers) if "date" in h), None)
                desc_col = next((i for i, h in enumerate(headers) if any(x in h for x in ["desc", "narr", "particular", "detail"])), None)
                debit_col  = next((i for i, h in enumerate(headers) if "debit" in h or "dr" == h or "withdrawal" in h), None)
                credit_col = next((i for i, h in enumerate(headers) if "credit" in h or "cr" == h or "deposit" in h), None)
                balance_col = next((i for i, h in enumerate(headers) if "balance" in h or "bal" in h), None)

                if date_col is None:
                    continue

                for row in table[1:]:
                    if not row or not row[date_col]:
                        continue
                    date = normalize_date(row[date_col])
                    if not date:
                        continue

                    desc    = str(row[desc_col]).strip() if desc_col is not None and row[desc_col] else ""
                    debit   = normalize_amount(row[debit_col])  if debit_col  is not None else 0.0
                    credit  = normalize_amount(row[credit_col]) if credit_col is not None else 0.0
                    balance = normalize_amount(row[balance_col]) if balance_col is not None else 0.0

                    entries.append({
                        "bank_name":        bank_name,
                        "transaction_date": date,
                        "description":      desc,
                        "debit":            debit,
                        "credit":           credit,
                        "balance":          balance,
                    })
    return entries


def extract_party_from_narration(narration: str) -> str:
    """Extract human-readable party name from HDFC/bank narration strings."""
    if not narration:
        return ""
    n     = narration.strip()
    upper = n.upper()

    if upper.startswith("FT "):
        parts = [p.strip() for p in n.split(" - ")]
        if len(parts) >= 4:
            return parts[-1]

    if upper.startswith("NEFT"):
        parts = [p.strip() for p in n.split("-")]
        if len(parts) >= 3:
            return parts[2]

    if upper.startswith("IMPS"):
        parts = [p.strip() for p in n.split("-")]
        if len(parts) >= 3:
            return parts[2]

    if "CHQ" in upper:
        parts = [p.strip() for p in re.split(r"[-/]", n)]
        for p in reversed(parts):
            if p and not re.match(r"^[\*\s\d]+$", p) and len(p) > 3:
                return p

    tpt = re.search(r"-TPT-HI-(.+)$", n, re.IGNORECASE)
    if tpt:
        return tpt.group(1).strip()

    if upper.startswith("UPI"):
        vpa = re.search(r"([A-Z0-9][A-Z0-9.]*@[A-Z][A-Z0-9]*)", n, re.IGNORECASE)
        if vpa:
            username = vpa.group(1).split("@")[0]
            if re.match(r"^\d+$", username):
                return ""
            parts   = username.split(".")
            cleaned = [re.sub(r"\d+$", "", p) for p in parts]
            name    = " ".join(p for p in cleaned if len(p) > 2)
            return name.strip() if name.strip() else username

    return ""


def parse_excel_statement(content: bytes, filename: str) -> list:
    entries = []
    df = pd.read_excel(io.BytesIO(content), header=None)

    bank_name = "UNKNOWN"
    # Try to detect bank from first few rows
    for i in range(min(5, len(df))):
        row_text = " ".join([str(v) for v in df.iloc[i] if pd.notna(v)]).upper()
        bank = detect_bank(row_text)
        if bank != "UNKNOWN":
            bank_name = bank
            break

    # Find header row
    header_row = None
    for i, row in df.iterrows():
        row_lower = [str(v).lower() for v in row if pd.notna(v)]
        date_found = any("date" in v for v in row_lower)
        desc_found = any(x in v for v in row_lower for x in ["desc", "narr", "particular", "detail"])
        amt_found  = any(x in v for v in row_lower for x in ["bal", "withdraw", "deposit", "debit", "credit", "amount"])
        if date_found and desc_found and amt_found:
            header_row = i
            break

    if header_row is None:
        return entries

    df.columns = df.iloc[header_row]
    df = df.iloc[header_row + 1:].reset_index(drop=True)

    cols = {str(c).lower().strip(): c for c in df.columns if pd.notna(c)}
    date_col    = next((cols[k] for k in cols if "date" in k), None)
    desc_col    = next((cols[k] for k in cols if any(x in k for x in ["desc", "narr", "particular"])), None)
    debit_col   = next((cols[k] for k in cols if "debit" in k or k == "dr" or "withdrawal" in k), None)
    credit_col  = next((cols[k] for k in cols if "credit" in k or k == "cr" or "deposit" in k), None)
    balance_col = next((cols[k] for k in cols if "balance" in k or k == "bal"), None)

    if date_col is None:
        return entries

    for _, row in df.iterrows():
        date = normalize_date(row.get(date_col))
        # Strict check — must be a valid YYYY-MM-DD date, skip garbage rows
        if not date or not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            continue
        raw_desc = str(row.get(desc_col, "")).strip() if desc_col else ""
        if raw_desc.lower() in ("nan", "") or raw_desc.startswith("*"):
            continue
        party = extract_party_from_narration(raw_desc)
        desc  = f"{party} | {raw_desc}" if party else raw_desc
        entries.append({
            "bank_name":        bank_name,
            "transaction_date": date,
            "description":      desc,
            "debit":            normalize_amount(row.get(debit_col))  if debit_col  else 0.0,
            "credit":           normalize_amount(row.get(credit_col)) if credit_col else 0.0,
            "balance":          normalize_amount(row.get(balance_col)) if balance_col else 0.0,
        })
    return entries


@router.post("/upload/{client_id}")
async def upload_bank_statement(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(404, "Client not found")

    content  = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            entries = parse_pdf_statement(content)
        elif filename.endswith((".xlsx", ".xls")):
            entries = parse_excel_statement(content, filename)
        elif filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            entries = []
            for _, row in df.iterrows():
                entries.append({
                    "bank_name":        "UNKNOWN",
                    "transaction_date": normalize_date(row.get("Date", "")),
                    "description":      str(row.get("Description", "")),
                    "debit":            normalize_amount(row.get("Debit", 0)),
                    "credit":           normalize_amount(row.get("Credit", 0)),
                    "balance":          normalize_amount(row.get("Balance", 0)),
                })
        else:
            raise HTTPException(400, "Unsupported file format. Use PDF, Excel, or CSV.")
    except Exception as e:
        raise HTTPException(500, f"File parsing failed: {str(e)}")

    if not entries:
        raise HTTPException(400, "No transactions found in file. Check file format.")

    # Delete old bank entries for this client (fresh upload)
    db.query(BankEntry).filter(BankEntry.client_id == client_id).delete()

    # Save clean entries — strict date validation, no NaN/NULL amounts
    saved = 0
    import re as _re
    for e in entries:
        date = e.get("transaction_date", "")
        if not date or not _re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            continue
        # Ensure no None/NaN in numeric fields
        e["debit"]   = e.get("debit")   or 0.0
        e["credit"]  = e.get("credit")  or 0.0
        e["balance"] = e.get("balance") or 0.0
        entry = BankEntry(client_id=client_id, source_file=file.filename, **e)
        db.add(entry)
        saved += 1

    db.commit()

    return {
        "success":     True,
        "parsed":      len(entries),
        "saved":       saved,
        "bank_name":   entries[0]["bank_name"] if entries else "UNKNOWN",
        "filename":    file.filename,
        "message":     f"{saved} transactions imported from {file.filename}",
    }


@router.get("/entries/{client_id}")
def get_bank_entries(client_id: int, db: Session = Depends(get_db)):
    entries = db.query(BankEntry).filter(
        BankEntry.client_id == client_id
    ).order_by(BankEntry.transaction_date.desc()).all()

    return {
        "data": [{
            "id":               e.id,
            "bank_name":        e.bank_name,
            "transaction_date": e.transaction_date,
            "description":      e.description,
            "debit":            e.debit,
            "credit":           e.credit,
            "balance":          e.balance,
            "is_reconciled":    e.is_reconciled,
        } for e in entries],
        "total": len(entries),
    }