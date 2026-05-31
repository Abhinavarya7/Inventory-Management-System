from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas import DashboardSummary
from ...services import dashboard_summary

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def summary_route(
    db: Session = Depends(get_db),
    low_stock_threshold: int | None = Query(default=None, ge=0),
):
    return dashboard_summary(db, threshold=low_stock_threshold)

