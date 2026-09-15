# Indian Chicken Center - FastAPI Backend & PostgreSQL Data Layer

Production-grade FastAPI backend for **Indian Chicken Center** chicken distribution & business management system. Built with SQLAlchemy 2.x, Pydantic v2, Alembic migrations, PostgreSQL support, JWT authentication, and exact monetary/quantitative calculations (`Decimal`).

---

## Architecture Overview

```
backend/
├── app/
│   ├── api/             # REST API Routers (auth, trucks, trips, orders, customers, expenses, wastage, payments, reports)
│   ├── models/          # SQLAlchemy 2.x ORM Database Entities
│   ├── schemas/         # Pydantic v2 Validation Request/Response Schemas
│   ├── services/        # Business Logic (Profit Audit, Customer Ledger, Auth JWT)
│   ├── config.py        # Environment Configuration Settings
│   ├── database.py      # Database Engine & Session Factory
│   └── main.py          # FastAPI Application Entrypoint & Startup Seed
├── alembic/             # Database Migration Scripts
├── tests/               # Pytest Unit & Integration Test Suite
├── alembic.ini          # Alembic Migration Config
├── requirements.txt     # Python Dependencies
├── .env.example         # Template Environment Variables
└── README.md
```

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration uses SQLite (`sqlite:///./indian_chicken_center.db`) for zero-setup local development. For PostgreSQL, set:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/indian_chicken_center
```

### 3. Run Database Migrations
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 4. Start FastAPI Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
- API Endpoint: `http://localhost:8000/api`
- Interactive OpenAPI / Swagger Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

## Running Backend Tests

Run the full `pytest` suite covering calculation services, fuel rates, ledger math, non-negative Pydantic validation, and REST API routes:

```bash
pytest -v
```

---

## Business Financial Formulas

1. **Stock Purchase Cost**: `loaded_quantity_kg × purchase_price_per_kg`
2. **Order Total**: `quantity_kg × selling_price_per_kg`
3. **Fuel Expense**: `litres × price_per_litre` (Daily market rate)
4. **Customer Ledger Balance**: `Opening Balance + Total Purchases − Total Payments`
5. **Net Profit Audit Formula**:
   `Sales Revenue − Stock Purchase Cost − Fuel − Labour − Vehicle Maintenance − Food − Other Expenses − Transportation Wastage Cost = Net Profit`
