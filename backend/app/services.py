from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .models import Customer, Order, OrderItem, Product
from .schemas import CustomerCreate, OrderCreate, ProductCreate, ProductUpdate
from .settings import low_stock_threshold


def _not_found(entity: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{entity} not found")


def create_product(db: Session, payload: ProductCreate) -> Product:
    existing = db.scalar(select(Product).where(Product.sku == payload.sku))
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        price=payload.price,
        quantity_in_stock=payload.quantity_in_stock,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def list_products(db: Session) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.created_at.desc())))


def get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise _not_found("Product")
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    if payload.sku and payload.sku != product.sku:
        duplicate = db.scalar(select(Product).where(Product.sku == payload.sku, Product.id != product_id))
        if duplicate:
            raise HTTPException(status_code=400, detail="SKU already exists")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    linked_order = db.scalar(select(OrderItem.id).where(OrderItem.product_id == product_id).limit(1))
    if linked_order:
        raise HTTPException(status_code=400, detail="Cannot delete a product that is referenced by orders")

    db.delete(product)
    db.commit()


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    existing = db.scalar(select(Customer).where(Customer.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    customer = Customer(
        full_name=payload.full_name,
        email=payload.email,
        phone_number=payload.phone_number,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(db: Session) -> list[Customer]:
    return list(db.scalars(select(Customer).order_by(Customer.created_at.desc())))


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise _not_found("Customer")
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    linked_order = db.scalar(select(Order.id).where(Order.customer_id == customer_id).limit(1))
    if linked_order:
        raise HTTPException(status_code=400, detail="Cannot delete a customer that has orders")

    db.delete(customer)
    db.commit()


def _group_order_items(items: list[dict]) -> dict[int, int]:
    grouped: dict[int, int] = defaultdict(int)
    for item in items:
        grouped[int(item["product_id"])] += int(item["quantity"])
    return dict(grouped)


def create_order(db: Session, payload: OrderCreate) -> Order:
    customer = get_customer(db, payload.customer_id)
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    grouped_items = _group_order_items([item.model_dump() for item in payload.items])
    product_ids = list(grouped_items.keys())
    products = list(db.scalars(select(Product).where(Product.id.in_(product_ids))))

    if len(products) != len(product_ids):
        found_ids = {product.id for product in products}
        missing = [product_id for product_id in product_ids if product_id not in found_ids]
        raise HTTPException(status_code=400, detail=f"Unknown product id(s): {missing}")

    product_map = {product.id: product for product in products}
    for product_id, quantity in grouped_items.items():
        product = product_map[product_id]
        if product.quantity_in_stock < quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {product.name} (available {product.quantity_in_stock})",
            )

    order = Order(customer_id=customer.id, total_amount=Decimal("0.00"), status="active")
    db.add(order)
    db.flush()

    total_amount = Decimal("0.00")
    for product_id, quantity in grouped_items.items():
        product = product_map[product_id]
        line_total = Decimal(product.price) * quantity
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=product.price,
            line_total=line_total,
        )
        product.quantity_in_stock -= quantity
        total_amount += line_total
        db.add(order_item)

    order.total_amount = total_amount
    db.commit()

    return get_order(db, order.id)


def list_orders(db: Session) -> list[Order]:
    statement = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
    )
    return list(db.scalars(statement))


def get_order(db: Session, order_id: int) -> Order:
    statement = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .where(Order.id == order_id)
    )
    order = db.scalar(statement)
    if not order:
        raise _not_found("Order")
    return order


def cancel_order(db: Session, order_id: int) -> Order:
    order = get_order(db, order_id)
    if order.status == "cancelled":
        return order

    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.quantity_in_stock += item.quantity
    order.status = "cancelled"
    db.commit()
    return get_order(db, order.id)


def dashboard_summary(db: Session, threshold: int | None = None) -> dict:
    stock_threshold = low_stock_threshold() if threshold is None else threshold
    total_products = db.scalar(select(func.count()).select_from(Product)) or 0
    total_customers = db.scalar(select(func.count()).select_from(Customer)) or 0
    total_orders = db.scalar(select(func.count()).select_from(Order)) or 0
    low_stock_products = list(
        db.scalars(
            select(Product)
            .where(Product.quantity_in_stock <= stock_threshold)
            .order_by(Product.quantity_in_stock.asc(), Product.name.asc())
        )
    )

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_threshold": stock_threshold,
        "low_stock_products": low_stock_products,
    }
