import httpx

_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
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


def _fetch_chart(symbol: str, range_: str = "1d", interval: str = "5m") -> dict | None:
    """Fetch a raw Yahoo Finance chart payload for a symbol."""
    if not symbol.strip():
        return None

    try:
        response = httpx.get(
            f"{_CHART_URL}/{symbol}",
            params={"range": range_, "interval": interval},
            headers=_HEADERS,
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    results = response.json().get("chart", {}).get("result") or []
    if not results:
        return None
    return results[0]


def get_quote(symbol: str) -> dict[str, str | float | None] | None:
    """Fetch the current market price and day change for a symbol."""
    result = _fetch_chart(symbol, range_="1d", interval="5m")
    if result is None:
        return None

    meta = result.get("meta", {})
    price = meta.get("regularMarketPrice")
    if price is None:
        return None

    previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")
    change = None
    change_percent = None
    if previous_close is not None and previous_close != 0:
        change = float(price) - float(previous_close)
        change_percent = (change / float(previous_close)) * 100

    return {
        "symbol": meta.get("symbol", symbol),
        "name": meta.get("shortName") or meta.get("longName") or "",
        "price": float(price),
        "currency": meta.get("currency", "USD"),
        "previous_close": float(previous_close) if previous_close is not None else None,
        "change": change,
        "change_percent": change_percent,
        "exchange": meta.get("exchangeName") or meta.get("fullExchangeName") or "",
    }


def get_intraday_chart(symbol: str) -> dict | None:
    """Fetch today's intraday price series plus quote metadata for charting."""
    result = _fetch_chart(symbol, range_="1d", interval="5m")
    if result is None:
        return None

    meta = result.get("meta", {})
    price = meta.get("regularMarketPrice")
    if price is None:
        return None

    previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")
    change = None
    change_percent = None
    if previous_close is not None and previous_close != 0:
        change = float(price) - float(previous_close)
        change_percent = (change / float(previous_close)) * 100

    timestamps = result.get("timestamp") or []
    closes = (
        (result.get("indicators") or {}).get("quote") or [{}]
    )[0].get("close") or []

    points: list[dict[str, float | int]] = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        points.append({"t": int(ts), "p": float(close)})

    return {
        "symbol": meta.get("symbol", symbol),
        "name": meta.get("shortName") or meta.get("longName") or "",
        "price": float(price),
        "currency": meta.get("currency", "USD"),
        "previous_close": float(previous_close) if previous_close is not None else None,
        "change": change,
        "change_percent": change_percent,
        "exchange": meta.get("exchangeName") or meta.get("fullExchangeName") or "",
        "points": points,
    }
