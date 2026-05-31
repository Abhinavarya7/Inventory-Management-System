# Inventory & Order Management System

This project includes:

- A React frontend
- A Python FastAPI backend
- PostgreSQL-ready database support through SQLAlchemy

## Features

- Product management: create, list, view, update, delete
- Customer management: create, list, view, delete
- Order management: create, list, view, cancel
- Inventory tracking through product stock levels
- Dashboard summary for products, customers, orders, and low stock products

## Backend

The backend lives in `backend/`.

### Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Environment

Copy `backend/.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.

If `DATABASE_URL` is not set, the app falls back to a local SQLite database for convenience.

## Frontend

The frontend lives in `frontend/`.

### Run locally

```bash
cd frontend
npm install
npm run dev
```

### Environment

Copy `frontend/.env.example` to `.env` and set `VITE_API_URL` if your backend is not running on `http://localhost:8000`.

## PostgreSQL

Use the included `docker-compose.yml` to start PostgreSQL:

```bash
docker compose up -d db
```

