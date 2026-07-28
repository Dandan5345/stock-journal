from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.ticker import TickerChart, TickerQuote, TickerSearchResult
from app.services import yahoo_finance_service

router = APIRouter()


@router.get("/tickers/search", response_model=list[TickerSearchResult])
def search_tickers(q: str = Query(..., min_length=1)) -> list[TickerSearchResult]:
    return yahoo_finance_service.search_symbols(q)


@router.get("/tickers/{symbol}/quote", response_model=TickerQuote)
def get_ticker_quote(symbol: str) -> TickerQuote:
    quote = yahoo_finance_service.get_quote(symbol)
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quote found for '{symbol}'",
        )
    return quote


@router.get("/tickers/{symbol}/chart", response_model=TickerChart)
def get_ticker_chart(symbol: str) -> TickerChart:
    chart = yahoo_finance_service.get_intraday_chart(symbol)
    if chart is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No chart found for '{symbol}'",
        )
    return chart
