from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./auditiq.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ────────────────────────────────────────────────

class Firm(Base):
    __tablename__ = "firms"
    id              = Column(Integer, primary_key=True, index=True)
    firm_name       = Column(String(200), nullable=False)
    ca_name         = Column(String(200), nullable=False)
    email           = Column(String(150), unique=True, nullable=False)
    password_hash   = Column(String(256), nullable=False)
    phone           = Column(String(15))
    city            = Column(String(100))
    state           = Column(String(100))
    membership_no   = Column(String(50))
    plan            = Column(String(20), default="trial")
    created_at      = Column(DateTime, default=datetime.utcnow)
    clients         = relationship("Client", back_populates="firm")


class Client(Base):
    __tablename__ = "clients"
    id                  = Column(Integer, primary_key=True, index=True)
    firm_id             = Column(Integer, ForeignKey("firms.id"), nullable=False)
    client_name         = Column(String(300), nullable=False)
    pan                 = Column(String(10), nullable=False)
    gstin               = Column(String(15))
    business_type       = Column(String(50))
    financial_year      = Column(String(7), nullable=False, default="2024-25")
    turnover_approx     = Column(Float)
    city                = Column(String(100))
    state               = Column(String(100))
    audit_status        = Column(String(30), default="pending")
    audit_progress_pct  = Column(Integer, default=0)
    notes               = Column(Text)
    created_at          = Column(DateTime, default=datetime.utcnow)
    firm                = relationship("Firm", back_populates="clients")
    tally_entries       = relationship("TallyEntry", back_populates="client")
    bank_entries        = relationship("BankEntry", back_populates="client")
    reconciliations     = relationship("Reconciliation", back_populates="client")


class TallyEntry(Base):
    __tablename__ = "tally_entries"
    id                  = Column(Integer, primary_key=True, index=True)
    client_id           = Column(Integer, ForeignKey("clients.id"), nullable=False)
    voucher_date        = Column(String(10), nullable=False)
    voucher_type        = Column(String(50), nullable=False)
    voucher_number      = Column(String(50))
    party_name          = Column(String(300))
    amount              = Column(Float, nullable=False)
    ledger_name         = Column(String(200))
    narration           = Column(Text)
    payment_mode        = Column(String(20), default="bank")
    bank_ledger         = Column(String(200))
    is_reconciled       = Column(Boolean, default=False)
    synced_at           = Column(DateTime, default=datetime.utcnow)
    client              = relationship("Client", back_populates="tally_entries")


class BankEntry(Base):
    __tablename__ = "bank_entries"
    id                  = Column(Integer, primary_key=True, index=True)
    client_id           = Column(Integer, ForeignKey("clients.id"), nullable=False)
    bank_name           = Column(String(50))
    account_number      = Column(String(20))
    transaction_date    = Column(String(10), nullable=False)
    description         = Column(Text)
    reference_no        = Column(String(100))
    debit               = Column(Float, default=0)
    credit              = Column(Float, default=0)
    balance             = Column(Float, default=0)
    is_reconciled       = Column(Boolean, default=False)
    uploaded_at         = Column(DateTime, default=datetime.utcnow)
    source_file         = Column(String(200))
    client              = relationship("Client", back_populates="bank_entries")


class Reconciliation(Base):
    __tablename__ = "reconciliations"
    id                  = Column(Integer, primary_key=True, index=True)
    client_id           = Column(Integer, ForeignKey("clients.id"), nullable=False)
    tally_entry_id      = Column(Integer, ForeignKey("tally_entries.id"))
    bank_entry_id       = Column(Integer, ForeignKey("bank_entries.id"))
    match_type          = Column(String(20))
    match_score         = Column(Integer, default=0)
    flag_type           = Column(String(30), default="none")
    flag_description    = Column(Text)
    ca_review_status    = Column(String(20), default="pending")
    ca_notes            = Column(Text)
    reviewed_by         = Column(String(100))
    reviewed_at         = Column(DateTime)
    created_at          = Column(DateTime, default=datetime.utcnow)
    client              = relationship("Client", back_populates="reconciliations")


# ── DB Init ───────────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized — auditiq.db ready")


# ── Dependency ─────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()