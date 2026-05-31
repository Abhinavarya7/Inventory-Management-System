from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas import OrderCreate, OrderRead
from ...services import cancel_order, create_order, get_order, list_orders

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderRead, status_code=201)
def create_order_route(payload: OrderCreate, db: Session = Depends(get_db)):
    return create_order(db, payload)


@router.get("", response_model=list[OrderRead])
def list_orders_route(db: Session = Depends(get_db)):
    return list_orders(db)


@router.get("/{order_id}", response_model=OrderRead)
def get_order_route(order_id: int, db: Session = Depends(get_db)):
    return get_order(db, order_id)


@router.delete("/{order_id}", response_model=OrderRead)
def cancel_order_route(order_id: int, db: Session = Depends(get_db)):
    return cancel_order(db, order_id)

