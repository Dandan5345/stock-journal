from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TradeBase(BaseModel):
    ticker: str
    buy_price: Decimal
    quantity: int
    buy_date: date


class TradeCreate(TradeBase):
    pass


class TradeRead(TradeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
