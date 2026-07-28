from pydantic import BaseModel


class TickerSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str


class TickerQuote(BaseModel):
    symbol: str
    name: str = ""
    price: float
    currency: str
    previous_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    exchange: str = ""


class ChartPoint(BaseModel):
    t: int
    p: float


class TickerChart(TickerQuote):
    points: list[ChartPoint]
