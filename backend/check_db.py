from database import SessionLocal, Firm, Client, TallyEntry, BankEntry, Reconciliation

db = SessionLocal()
try:
    firms = db.query(Firm).count()
    clients = db.query(Client).count()
    tally = db.query(TallyEntry).count()
    bank = db.query(BankEntry).count()
    recons = db.query(Reconciliation).count()

    print(f"Firms: {firms}")
    print(f"Clients: {clients}")
    print(f"Tally Entries: {tally}")
    print(f"Bank Entries: {bank}")
    print(f"Reconciliations: {recons}")
finally:
    db.close()
