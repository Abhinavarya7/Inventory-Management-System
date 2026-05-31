from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas import ProductCreate, ProductRead, ProductUpdate
from ...services import create_product, delete_product, get_product, list_products, update_product

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", response_model=ProductRead, status_code=201)
def create_product_route(payload: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, payload)


@router.get("", response_model=list[ProductRead])
def list_products_route(db: Session = Depends(get_db)):
    return list_products(db)


@router.get("/{product_id}", response_model=ProductRead)
def get_product_route(product_id: int, db: Session = Depends(get_db)):
    return get_product(db, product_id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product_route(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    return update_product(db, product_id, payload)


@router.delete("/{product_id}", status_code=204)
def delete_product_route(product_id: int, db: Session = Depends(get_db)):
    delete_product(db, product_id)

