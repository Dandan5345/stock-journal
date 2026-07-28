from sqlalchemy.orm import Session

from app.database.models import Trade
from app.schemas.trade import TradeCreate


def list_trades(db: Session) -> list[Trade]:
    return db.query(Trade).order_by(Trade.buy_date.desc(), Trade.id.desc()).all()


def create_trade(db: Session, trade_in: TradeCreate) -> Trade:
    trade = Trade(**trade_in.model_dump())
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade
