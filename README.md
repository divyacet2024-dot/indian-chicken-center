# 🐔 Indian Chicken Center — Business Management Platform

A production-grade SaaS application for managing a wholesale chicken distribution business. Built for **Indian Chicken Center** — handling truck trips, stock, customer orders, ledgers, payments, expenses, wastage, and profit reporting, with a multilingual AI voice assistant.

---

## ✨ Features

| Feature | Description |
|---|---|
| **JWT Authentication** | Secure login + account activation with bcrypt |
| **Dashboard** | Live KPI cards — sales, profit, stock, outstanding dues |
| **Truck & Trip Management** | Start trips, track loaded stock, delivery progress |
| **Customer Ledger** | Opening balance + purchases − payments formula, verified by PostgreSQL |
| **Orders** | Record deliveries per customer per trip |
| **Payments** | UPI / cash collection with running balance |
| **Expenses** | Fuel, labour, maintenance, food, toll per trip |
| **Wastage / Chicken Loss** | Record dead-on-arrival weight with reason |
| **Profit Formula** | Revenue − Purchase Cost − Expenses − Wastage = Net Profit |
| **GPS Truck Tracking** | Live location sharing via browser Geolocation API + Leaflet map |
| **WhatsApp Billing** | Generate professional invoice from real order data and send via WhatsApp |
| **AI Business Assistant** | Ask questions in plain language — answered from real database |
| **Multilingual Voice** | Speak in English, Kannada, Hindi, Telugu, Tamil, Malayalam, Urdu, Marathi, Bengali |
| **PWA** | Mobile-responsive web app, installable on Android via Add to Home Screen. No offline data caching (live backend required). |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────┐
│                    FRONTEND                        │
│  Next.js 16 + React 19 + TypeScript + Tailwind     │
│  Mobile-first PWA · Voice STT/TTS (browser)        │
│  Deploy: Vercel                                    │
└──────────────────┬─────────────────────────────────┘
                   │ HTTPS + JWT Bearer
┌──────────────────▼─────────────────────────────────┐
│                    BACKEND                         │
│  FastAPI + SQLAlchemy + Alembic                    │
│  JWT Auth (python-jose) · bcrypt passwords          │
│  Multilingual NLP · AI Assistant · Voice Pipeline  │
│  Deploy: Render (or Railway / fly.io)              │
└──────────────────┬─────────────────────────────────┘
                   │ SQLAlchemy ORM
┌──────────────────▼─────────────────────────────────┐
│                  DATABASE                          │
│  PostgreSQL (production) / SQLite (development)    │
│  Alembic migrations                               │
│  Deploy: Render PostgreSQL / Supabase / Neon       │
└────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.11
- **pip** or **uv**

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/indian-chicken-center.git
cd indian-chicken-center
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY to a strong random value

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
# From project root
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local if needed (default points to localhost:8000)

# Start the dev server
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite or PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | — | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | Token lifetime (default: `1440` = 24h) |
| `CORS_ORIGINS` | — | Comma-separated allowed frontend origins |
| `FRONTEND_URL` | — | Production Vercel URL (auto-added to CORS) |
| `AI_PROVIDER` | — | Leave empty for deterministic AI (no API cost) |
| `OPENROUTER_API_KEY` | — | Optional: OpenRouter key for LLM-powered AI |
| `AI_MODEL` | — | LLM model name if using OpenRouter |
| `TTS_PROVIDER` | — | `browser` (default, free) |
| `ENVIRONMENT` | — | Set to `production` to hide API docs |

**Example PostgreSQL URL:**
```
DATABASE_URL=postgresql://user:password@host:5432/indian_chicken_center
```

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

**Examples:**
```bash
# Development
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api

# Production
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

---

## 🗄️ Database

### Development (SQLite — zero setup)

```bash
# .env
DATABASE_URL=sqlite:///./indian_chicken_center.db
```

### Production (PostgreSQL)

```bash
# .env
DATABASE_URL=postgresql://USER:PASS@HOST:5432/indian_chicken_center
```

### Alembic Migrations

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Check current revision
alembic current

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe the change"

# Roll back one step
alembic downgrade -1
```

---

## 📦 Production Deployment

### Backend → Render

1. Create a **Web Service** on Render pointing to `backend/`
2. **Build command:** `pip install -r requirements.txt && alembic upgrade head`
3. **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in Render dashboard
5. Set `ENVIRONMENT=production`
6. Set `FRONTEND_URL=https://your-app.vercel.app`

### Frontend → Vercel

1. Import the repository root into Vercel
2. **Framework preset:** Next.js
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`
4. Deploy

### CORS Configuration

Add your Vercel URL to the backend:

```bash
# backend/.env (production)
FRONTEND_URL=https://your-app.vercel.app
# OR add it to CORS_ORIGINS:
CORS_ORIGINS=https://your-app.vercel.app
```

---

## 📱 WhatsApp Billing

The WhatsApp billing workflow uses **only real data from the database**:

1. Owner records an order for a real customer
2. Opens the WhatsApp Bill modal from the orders table
3. System generates a formatted invoice with:
   - Real order number, date, customer name, phone
   - Actual quantity (kg), rate per kg, total
   - Previous balance, payment received, current balance due
4. Owner reviews the invoice preview
5. Clicks **"Send via WhatsApp"** — opens `wa.me/{phone}?text={bill}` in a new tab
6. Owner presses **Send** in WhatsApp — no silent sending

> **Note:** If a customer's WhatsApp number is missing, a clear error is shown. No fake numbers are ever used.

---

## 🤖 AI Voice Assistant

The voice pipeline uses **only browser-native APIs** — no third-party TTS cost:

```
User speaks
  → browser SpeechRecognition (STT)
    → Language detection (Unicode script ranges)
      → Backend AI service (deterministic rule-based, or OpenRouter if configured)
        → Real database query (SQLAlchemy)
          → Formatted answer in user's language
            → browser SpeechSynthesis (TTS)
```

### Supported Languages

| Code | Language | Example query |
|---|---|---|
| `en` | English | "Where is my truck number 1?" |
| `kn` | Kannada | "ನನ್ನ ಟ್ರಕ್ ನಂಬರ್ 1 ಎಲ್ಲಿದೆ?" |
| `hi` | Hindi | "आज का मुनाफा क्या है?" |
| `te` | Telugu | "ఈ రోజు లాభం ఎంత?" |
| `ta` | Tamil | "இன்றைய லாபம் என்ன?" |
| `ml` | Malayalam | "ഇന്നത്തെ ലാഭം എത്ര?" |
| `ur` | Urdu | "آج کا منافع کیا ہے؟" |
| `mr` | Marathi | "आजचा नफा किती?" |
| `bn` | Bengali | "আজকের লাভ কত?" |

---

## 🧪 Running Tests

### Backend

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Frontend (TypeScript)

```bash
npm run build      # also runs tsc
npx tsc --noEmit   # type-check only
```

---

## 📁 Project Structure

```
indian-chicken-center/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # Route handlers (auth, trips, orders…)
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic (AI, voice, auth…)
│   │   ├── config.py          # Environment settings
│   │   ├── database.py        # SQLAlchemy engine
│   │   └── main.py            # FastAPI app + CORS
│   ├── alembic/               # Database migrations
│   ├── tests/                 # pytest test suite (100+ tests)
│   ├── .env.example           # Environment variable template
│   └── requirements.txt
│
├── src/                        # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Main SaaS dashboard page
│   │   ├── layout.tsx         # Root layout + PWA meta
│   │   └── login/             # /login route
│   ├── components/
│   │   ├── auth/              # LoginPage
│   │   ├── dashboard/         # KPI, Orders, Trucks, AI Assistant…
│   │   ├── layout/            # AppShell, Header, Sidebar, MobileNav
│   │   ├── maps/              # TruckTrackingMap, LocationSharingControl
│   │   ├── modals/            # All form modals
│   │   ├── ui/                # Button, Card, Modal, Input, Badge
│   │   └── voice/             # useVoiceAssistant hook
│   ├── services/
│   │   ├── apiClient.ts       # Centralized API client (uses NEXT_PUBLIC_API_URL)
│   │   └── dataService.ts     # localStorage persistence layer
│   └── types/                 # TypeScript type definitions
│
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # PWA app icons
│
├── .env.local.example         # Frontend env template
└── README.md
```

---

## 🔒 Security Notes

- All API endpoints (except `/auth/login` and `/auth/activate`) require a valid JWT Bearer token
- Passwords are hashed with bcrypt — never stored in plain text
- JWT secrets are never committed — always loaded from environment
- SQLite database files are gitignored — real business data never goes to GitHub
- Production API docs are disabled via `ENVIRONMENT=production`
- CORS is configured via environment variables — no hardcoded production URLs

---

## 📱 PWA — Honest Scope

This is a **mobile-responsive web application** with PWA installability:

- ✅ Works in any modern mobile browser (Chrome, Safari, Firefox)
- ✅ Installable on Android via **Add to Home Screen** (Chrome 67+)
- ✅ Standalone display mode — hides browser UI when installed
- ✅ Emerald theme color and app icon on home screen
- ❌ **No offline data caching** — all data is fetched live from the backend API
- ❌ **No Service Worker** — no background sync or push notifications yet

> The app requires an active internet connection and a running backend to function. Offline mode is a planned future enhancement.

---

## ⚠️ Known Deployment Limitations

| # | Limitation | Status |
|---|---|---|
| 1 | **PWA icons** are solid-color PNG placeholders | Replace with proper branding artwork before launch |
| 2 | **Invoice letterhead** (Proprietor name + `+91 98450 99887`) is hardcoded in `WhatsAppBillModal.tsx` | Load from business profile API post-deployment |
| 3 | **No Service Worker / offline cache** | Future enhancement |
| 4 | **FastAPI `on_event` deprecation** — use `lifespan` handlers | Cosmetic; does not affect runtime |
| 5 | **`datetime.utcnow()` deprecation** in Python 3.12+ | Replace with `datetime.now(timezone.utc)` in future sprint |

---

*Indian Chicken Center Business Platform © 2026*
