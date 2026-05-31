from __future__ import annotations

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Customer, Order, OrderItem, Product
from .schemas import (
    CustomerCreate,
    CustomerRead,
    DashboardSummary,
    OrderCreate,
    OrderRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
from .services import (
    cancel_order,
    create_customer,
    create_order,
    create_product,
    dashboard_summary,
    delete_customer,
    delete_product,
    get_customer,
    get_order,
    get_product,
    list_customers,
    list_orders,
    list_products,
    update_product,
)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory & Order Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "inventory-order-api"}


@app.post("/products", response_model=ProductRead, status_code=201)
def api_create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, payload)


@app.get("/products", response_model=list[ProductRead])
def api_list_products(db: Session = Depends(get_db)):
    return list_products(db)


@app.get("/products/{product_id}", response_model=ProductRead)
def api_get_product(product_id: int, db: Session = Depends(get_db)):
    return get_product(db, product_id)


@app.put("/products/{product_id}", response_model=ProductRead)
def api_update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    return update_product(db, product_id, payload)


@app.delete("/products/{product_id}", status_code=204)
def api_delete_product(product_id: int, db: Session = Depends(get_db)):
    delete_product(db, product_id)


@app.post("/customers", response_model=CustomerRead, status_code=201)
def api_create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    return create_customer(db, payload)


@app.get("/customers", response_model=list[CustomerRead])
def api_list_customers(db: Session = Depends(get_db)):
    return list_customers(db)


@app.get("/customers/{customer_id}", response_model=CustomerRead)
def api_get_customer(customer_id: int, db: Session = Depends(get_db)):
    return get_customer(db, customer_id)


@app.delete("/customers/{customer_id}", status_code=204)
def api_delete_customer(customer_id: int, db: Session = Depends(get_db)):
    delete_customer(db, customer_id)


@app.post("/orders", response_model=OrderRead, status_code=201)
def api_create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    return create_order(db, payload)


@app.get("/orders", response_model=list[OrderRead])
def api_list_orders(db: Session = Depends(get_db)):
    return list_orders(db)


@app.get("/orders/{order_id}", response_model=OrderRead)
def api_get_order(order_id: int, db: Session = Depends(get_db)):
    return get_order(db, order_id)


@app.delete("/orders/{order_id}", response_model=OrderRead)
def api_cancel_order(order_id: int, db: Session = Depends(get_db)):
    return cancel_order(db, order_id)


@app.get("/dashboard/summary", response_model=DashboardSummary)
def api_dashboard_summary(
    db: Session = Depends(get_db),
    low_stock_threshold: int | None = Query(default=None, ge=0),
):
    return dashboard_summary(db, threshold=low_stock_threshold)
