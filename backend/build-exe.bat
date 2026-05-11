@echo off
echo ========================================
echo   AuditIQ Backend - PyInstaller Build
echo ========================================

cd /d "%~dp0"

:: Activate venv if present
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

:: Install pyinstaller if missing
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

:: Clean previous build
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
if exist auditiq_backend.spec del auditiq_backend.spec

:: Build
echo Building backend.exe ...
pyinstaller ^
  --name auditiq_backend ^
  --onedir ^
  --windowed ^
  --add-data "routers;routers" ^
  --hidden-import uvicorn.logging ^
  --hidden-import uvicorn.loops ^
  --hidden-import uvicorn.loops.auto ^
  --hidden-import uvicorn.protocols ^
  --hidden-import uvicorn.protocols.http ^
  --hidden-import uvicorn.protocols.http.auto ^
  --hidden-import uvicorn.protocols.websockets ^
  --hidden-import uvicorn.protocols.websockets.auto ^
  --hidden-import uvicorn.lifespan ^
  --hidden-import uvicorn.lifespan.on ^
  --hidden-import sqlalchemy.dialects.sqlite ^
  --hidden-import passlib.handlers.bcrypt ^
  --hidden-import multipart ^
  --collect-all rapidfuzz ^
  main.py

if errorlevel 1 (
    echo.
    echo ❌ Build FAILED
    pause
    exit /b 1
)

echo.
echo ✅ Build complete! Output: backend\dist\auditiq_backend\
pause
