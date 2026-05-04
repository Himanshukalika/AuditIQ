from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth, clients, tally, bank, reconciliation, reports

app = FastAPI(title="AuditIQ API", version="1.0.0")

# CORS — Next.js localhost:3000 ko allow karo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,           prefix="/api/v1/auth",   tags=["Auth"])
app.include_router(clients.router,        prefix="/api/v1/clients",tags=["Clients"])
app.include_router(tally.router,          prefix="/api/v1/tally",  tags=["Tally"])
app.include_router(bank.router,           prefix="/api/v1/bank",   tags=["Bank"])
app.include_router(reconciliation.router, prefix="/api/v1/recon",  tags=["Reconciliation"])
app.include_router(reports.router,        prefix="/api/v1/reports",tags=["Reports"])

@app.on_event("startup")
async def startup():
    init_db()

@app.get("/")
def root():
    return {"message": "AuditIQ API running!", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}