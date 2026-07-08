# DeepScan — Document Intelligence System

Scan & extract information from diplomas, verify identity against a database, and detect forgery.

**✨ v2.0: Multi-University Support** - Support for multiple universities with data isolation, dynamic filtering, and enterprise architecture. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for details.

## Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **Tesseract OCR** installed on your system
- **(Optional)** Ollama running with `llama3.2` model for auto-extraction

## 1. Install Tesseract OCR

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-fra python3-opencv
```

**macOS:**
```bash
brew install tesseract
pip install opencv-python
```

**Windows:**
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
Then `pip install opencv-python`

## 2. Backend Setup

```bash
cd deepscan-backend

# Install Poetry (if not already installed)
pip install poetry

# Install Python dependencies
poetry install

# Start the backend server
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs at **http://localhost:8000**

### Optional: Ollama for Auto-Extraction

If you want the LLaMA-powered auto-extraction to work:

```bash
# Install Ollama: https://ollama.ai
ollama pull llama3.2
ollama serve
```

## 3. Frontend Setup

Open a **new terminal**:

```bash
cd deepscan-frontend

# Install Node.js dependencies
npm install

# Start the frontend dev server
npm run dev
```

The frontend runs at **http://localhost:5175**

## 4. Open in Browser

Navigate to **http://localhost:5175** in your browser.

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Live stats from the DB; sample charts; latest records |
| **Scan & Extract** | Auto / manual OCR / manual entry; workflow: staging vs direct-to-database |
| **Identity Verification** | Staging queue: verify extractions against the DB (results saved on each row) |
| **Identity Verification Results** | Checked vs not-yet-verified staging rows; quick typed-field verify |
| **Forgery Detection** | UI demo (simulated analysis in the browser) |
| **Records Database** | Search, status filter, export page as JSON, edit/delete |
| **History / Archive** | Soft-deleted records; restore or purge |
| **Settings** | **OCR & LLM** saved on the server; other tabs are browser-local preferences |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | OCR + LLaMA auto-extraction |
| POST | `/api/ocr-only` | OCR only (no LLaMA) |
| POST | `/api/extract` | Send OCR text to LLaMA |
| POST | `/api/manual-ocr` | OCR on drawn regions |
| POST | `/api/verify` | Batch verify records |
| POST | `/api/verify/single` | Verify single set of fields |
| PATCH | `/api/staging/{id}/verification` | Save verify outcome (match / mismatch / not_found) on a staging row |
| GET | `/api/records` | List records (search, filter, paginate) |
| POST | `/api/records` | Create record |
| PUT | `/api/records/{id}` | Update record |
| DELETE | `/api/records/{id}` | Delete record |
| POST | `/api/records/save-extraction` | Save extraction to DB |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/ollama/status` | Check Ollama connectivity |
