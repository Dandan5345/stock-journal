import httpx

_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
_HEADERS = {"User-Agent": "Mozilla/5.0"}
_ALLOWED_QUOTE_TYPES = {"EQUITY", "ETF", "MUTUALFUND", "INDEX"}


def search_symbols(query: str) -> list[dict[str, str]]:
    """Proxy a ticker search to Yahoo Finance's public search endpoint."""
    if not query.strip():
        return []

    try:
        response = httpx.get(
            _SEARCH_URL,
            params={"q": query, "quotesCount": 15, "newsCount": 0, "listsCount": 0},
            headers=_HEADERS,
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return []

    quotes = response.json().get("quotes", [])
    return [
        {
            "symbol": quote.get("symbol", ""),
            "name": quote.get("shortname") or quote.get("longname") or "",
            "exchange": quote.get("exchange", ""),
            "type": quote.get("quoteType", ""),
        }
        for quote in quotes
        if quote.get("quoteType") in _ALLOWED_QUOTE_TYPES
    ]
