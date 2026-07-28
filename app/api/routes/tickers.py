from fastapi import APIRouter, Query

from app.schemas.ticker import TickerSearchResult
from app.services import yahoo_finance_service

router = APIRouter()


@router.get("/tickers/search", response_model=list[TickerSearchResult])
def search_tickers(q: str = Query(..., min_length=1)) -> list[TickerSearchResult]:
    return yahoo_finance_service.search_symbols(q)
