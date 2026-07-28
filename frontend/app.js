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
const amountInput = document.getElementById("amount");
const sharesField = document.getElementById("shares-field");
const amountField = document.getElementById("amount-field");
const calcSummary = document.getElementById("calc-summary");
const buyDateInput = document.getElementById("buy-date");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const modeSharesBtn = document.getElementById("mode-shares");
const modeAmountBtn = document.getElementById("mode-amount");

const stockPreview = document.getElementById("stock-preview");
const previewSymbol = document.getElementById("preview-symbol");
const previewName = document.getElementById("preview-name");
const previewExchange = document.getElementById("preview-exchange");
const previewPrice = document.getElementById("preview-price");
const previewChange = document.getElementById("preview-change");
const previewChart = document.getElementById("preview-chart");
const chartEmpty = document.getElementById("chart-empty");

apiIndicator.textContent = `מחובר לשרת: ${API_BASE_URL}`;

/** @type {"shares" | "amount"} */
let entryMode = "shares";
let selectedQuote = null;

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

function formatPrice(value, digits = 2) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return value;
  return parsed.toFixed(digits);
}

function formatQuantity(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return value;
  if (Number.isInteger(parsed)) return String(parsed);
  return parsed.toFixed(6).replace(/\.?0+$/, "");
}

function formatMoney(value, currency = "USD") {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return String(value);
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch (_) {
    return `${formatPrice(parsed)} ${currency}`;
  }
}

function setEntryMode(mode) {
  entryMode = mode;
  modeSharesBtn.classList.toggle("is-active", mode === "shares");
  modeAmountBtn.classList.toggle("is-active", mode === "amount");
  sharesField.hidden = mode !== "shares";
  amountField.hidden = mode !== "amount";
  updateCalcSummary();
}

function getUnitPrice() {
  const price = parseFloat(buyPriceInput.value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function updateCalcSummary() {
  const unitPrice = getUnitPrice();
  const currency = selectedQuote?.currency || "USD";

  if (!unitPrice) {
    calcSummary.hidden = true;
    calcSummary.textContent = "";
    return;
  }

  if (entryMode === "shares") {
    const shares = parseFloat(quantityInput.value);
    if (!Number.isFinite(shares) || shares <= 0) {
      calcSummary.hidden = true;
      calcSummary.textContent = "";
      return;
    }
    const total = shares * unitPrice;
    calcSummary.hidden = false;
    calcSummary.innerHTML =
      `סה״כ לתשלום: <strong>${formatMoney(total, currency)}</strong>` +
      `<span class="calc-detail">${formatQuantity(shares)} × ${formatMoney(unitPrice, currency)}</span>`;
    return;
  }

  const amount = parseFloat(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    calcSummary.hidden = true;
    calcSummary.textContent = "";
    return;
  }
  const shares = amount / unitPrice;
  calcSummary.hidden = false;
  calcSummary.innerHTML =
    `כמות מניות: <strong>${formatQuantity(shares)}</strong>` +
    `<span class="calc-detail">${formatMoney(amount, currency)} ÷ ${formatMoney(unitPrice, currency)}</span>`;
}

function hideStockPreview() {
  stockPreview.hidden = true;
  selectedQuote = null;
  previewChart.innerHTML = "";
  chartEmpty.hidden = true;
}

function renderChart(points, previousClose) {
  previewChart.innerHTML = "";
  chartEmpty.hidden = true;

  if (!points || points.length < 2) {
    chartEmpty.hidden = false;
    return;
  }

  const width = 640;
  const height = 160;
  const padX = 8;
  const padY = 12;
  const prices = points.map((point) => point.p);
  let min = Math.min(...prices);
  let max = Math.max(...prices);
  if (previousClose != null) {
    min = Math.min(min, previousClose);
    max = Math.max(max, previousClose);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const xAt = (index) =>
    padX + (index / (points.length - 1)) * (width - padX * 2);
  const yAt = (price) =>
    padY + ((max - price) / (max - min)) * (height - padY * 2);

  const path = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xAt(index).toFixed(2)} ${yAt(point.p).toFixed(2)}`;
    })
    .join(" ");

  const lastY = yAt(points[points.length - 1].p);
  const areaPath =
    `${path} L${xAt(points.length - 1).toFixed(2)} ${height - padY}` +
    ` L${xAt(0).toFixed(2)} ${height - padY} Z`;

  const isUp =
    previousClose == null
      ? points[points.length - 1].p >= points[0].p
      : points[points.length - 1].p >= previousClose;
  const stroke = isUp ? "#16a34a" : "#dc2626";
  const fill = isUp ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)";

  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", areaPath);
  area.setAttribute("fill", fill);
  area.setAttribute("stroke", "none");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", "2.5");
  line.setAttribute("stroke-linejoin", "round");
  line.setAttribute("stroke-linecap", "round");

  previewChart.append(area, line);

  if (previousClose != null) {
    const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const y = yAt(previousClose);
    baseline.setAttribute("x1", String(padX));
    baseline.setAttribute("x2", String(width - padX));
    baseline.setAttribute("y1", String(y));
    baseline.setAttribute("y2", String(y));
    baseline.setAttribute("stroke", "currentColor");
    baseline.setAttribute("stroke-opacity", "0.25");
    baseline.setAttribute("stroke-dasharray", "4 4");
    previewChart.appendChild(baseline);
  }

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("cx", String(xAt(points.length - 1)));
  dot.setAttribute("cy", String(lastY));
  dot.setAttribute("r", "4");
  dot.setAttribute("fill", stroke);
  previewChart.appendChild(dot);
}

function showStockPreview(chart) {
  selectedQuote = chart;
  previewSymbol.textContent = chart.symbol;
  previewName.textContent = chart.name || "—";
  previewExchange.textContent = chart.exchange || "";
  previewPrice.textContent = formatMoney(chart.price, chart.currency || "USD");

  const change = chart.change;
  const changePercent = chart.change_percent;
  if (change == null || changePercent == null) {
    previewChange.textContent = "";
    previewChange.className = "preview-change";
  } else {
    const sign = change >= 0 ? "+" : "";
    previewChange.textContent =
      `${sign}${formatPrice(change)} (${sign}${formatPrice(changePercent)}%)`;
    previewChange.className =
      "preview-change " + (change >= 0 ? "is-up" : "is-down");
  }

  renderChart(chart.points || [], chart.previous_close);
  stockPreview.hidden = false;
  stockPreview.classList.remove("is-entering");
  // Force reflow so the enter animation replays on each selection.
  void stockPreview.offsetWidth;
  stockPreview.classList.add("is-entering");
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
    quantityCell.textContent = formatQuantity(trade.quantity);

    const totalCell = document.createElement("td");
    const total = parseFloat(trade.buy_price) * parseFloat(trade.quantity);
    totalCell.textContent = Number.isFinite(total) ? formatPrice(total) : "—";

    const dateCell = document.createElement("td");
    dateCell.textContent = trade.buy_date;

    row.append(tickerCell, priceCell, quantityCell, totalCell, dateCell);
    tradesBody.appendChild(row);
  }
}

// --- Ticker autocomplete (backed by the /tickers/search endpoint, which
// proxies Yahoo Finance) ---

let suggestionItems = [];
let activeSuggestionIndex = -1;
let debounceTimer = null;
let latestRequestId = 0;
let latestPreviewRequestId = 0;

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
  loadStockPreview(result.symbol);
}

async function loadStockPreview(symbol) {
  const requestId = ++latestPreviewRequestId;
  const originalPlaceholder = buyPriceInput.placeholder;
  buyPriceInput.placeholder = "טוען מחיר...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${encodeURIComponent(symbol)}/chart`
    );
    if (!response.ok) return;
    const chart = await response.json();
    if (requestId !== latestPreviewRequestId) return;

    buyPriceInput.value = formatPrice(chart.price);
    showStockPreview(chart);
    updateCalcSummary();
  } catch (err) {
    // Preview is a convenience — leave the form usable for manual entry.
  } finally {
    if (requestId === latestPreviewRequestId) {
      buyPriceInput.placeholder = originalPlaceholder;
    }
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
    hideStockPreview();
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

modeSharesBtn.addEventListener("click", () => setEntryMode("shares"));
modeAmountBtn.addEventListener("click", () => setEntryMode("amount"));
quantityInput.addEventListener("input", updateCalcSummary);
amountInput.addEventListener("input", updateCalcSummary);
buyPriceInput.addEventListener("input", updateCalcSummary);

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
  const buyPrice = parseFloat(buyPriceInput.value);
  const buyDate = buyDateInput.value;
  let quantity;

  if (!ticker) {
    showFormError("יש להזין טיקר.");
    return;
  }
  if (!Number.isFinite(buyPrice) || buyPrice < 0) {
    showFormError("יש להזין מחיר קנייה תקין.");
    return;
  }

  if (entryMode === "shares") {
    quantity = parseFloat(quantityInput.value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showFormError("יש להזין כמות מניות תקינה (גדולה מ־0).");
      return;
    }
  } else {
    const amount = parseFloat(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      showFormError("יש להזין סכום כסף תקין (גדול מ־0).");
      return;
    }
    if (buyPrice === 0) {
      showFormError("לא ניתן לחשב כמות כשמחיר המניה הוא 0.");
      return;
    }
    quantity = amount / buyPrice;
  }

  if (!buyDate) {
    showFormError("יש להזין תאריך קנייה.");
    return;
  }

  const payload = {
    ticker,
    buy_price: buyPrice,
    quantity: Number(quantity.toFixed(6)),
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
    setEntryMode("shares");
    hideStockPreview();
    calcSummary.hidden = true;
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
setEntryMode("shares");
loadTrades();
