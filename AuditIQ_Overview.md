# AuditIQ - Automated CA Auditing & Reconciliation Platform

**AuditIQ** is an automated compliance and bank reconciliation tool designed specifically for Indian Chartered Accountants (CAs). It simplifies tax auditing and bank reconciliation by importing accounting vouchers from Tally ERP and matching them against uploaded bank statements, automatically flagging compliance risks and compiling data for Tax Audit Report Form 3CD.

---

## 🚀 Key Features

### 1. Direct Tally ERP Integration
* **Live ODBC/XML Sync**: Fetches transaction vouchers directly from Tally's local server (default: `http://localhost:9000`).
* **Smart XML Cleaning & Parsing**: Automatically sanitizes raw XML responses, extracts key voucher fields (date, voucher type, amount, party name, ledger, narration), and automatically infers the payment mode (Cash vs. Bank).

### 2. Intelligent Bank Statement Ingestion
* **Format Support**: Upload PDF and Excel statements.
* **Auto-Header Detection**: Automatically detects column mappings (Date, Narration/Description, Debit, Credit, Balance) regardless of format variations.
* **Narration Cleansing**: Cleans transaction codes (NEFT/IMPS/UPI prefixes) to extract clean, human-readable party names.

### 3. AI-Powered Matching & Reconciliation
The engine matches Tally entries with Bank entries in 5 sequential passes:
1. **Pass 1: Exact Match** — Identifies entries with exact amounts, matching dates, and high party similarity ($\ge 95\%$).
2. **Pass 2: Fuzzy Match** — Matches entries with similar party names (using Levenshtein distance via `RapidFuzz`), matching amounts, and transaction dates within a $\pm 3$ days window.
3. **Pass 3: Amount + Date Only** — Fallback match for entries where bank statements have generic UPI/NEFT descriptions, utilizing a loose date window of $\pm 7$ days.
4. **Pass 4: Unmatched Tally** — Flags Tally entries that do not have a matching bank transaction (likely cash transactions or uncredited bank deposits).
5. **Pass 5: Unmatched Bank** — Flags bank transactions not registered in Tally.

### 4. Configurable Compliance & Tax Audit Rule Engine
Runs compliance checks on all matching and unmatched entries:
* **Sec 40A(3) Disallowance Check**: Flags cash payments exceeding ₹10,000 per day.
* **TDS Compliance Rules**: Flags transactions where TDS should have been deducted under:
  * **Sec 194C** (Contractors / Advertising) — threshold: ₹30,000
  * **Sec 194J** (Professional / Technical Fees) — threshold: ₹30,000
  * **Sec 194A** (Interest Paid) — threshold: ₹5,000
  * **Sec 194H** (Commission / Brokerage) — threshold: ₹15,000
  * **Sec 194I** (Rent) — threshold: ₹20,000/month or ₹2,40,000/year
* **Custom Overrides**: CAs can enable/disable rules or adjust thresholds dynamically from the frontend.

### 5. Form 3CD Compliance Dashboard
Assists CAs in completing the Tax Audit Report under Section 44AB:
* Automatically maps identified compliance violations to relevant Form 3CD clauses:
  * **Clause 16(d)**: Capital Gains
  * **Clause 21(a)**: Personal Expenditure risks (e.g., personal drawings)
  * **Clause 21(i)**: Club entrance/subscriptions
  * **Clause 31(a)**: Loans/deposits exceeding Sec 269SS limits (₹20,000 limit)
  * **Clause 34(a)**: TDS/TCS defaults
  * **Clause 40**: Gross Profit (GP) & Net Profit (NP) ratios

---

## 🛠 Tech Stack

### Frontend (Next.js App)
* **Framework**: Next.js 15+ (App Router, TypeScript)
* **Styling**: Tailwind CSS & Vanilla CSS custom variables
* **Icons**: `lucide-react`
* **HTTP Client**: Axios (configured in `src/lib/api.ts`)

### Backend (Python FastAPI)
* **Framework**: FastAPI
* **Database / ORM**: SQLite (`auditiq.db`) with SQLAlchemy
* **PDF Processing**: `pdfplumber`
* **Data Processing**: `pandas`
* **Fuzzy Matching**: `rapidfuzz`

---

## 📂 Project Structure

```bash
AuditIQ/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLAlchemy models (Firm, Client, TallyEntry, BankEntry, Reconciliation)
│   ├── audit_rules.py       # Tax & compliance rule engine logic
│   ├── auditiq.db           # SQLite database file
│   ├── requirements.txt     # Python dependencies
│   ├── render.yaml          # Render cloud hosting configuration
│   └── routers/
│       ├── auth.py          # Firm login/registration API
│       ├── clients.py       # Client management & dashboard stats
│       ├── tally.py         # Tally integration (fetch XML, parse)
│       ├── bank.py          # Ingest & parse Excel/PDF bank statements
│       ├── reconciliation.py# 5-pass reconciliation logic & rule execution
│       └── reports.py       # PDF/Excel report generator (stub)
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── bank/            # View bank transactions
│   │   ├── clients/         # Manage audited clients
│   │   ├── form3cd/         # Form 3CD clause compliance viewer
│   │   ├── observations/    # AI flagged observations & disallowance summary
│   │   ├── rules/           # Audit rules custom configuration page
│   │   ├── upload/          # Bank statement upload & Tally sync panel
│   │   ├── layout.tsx       # Core styling & sidebars
│   │   └── page.tsx         # Dashboard landing page
│   └── lib/
│       └── api.ts           # Axios API Client definition
└── package.json             # Next.js dependencies
```

---

## 🗄 Database Schema (SQLAlchemy)

The system models are defined in [database.py](file:///Users/himanshumac/Desktop/AuditIQ/backend/database.py):

* **Firm (`firms`)**: Represents the CA Firm (membership details, credentials, subscription plans).
* **Client (`clients`)**: Contains companies audited by the firm (PAN, GSTIN, financial year, turnover details, audit status).
* **TallyEntry (`tally_entries`)**: Individual accounting entries pulled from Tally.
* **BankEntry (`bank_entries`)**: Ingested transactions from bank statements.
* **Reconciliation (`reconciliations`)**: Records matching relations, scores, and tax risk flags (e.g. `sec_40a3_risk`, `tds_applicable`, `party_mismatch`) for review.

---

## ⚙ Run Locally

### 1. Run Backend
```bash
cd backend
# Create virtual environment
python3 -m venv venv
source venv/bin/activate
# Install requirements
pip install -r requirements.txt
# Run FastAPI server
uvicorn main:app --reload --port 8080
```

### 2. Run Frontend
```bash
# In the root directory
npm install
npm run dev
# Open http://localhost:3000
```
