// ===============================
// BTC REALTIME MODULE - STATIC SAFE VERSION
// Compatible with GitHub Pages
// No API Key Required
// ===============================

const CONFIG = {
  refreshInterval: 60000,
  timeout: 10000
};

// -------- Safe Fetch --------
async function safeFetch(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(response.status);

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", url, error.message);
    return null;
  }
}

// -------- Update UI Helper --------
function setText(id, value, prefix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value !== null ? prefix + value : "--";
}

// -------- Bitcoin Core Data --------
async function loadBitcoinData() {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true&include_24hr_change=true";

  const data = await safeFetch(url);

  if (!data || !data.bitcoin) return;

  const btc = data.bitcoin;

  setText("btcPrice", btc.usd?.toLocaleString(), "$");
  setText("btcVolume", btc.usd_24h_vol?.toLocaleString(), "$");
  setText("btcMarketCap", btc.usd_market_cap?.toLocaleString(), "$");
  setText("btcChange", btc.usd_24h_change?.toFixed(2) + "%");
}

// -------- BTC Dominance --------
async function loadGlobalData() {
  const url = "https://api.coingecko.com/api/v3/global";
  const data = await safeFetch(url);

  if (!data?.data) return;

  setText(
    "btcDominance",
    data.data.market_cap_percentage?.btc?.toFixed(2) + "%"
  );
}

// -------- Fear & Greed --------
async function loadFearGreed() {
  const url = "https://api.alternative.me/fng/?limit=1";
  const data = await safeFetch(url);

  if (!data?.data?.length) return;

  setText("fearGreed", data.data[0].value);
}

// -------- Stablecoins --------
async function loadStablecoins() {
  const url = "https://stablecoins.llama.fi/stablecoins";
  const data = await safeFetch(url);

  if (!data?.peggedAssets) return;

  let total = 0;
  data.peggedAssets.forEach((s) => {
    if (s.circulating?.peggedUSD) total += s.circulating.peggedUSD;
  });

  setText("stablecoinTotal", (total / 1e9).toFixed(2) + "B USD");
}

// -------- Binance Funding --------
async function loadFundingRate() {
  const url =
    "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT";

  const data = await safeFetch(url);
  if (!data) return;

  const rate = parseFloat(data.lastFundingRate) * 100;
  setText("fundingRate", rate.toFixed(4) + "%");
}

// -------- Open Interest --------
async function loadOpenInterest() {
  const url =
    "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT";

  const data = await safeFetch(url);
  if (!data) return;

  const oi = parseFloat(data.openInterest);
  setText("openInterest", oi.toLocaleString());
}

// -------- Last Updated --------
function updateTimestamp() {
  setText("lastUpdated", new Date().toLocaleTimeString());
}

// -------- Master Loader --------
async function loadAll() {
  await Promise.all([
    loadBitcoinData(),
    loadGlobalData(),
    loadFearGreed(),
    loadStablecoins(),
    loadFundingRate(),
    loadOpenInterest()
  ]);

  updateTimestamp();
}

// -------- Init --------
loadAll();
setInterval(loadAll, CONFIG.refreshInterval);
