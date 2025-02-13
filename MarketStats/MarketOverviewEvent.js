/* =========================
 * MarketStats/MarketOverviewEvent.js (Dynamic Data & Images)
 * ========================= */
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = process.env.COINMARKETCAP_API_KEY;
if (!API_KEY) {
  logger.error("COINMARKETCAP_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

async function fetchData(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    logger.error(`Error fetching data from ${url}: ${err.message}`);
    return null;
  }
}

async function getMarketOverviewData(activeEvents) {
  const events = [];

  if (activeEvents.includes("bitcoin_dominance")) {
    const globalMetrics = await fetchData('https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest');
    const btcDominance = globalMetrics?.btc_dominance?.toFixed(2) || "N/A";
    const ethDominance = globalMetrics?.eth_dominance?.toFixed(2) || "N/A";
    const othersDominance = (100 - (parseFloat(btcDominance) + parseFloat(ethDominance))).toFixed(2) || "N/A";

    events.push({
      key: "bitcoin_dominance",
      name: "Bitcoin Dominance",
      text: `BTC: ${btcDominance}%, ETH: ${ethDominance}%, Others: ${othersDominance}%`,
      image: "https://quickchart.io/chart?c={...}", // Ссылка на динамический график
    });
  }

  if (activeEvents.includes("cmc_fear_greed")) {
    const fearAndGreed = await fetchData('https://pro-api.coinmarketcap.com/v3/fearandgreed/latest');
    const fearGreedValue = fearAndGreed?.value || "N/A";

    events.push({
      key: "cmc_fear_greed",
      name: "CMC Fear & Greed Index",
      text: `Fear & Greed Index: ${fearGreedValue}`,
      image: "https://quickchart.io/chart?c={...}", // Динамический график
    });
  }

  if (activeEvents.includes("cmc100_index")) {
    const cmc100 = await fetchData('https://pro-api.coinmarketcap.com/v3/index/cmc100/latest');
    const cmc100Value = cmc100?.value || "N/A";

    events.push({
      key: "cmc100_index",
      name: "CMC 100 Index",
      text: `CMC 100 Index: ${cmc100Value}`,
      image: "https://quickchart.io/chart?c={...}", // Динамический график
    });
  }

  return events;
}

module.exports = { getMarketOverviewData };
