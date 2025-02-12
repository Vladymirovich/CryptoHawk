// MarketStats/MarketOverviewEvent.js
// Используем динамический импорт для node‑fetch, чтобы избежать ошибки ESM
const logger = require('../logs/apiLogger');
require('dotenv').config({ path: __dirname + '/../config/.env' });

const API_KEY = process.env.CMC_API_KEY; // Ваш API‑ключ CoinMarketCap
if (!API_KEY) {
  logger.error("CMC_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

// Динамический импорт fetch (поддержка node‑fetch v3)
const getFetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getFearAndGreedIndex() {
  const url = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest';
  try {
    const res = await getFetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data && data.data.value ? data.data.value : "N/A";
  } catch (err) {
    logger.error("Error fetching Fear and Greed Index: " + err.message);
    return "N/A";
  }
}

async function getCMC100Index() {
  const url = 'https://pro-api.coinmarketcap.com/v3/index/cmc100/latest';
  try {
    const res = await getFetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data && data.data.value ? data.data.value : "N/A";
  } catch (err) {
    logger.error("Error fetching CMC 100 Index: " + err.message);
    return "N/A";
  }
}

async function getGlobalMetrics() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  try {
    const res = await getFetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    logger.error("Error fetching Global Metrics: " + err.message);
    return null;
  }
}

async function getMarketOverviewData() {
  const [fearAndGreed, cmc100, globalMetrics] = await Promise.all([
    getFearAndGreedIndex(),
    getCMC100Index(),
    getGlobalMetrics()
  ]);

  // Для данных, по которым бесплатный план не предоставляет информацию
  const altcoinSeason = "N/A";
  const cryptoETF = "N/A";
  const ethGas = "N/A";

  let spotMarketCap = "N/A", btcDominance = "N/A", ethDominance = "N/A", othersDominance = "N/A";
  if (globalMetrics && globalMetrics.quote && globalMetrics.quote.USD) {
    spotMarketCap = globalMetrics.quote.USD.total_market_cap
      ? Number(globalMetrics.quote.USD.total_market_cap).toFixed(2) + " USD"
      : "N/A";
    btcDominance = globalMetrics.btc_dominance
      ? Number(globalMetrics.btc_dominance).toFixed(2) + "%"
      : "N/A";
    ethDominance = globalMetrics.eth_dominance
      ? Number(globalMetrics.eth_dominance).toFixed(2) + "%"
      : "N/A";
    if (globalMetrics.btc_dominance && globalMetrics.eth_dominance) {
      const others = 100 - (Number(globalMetrics.btc_dominance) + Number(globalMetrics.eth_dominance));
      othersDominance = others.toFixed(2) + "%";
    }
  }

  return {
    dominance: {
      name: "Dominance",
      value: `Bitcoin: ${btcDominance} (Change: N/A)\nEthereum: ${ethDominance} (Change: N/A)\nOthers: ${othersDominance} (Change: N/A)`,
      chartUrl: "https://coinmarketcap.com/charts/bitcoin-dominance/?w=250&h=150"
    },
    fear_and_greed: {
      name: "CMC Crypto Fear and Greed Index",
      value: fearAndGreed,
      chartUrl: "https://coinmarketcap.com/charts/fear-and-greed-index/?w=250&h=150"
    },
    altcoin_season: {
      name: "CMC Altcoin Season Index",
      value: altcoinSeason,
      chartUrl: "https://coinmarketcap.com/charts/altcoin-season-index/?w=250&h=150"
    },
    cmc100_index: {
      name: "CoinMarketCap 100 Index",
      value: cmc100,
      chartUrl: "https://coinmarketcap.com/charts/cmc100/?w=250&h=150"
    },
    spot_market_cap: {
      name: "Spot Market Crypto Market Cap",
      value: spotMarketCap,
      chartUrl: "https://coinmarketcap.com/charts/spot-market/?w=250&h=150"
    },
    crypto_etf_tracker: {
      name: "Cryptocurrency ETF Tracker",
      value: cryptoETF,
      chartUrl: "https://coinmarketcap.com/etf/?w=250&h=150"
    },
    eth_gas: {
      name: "ETH Gas",
      value: ethGas,
      chartUrl: "https://coinmarketcap.com/charts/eth-gas/?w=250&h=150"
    }
  };
}

module.exports = {
  getMarketOverviewData
};
