from __future__ import annotations

from pathlib import Path
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes.customers import router as customers_router
from .api.routes.dashboard import router as dashboard_router
from .api.routes.orders import router as orders_router
from .api.routes.products import router as products_router
from .database import Base, engine
from .settings import cors_origins


app = FastAPI(
    title="Inventory & Order Management API",
    version="1.0.0",
    description="A compact operations API for products, customers, orders, and stock tracking.",
)

STATIC_DIR = Path(__file__).resolve().parent / "static"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "ok", "service": "inventory-order-api", "mode": "modular"}


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "inventory-order-api", "mode": "modular"}


@app.on_event("startup")
def create_database_schema():
    last_error = None
    for _ in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except Exception as exc:  # pragma: no cover - startup retry for containerized DBs
            last_error = exc
            time.sleep(2)
    if last_error:
        raise last_error


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("products") or full_path.startswith("customers") or full_path.startswith("orders") or full_path.startswith("dashboard"):
        raise HTTPException(status_code=404, detail="Not Found")
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend not built")


app.include_router(products_router)
app.include_router(customers_router)
app.include_router(orders_router)
app.include_router(dashboard_router)
