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
    if val is None or str(val).strip() in ["", "-", "—", "Nil"]:
        return 0.0
    val = str(val).replace(",", "").replace("₹", "").strip()
    try:
        return abs(float(val))
    except Exception:
        return 0.0


def normalize_date(val) -> str:
    if val is None:
        return ""
    val = str(val).strip()
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
        if any("date" in v for v in row_lower):
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
        if not date:
            continue
        entries.append({
            "bank_name":        bank_name,
            "transaction_date": date,
            "description":      str(row.get(desc_col, "")).strip() if desc_col else "",
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

    # Save to DB
    saved = 0
    for e in entries:
        if not e["transaction_date"]:
            continue
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