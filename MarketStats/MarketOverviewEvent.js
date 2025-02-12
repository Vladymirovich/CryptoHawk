// MarketStats/MarketOverviewEvent.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');

const API_KEY = process.env.CMC_API_KEY;
if (!API_KEY) {
  logger.error("CMC_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

// Используем динамический импорт для node‑fetch (v3)
const fetchWrapper = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Получение глобальных метрик
async function getGlobalMetrics() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  try {
    const res = await fetchWrapper(url, { headers: HEADERS });
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    logger.error("Error fetching Global Metrics: " + err.message);
    return null;
  }
}

// Получение Fear and Greed Index
async function getFearAndGreedIndex() {
  const url = 'https://pro-api.coinmarketcap.com/v3/fearandgreed/latest';
  try {
    const res = await fetchWrapper(url, { headers: HEADERS });
    const data = await res.json();
    return data.data && data.data.value ? data.data.value : "N/A";
  } catch (err) {
    logger.error("Error fetching Fear and Greed Index: " + err.message);
    return "N/A";
  }
}

// Получение CMC 100 Index
async function getCMC100Index() {
  const url = 'https://pro-api.coinmarketcap.com/v3/index/cmc100/latest';
  try {
    const res = await fetchWrapper(url, { headers: HEADERS });
    const data = await res.json();
    return data.data && data.data.value ? data.data.value : "N/A";
  } catch (err) {
    logger.error("Error fetching CMC 100 Index: " + err.message);
    return "N/A";
  }
}

// Получение ETH Gas (функция‑заглушка, поскольку бесплатный план не предоставляет эти данные)
async function getEthGas() {
  // Здесь можно интегрировать сторонний API (например, Etherscan) для получения актуальных данных.
  // Для демонстрации возвращаем смоделированные данные.
  return { value: "50 Gwei", change: "2.50" };
}

// Функция форматирования большого числа в компактное значение (например, 3.12T)
function formatMarketCap(value) {
  const num = Number(value);
  if (isNaN(num)) return "N/A";
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + "T";
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  } else {
    return num.toFixed(2);
  }
}

// Основная функция получения данных для Market Overview
async function getMarketOverviewData() {
  const [globalMetrics, fearAndGreed, cmc100, ethGasData] = await Promise.all([
    getGlobalMetrics(),
    getFearAndGreedIndex(),
    getCMC100Index(),
    getEthGas()
  ]);

  // Обработка данных Dominance из globalMetrics
  let btc_current = "N/A", eth_current = "N/A", btc_change = "N/A", eth_change = "N/A";
  if (globalMetrics) {
    btc_current = globalMetrics.btc_dominance ? Number(globalMetrics.btc_dominance).toFixed(2) : "N/A";
    eth_current = globalMetrics.eth_dominance ? Number(globalMetrics.eth_dominance).toFixed(2) : "N/A";
    btc_change = globalMetrics.btc_dominance_24h_percentage_change
      ? Math.abs(Number(globalMetrics.btc_dominance_24h_percentage_change)).toFixed(2)
      : "N/A";
    eth_change = globalMetrics.eth_dominance_24h_percentage_change
      ? Math.abs(Number(globalMetrics.eth_dominance_24h_percentage_change)).toFixed(2)
      : "N/A";
  }
  let others_current = "N/A", others_change = "N/A";
  if (btc_current !== "N/A" && eth_current !== "N/A") {
    others_current = (100 - Number(btc_current) - Number(eth_current)).toFixed(2);
    if (btc_change !== "N/A" && eth_change !== "N/A") {
      others_change = ((Number(btc_change) + Number(eth_change)) / 2).toFixed(2);
    }
  }

  // Обработка Spot Market Cap
  let spotMarketCap = "N/A";
  if (
    globalMetrics &&
    globalMetrics.quote &&
    globalMetrics.quote.USD &&
    globalMetrics.quote.USD.total_market_cap
  ) {
    spotMarketCap = formatMarketCap(globalMetrics.quote.USD.total_market_cap);
  }

  // Для Altcoin Season и Cryptocurrency ETF Tracker нет данных в бесплатном плане
  const altcoin_season = "N/A";
  const crypto_etf = "N/A";

  // Формируем массив событий
  const events = [];

  // 1. Dominance
  events.push({
    key: "dominance",
    name: "Dominance",
    text: `**Dominance**\nBitcoin: ${btc_current}% (Change: ${btc_change}%)\nEthereum: ${eth_current}% (Change: ${eth_change}%)\nOthers: ${others_current}% (Change: ${others_change}%)`,
    image: "https://coinmarketcap.com/charts/bitcoin-dominance/?w=250&h=150"
  });

  // 2. CMC Crypto Fear and Greed Index
  events.push({
    key: "fear_and_greed",
    name: "CMC Crypto Fear and Greed Index",
    text: `**CMC Crypto Fear and Greed Index**\nValue: ${fearAndGreed}`,
    image: "https://coinmarketcap.com/charts/fear-and-greed-index/?w=250&h=150"
  });

  // 3. CMC Altcoin Season Index
  events.push({
    key: "altcoin_season",
    name: "CMC Altcoin Season Index",
    text: `**CMC Altcoin Season Index**\nValue: ${altcoin_season}`,
    image: "https://coinmarketcap.com/charts/altcoin-season-index/?w=250&h=150"
  });

  // 4. CoinMarketCap 100 Index
  events.push({
    key: "cmc100_index",
    name: "CoinMarketCap 100 Index",
    text: `**CoinMarketCap 100 Index**\nValue: ${cmc100}`,
    image: "https://coinmarketcap.com/charts/cmc100/?w=250&h=150"
  });

  // 5. Spot Market Crypto Market Cap
  events.push({
    key: "spot_market_cap",
    name: "Spot Market Crypto Market Cap",
    text: `**Spot Market Crypto Market Cap**\nValue: ${spotMarketCap}`,
    image: "https://coinmarketcap.com/charts/spot-market/?w=250&h=150"
  });

  // 6. Cryptocurrency ETF Tracker
  events.push({
    key: "crypto_etf_tracker",
    name: "Cryptocurrency ETF Tracker",
    text: `**Cryptocurrency ETF Tracker**\nValue: ${crypto_etf}`,
    image: "https://coinmarketcap.com/etf/?w=250&h=150"
  });

  // 7. ETH Gas
  events.push({
    key: "eth_gas",
    name: "ETH Gas",
    text: `**ETH Gas**\nValue: ${ethGasData.value} (Change: ${ethGasData.change}%)`,
    image: "https://coinmarketcap.com/charts/eth-gas/?w=250&h=150"
  });

  return events;
}

module.exports = {
  getMarketOverviewData
};
