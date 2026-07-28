from sqlalchemy.orm import Session

from app.database.models import Trade
from app.repositories import trade_repository
from app.schemas.trade import TradeCreate


def get_trades(db: Session) -> list[Trade]:
    return trade_repository.list_trades(db)


def add_trade(db: Session, trade_in: TradeCreate) -> Trade:
    return trade_repository.create_trade(db, trade_in)
