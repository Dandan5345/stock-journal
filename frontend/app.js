// Base URL of the FastAPI backend. Resolved once at load time: a `?api=`
// query param wins (and is remembered), then a previously remembered value,
// then localhost for local development. This lets the same static page
// (e.g. deployed on GitHub Pages) point at a Cloudflare Tunnel URL without
// editing code — useful since Quick Tunnel URLs change on every restart.
function resolveApiBaseUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  if (fromQuery) {
    localStorage.setItem("apiBaseUrl", fromQuery);
    return fromQuery;
  }
  return localStorage.getItem("apiBaseUrl") || "http://localhost:8000";
}

const API_BASE_URL = resolveApiBaseUrl();

const tradesTable = document.getElementById("trades-table");
const tradesBody = document.getElementById("trades-body");
const statusMessage = document.getElementById("status-message");
const emptyMessage = document.getElementById("empty-message");
const apiIndicator = document.getElementById("api-indicator");

const tradeForm = document.getElementById("trade-form");
const tickerInput = document.getElementById("ticker");
const tickerSuggestions = document.getElementById("ticker-suggestions");
const buyPriceInput = document.getElementById("buy-price");
const quantityInput = document.getElementById("quantity");
const buyDateInput = document.getElementById("buy-date");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

apiIndicator.textContent = `מחובר לשרת: ${API_BASE_URL}`;

/** Default the date field to today, in local time. */
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  buyDateInput.value = `${yyyy}-${mm}-${dd}`;
}

function showStatus(text, isError) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle("is-error", Boolean(isError));
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.classList.remove("is-error");
}

function showFormError(text) {
  formError.textContent = text;
  formError.hidden = !text;
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.querySelector(".btn-label").textContent = isSubmitting
    ? "שולח..."
    : "הוספת עסקה";
}

function formatPrice(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return value;
  return parsed.toFixed(2);
}

function renderTrades(trades) {
  tradesBody.innerHTML = "";

  if (!trades || trades.length === 0) {
    tradesTable.hidden = true;
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;
  tradesTable.hidden = false;

  for (const trade of trades) {
    const row = document.createElement("tr");

    const tickerCell = document.createElement("td");
    tickerCell.className = "ticker-cell";
    tickerCell.textContent = (trade.ticker || "").toUpperCase();

    const priceCell = document.createElement("td");
    priceCell.textContent = formatPrice(trade.buy_price);

    const quantityCell = document.createElement("td");
    quantityCell.textContent = trade.quantity;

    const dateCell = document.createElement("td");
    dateCell.textContent = trade.buy_date;

    row.append(tickerCell, priceCell, quantityCell, dateCell);
    tradesBody.appendChild(row);
  }
}

// --- Ticker autocomplete (backed by the /tickers/search endpoint, which
// proxies Yahoo Finance) ---

let suggestionItems = [];
let activeSuggestionIndex = -1;
let debounceTimer = null;
let latestRequestId = 0;

function hideSuggestions() {
  tickerSuggestions.hidden = true;
  tickerSuggestions.innerHTML = "";
  suggestionItems = [];
  activeSuggestionIndex = -1;
}

function renderSuggestions(results) {
  suggestionItems = results;
  activeSuggestionIndex = -1;
  tickerSuggestions.innerHTML = "";

  if (results.length === 0) {
    hideSuggestions();
    return;
  }

  for (const result of results) {
    const li = document.createElement("li");

    const symbolSpan = document.createElement("span");
    symbolSpan.className = "suggestion-symbol";
    symbolSpan.textContent = result.symbol;

    const metaSpan = document.createElement("span");
    metaSpan.className = "suggestion-meta";
    metaSpan.textContent = [result.name, result.exchange].filter(Boolean).join(" · ");

    li.append(symbolSpan, metaSpan);
    li.addEventListener("mousedown", (event) => {
      // mousedown (not click) fires before the input's blur hides the list
      event.preventDefault();
      selectSuggestion(result);
    });

    tickerSuggestions.appendChild(li);
  }

  tickerSuggestions.hidden = false;
}

function selectSuggestion(result) {
  tickerInput.value = result.symbol;
  hideSuggestions();
  fillLivePrice(result.symbol);
}

async function fillLivePrice(symbol) {
  const originalPlaceholder = buyPriceInput.placeholder;
  buyPriceInput.placeholder = "טוען מחיר...";
  try {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${encodeURIComponent(symbol)}/quote`
    );
    if (!response.ok) return;
    const quote = await response.json();
    buyPriceInput.value = quote.price.toFixed(2);
  } catch (err) {
    // Live price is a convenience default — leave the field for manual entry.
  } finally {
    buyPriceInput.placeholder = originalPlaceholder;
  }
}

function highlightSuggestion(index) {
  const items = tickerSuggestions.querySelectorAll("li");
  items.forEach((item, i) => item.classList.toggle("is-active", i === index));
  if (items[index]) {
    items[index].scrollIntoView({ block: "nearest" });
  }
}

async function fetchTickerSuggestions(query) {
  const requestId = ++latestRequestId;
  try {
    const response = await fetch(
      `${API_BASE_URL}/tickers/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) return;
    const results = await response.json();
    if (requestId !== latestRequestId) return; // a newer request already landed
    renderSuggestions(results);
  } catch (err) {
    // Silently ignore — autocomplete is a convenience, not critical path.
  }
}

tickerInput.addEventListener("input", () => {
  const query = tickerInput.value.trim();
  clearTimeout(debounceTimer);

  if (!query) {
    hideSuggestions();
    return;
  }

  debounceTimer = setTimeout(() => fetchTickerSuggestions(query), 300);
});

tickerInput.addEventListener("keydown", (event) => {
  if (tickerSuggestions.hidden || suggestionItems.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
    highlightSuggestion(activeSuggestionIndex);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeSuggestionIndex =
      (activeSuggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
    highlightSuggestion(activeSuggestionIndex);
  } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    selectSuggestion(suggestionItems[activeSuggestionIndex]);
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});

tickerInput.addEventListener("blur", () => {
  // Delay so a mousedown-driven selection above still registers first.
  setTimeout(hideSuggestions, 100);
});

async function loadTrades() {
  showStatus("טוען...", false);
  tradesTable.hidden = true;
  emptyMessage.hidden = true;

  try {
    const response = await fetch(`${API_BASE_URL}/trades`);

    if (!response.ok) {
      throw new Error(`השרת החזיר שגיאה (${response.status})`);
    }

    const trades = await response.json();
    clearStatus();
    renderTrades(trades);
  } catch (err) {
    renderTrades([]);
    showStatus(
      "לא ניתן לטעון את העסקאות. ודאו שהשרת פועל בכתובת " +
        API_BASE_URL +
        " ונסו לרענן.",
      true
    );
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  showFormError("");

  const ticker = tickerInput.value.trim().toUpperCase();
  const buyPrice = buyPriceInput.value;
  const quantity = quantityInput.value;
  const buyDate = buyDateInput.value;

  if (!ticker) {
    showFormError("יש להזין טיקר.");
    return;
  }
  if (buyPrice === "" || parseFloat(buyPrice) < 0) {
    showFormError("יש להזין מחיר קנייה תקין.");
    return;
  }
  if (quantity === "" || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    showFormError("יש להזין כמות תקינה (מספר שלם, לפחות 1).");
    return;
  }
  if (!buyDate) {
    showFormError("יש להזין תאריך קנייה.");
    return;
  }

  const payload = {
    ticker,
    buy_price: parseFloat(buyPrice),
    quantity: parseInt(quantity, 10),
    buy_date: buyDate,
  };

  setSubmitting(true);

  try {
    const response = await fetch(`${API_BASE_URL}/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errBody = await response.json();
        detail = errBody && errBody.detail ? ` (${JSON.stringify(errBody.detail)})` : "";
      } catch (_) {
        // ignore body parse failure
      }
      throw new Error(`שמירת העסקה נכשלה (${response.status})${detail}`);
    }

    tradeForm.reset();
    setDefaultDate();
    await loadTrades();
  } catch (err) {
    showFormError(
      "אירעה שגיאה בשמירת העסקה. ודאו שהשרת פועל ונסו שוב."
    );
  } finally {
    setSubmitting(false);
  }
}

tradeForm.addEventListener("submit", handleSubmit);

setDefaultDate();
loadTrades();
