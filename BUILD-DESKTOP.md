# AuditIQ — Windows Desktop Build Guide

## Prerequisites

- Node.js 20+ installed
- Python 3.10+ with venv
- Backend dependencies installed: `pip install -r requirements.txt`

---

## Step 1 — Build Python backend .exe

```bat
cd backend
build-exe.bat
```

This runs PyInstaller and produces:
```
backend/dist/auditiq_backend/
  auditiq_backend.exe
  ... (all DLLs + Python runtime)
```

---

## Step 2 — Install Electron dependencies

```bat
cd ..   (project root)
npm install
```

---

## Step 3 — Build the Windows installer

```bat
npm run electron:build
```

This runs:
1. `next build` — builds Next.js frontend
2. `electron-builder --win --x64` — packages everything into `dist-electron/`

Output:
```
dist-electron/
  AuditIQ Setup 0.1.0.exe    ← installer to share with client
```

---

## Dev mode (no installer needed)

Terminal 1 — backend:
```bat
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8080
```

Terminal 2 — frontend:
```bat
npm run dev
```

Terminal 3 — Electron:
```bat
npm run electron:dev
```

---

## How it works

- Electron starts `auditiq_backend.exe` (FastAPI on port 8080)
- Electron starts `next start` (Next.js on port 3000)
- BrowserWindow loads `http://localhost:3000`
- Frontend detects `window.electronAPI.isElectron` and calls `localhost:8080` directly
- Tally integration works because the app runs on the same PC as Tally

## Notes

- SQLite DB stored in `backend/dist/auditiq_backend/auditiq.db` — survives app restarts
- No internet required after install
- Tally must be open and XML server enabled on port 9000
