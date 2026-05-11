from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, SessionLocal, Firm

app = FastAPI(title="AuditIQ API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # demo — production mein specific domain daalna
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers.auth           import router as auth_router
from routers.clients        import router as clients_router
from routers.tally          import router as tally_router
from routers.bank           import router as bank_router
from routers.reconciliation import router as recon_router
from routers.reports        import router as reports_router

# Register routes
app.include_router(auth_router,    prefix="/api/v1/auth",    tags=["Auth"])
app.include_router(clients_router, prefix="/api/v1/clients", tags=["Clients"])
app.include_router(tally_router,   prefix="/api/v1/tally",   tags=["Tally"])
app.include_router(bank_router,    prefix="/api/v1/bank",    tags=["Bank"])
app.include_router(recon_router,   prefix="/api/v1/recon",   tags=["Reconciliation"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])

@app.on_event("startup")
async def startup():
    init_db()
    # Seed default firm if DB is empty (fresh Render deploy)
    db = SessionLocal()
    try:
        if not db.query(Firm).first():
            default_firm = Firm(
                firm_name     = "Demo CA Firm",
                ca_name       = "CA Demo",
                email         = "demo@auditiq.in",
                password_hash = "demo",
                plan          = "trial",
            )
            db.add(default_firm)
            db.commit()
            print("✅ Default firm created (id=1)")
    finally:
        db.close()
    print("✅ AuditIQ API ready")

@app.get("/")
def root():
    return {"message": "AuditIQ API running!", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

# Debug — print all routes on startup
@app.on_event("startup")
async def print_routes():
    print("\n📋 Registered routes:")
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"  {list(route.methods)} {route.path}")