// MarketStats/MarketOverviewEvent.js

// Используем динамический импорт для node‑fetch (подходит для версии 3)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const logger = require('../logs/apiLogger');
require('dotenv').config({ path: __dirname + '/../config/.env' });

const API_KEY = process.env.CMC_API_KEY; // CoinMarketCap API-ключ должен быть указан в .env
if (!API_KEY) {
  logger.error("CMC_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

// Получение Fear and Greed Index
async function getFearAndGreedIndex() {
  const url = 'https://pro-api.coinmarketcap.com/v3/fearandgreed/latest';
  try {
    const res = await fetch(url, { headers: HEADERS });
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
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data && data.data.value ? data.data.value : "N/A";
  } catch (err) {
    logger.error("Error fetching CMC 100 Index: " + err.message);
    return "N/A";
  }
}

// Получение глобальных метрик (для Spot Market Capitalization и Bitcoin Dominance)
async function getGlobalMetrics() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  try {
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    logger.error("Error fetching Global Metrics: " + err.message);
    return null;
  }
}

// Основная функция получения данных Market Overview
async function getMarketOverviewData() {
  const [fearAndGreed, cmc100, globalMetrics] = await Promise.all([
    getFearAndGreedIndex(),
    getCMC100Index(),
    getGlobalMetrics()
  ]);

  // Для показателей, по которым API не предоставляет данные в бесплатном плане – используем "N/A"
  const altcoinSeason = "N/A";
  const cryptoETF = "N/A";
  const ethGas = "N/A";

  let spotMarketCap = "N/A", btcDominance = "N/A";
  if (globalMetrics) {
    // Предполагаем, что объект globalMetrics содержит поля total_market_cap и btc_dominance в валюте USD
    spotMarketCap = globalMetrics.total_market_cap && globalMetrics.total_market_cap.usd
      ? Number(globalMetrics.total_market_cap.usd).toFixed(2) + " USD"
      : "N/A";
    btcDominance = globalMetrics.btc_dominance
      ? Number(globalMetrics.btc_dominance).toFixed(2) + "%"
      : "N/A";
  }

  return {
    fear_and_greed: {
      name: "CMC Crypto Fear and Greed Index",
      value: fearAndGreed,
      chartUrl: "https://coinmarketcap.com/charts/fear-and-greed-index/"
    },
    altcoin_season: {
      name: "CMC Altcoin Season Index",
      value: altcoinSeason,
      chartUrl: "https://coinmarketcap.com/charts/altcoin-season-index/"
    },
    cmc100_index: {
      name: "CoinMarketCap 100 Index",
      value: cmc100,
      chartUrl: "https://coinmarketcap.com/charts/cmc100/"
    },
    spot_market_cap: {
      name: "Spot Market Crypto Market Cap",
      value: spotMarketCap,
      chartUrl: "https://coinmarketcap.com/charts/spot-market/"
    },
    crypto_etf_tracker: {
      name: "Cryptocurrency ETF Tracker",
      value: cryptoETF,
      chartUrl: "https://coinmarketcap.com/etf/"
    },
    bitcoin_dominance: {
      name: "Bitcoin Dominance",
      value: btcDominance,
      chartUrl: "https://coinmarketcap.com/charts/bitcoin-dominance/"
    },
    eth_gas: {
      name: "ETH Gas",
      value: ethGas,
      chartUrl: "https://coinmarketcap.com/charts/eth-gas/"
    }
  };
}

module.exports = {
  getMarketOverviewData
};
