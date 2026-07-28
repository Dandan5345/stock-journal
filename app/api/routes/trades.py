from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.trade import TradeCreate, TradeRead
from app.services import trade_service

router = APIRouter()


@router.get("/trades", response_model=list[TradeRead])
def list_trades(db: Session = Depends(get_db)) -> list[TradeRead]:
    return trade_service.get_trades(db)


@router.post("/trades", response_model=TradeRead, status_code=status.HTTP_201_CREATED)
def create_trade(trade_in: TradeCreate, db: Session = Depends(get_db)) -> TradeRead:
    return trade_service.add_trade(db, trade_in)
