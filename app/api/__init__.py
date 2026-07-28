from fastapi import APIRouter

from app.api.routes import health, tickers, trades

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(trades.router, tags=["trades"])
api_router.include_router(tickers.router, tags=["tickers"])
