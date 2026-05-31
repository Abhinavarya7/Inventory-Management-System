from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas import CustomerCreate, CustomerRead
from ...services import create_customer, delete_customer, get_customer, list_customers

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerRead, status_code=201)
def create_customer_route(payload: CustomerCreate, db: Session = Depends(get_db)):
    return create_customer(db, payload)


@router.get("", response_model=list[CustomerRead])
def list_customers_route(db: Session = Depends(get_db)):
    return list_customers(db)


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer_route(customer_id: int, db: Session = Depends(get_db)):
    return get_customer(db, customer_id)


@router.delete("/{customer_id}", status_code=204)
def delete_customer_route(customer_id: int, db: Session = Depends(get_db)):
    delete_customer(db, customer_id)

