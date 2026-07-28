from pydantic import BaseModel


class TickerSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str
