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

If `DATABASE_URL` is not set, the app falls back to an in-memory SQLite database for convenience.

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

## Docker

Build the full-stack image:

```bash
docker build -t <your-dockerhub-username>/inventory-order-management:latest .
```

Run the app with PostgreSQL:

```bash
docker compose up --build
```

Push to Docker Hub:

```bash
docker login
docker push <your-dockerhub-username>/inventory-order-management:latest
```

## Vercel + Render

Deploy the frontend to Vercel as a separate project with the `frontend/` folder as the root directory.

Set this environment variable in Vercel:

- `VITE_API_URL=https://<your-render-backend>.onrender.com`

Deploy the backend to Render from the `render.yaml` blueprint or manually as a Python web service with:

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `DATABASE_URL` from Render Postgres
  - `CORS_ORIGINS=https://<your-vercel-app>.vercel.app`

Render and Vercel both create preview URLs too, so if you use previews you should add those preview domains to `CORS_ORIGINS` as well.
