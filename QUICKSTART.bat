@echo off
REM Quick Start Script for DeepScan Multi-University System (Windows)

setlocal enabledelayedexpansion

echo.
echo 🚀 DeepScan Multi-University Quick Start (Windows)
echo ================================================
echo.

REM Step 1: Backend Setup
echo [Step 1] Setting up Backend...
cd deepscan-backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo Installing dependencies...
poetry install --no-root

echo ✓ Backend dependencies installed
echo.

REM Step 2: Frontend Setup
echo [Step 2] Setting up Frontend...
cd ..\deepscan-frontend

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo ✓ Frontend dependencies installed
echo.

REM Step 3: Instructions
echo [Step 3] Start the servers
echo.
echo In Terminal 1 (Backend):
echo   cd deepscan-backend
echo   venv\Scripts\activate.bat
echo   poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo In Terminal 2 (Frontend):
echo   cd deepscan-frontend
echo   npm run dev
echo.

REM Step 4: Test URLs
echo [Step 4] Test the application
echo.
echo Once both servers are running:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.

echo ✓ Setup complete!
echo.
echo For detailed documentation, see: IMPLEMENTATION.md
echo.
pause
