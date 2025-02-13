/* =========================
 * MarketStats/MarketOverviewEvent.js (Optimized & Enhanced)
 * ========================= */
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');
const puppeteer = require('puppeteer');
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

async function captureChart(url, outputPath) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: outputPath });
  await browser.close();
}

function formatMarketCap(value) {
  const num = Number(value);
  if (isNaN(num)) return "N/A";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toFixed(2);
}

async function getMarketOverviewData() {
  const [globalMetrics, fearAndGreed, cmc100] = await Promise.all([
    fetchData('https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest'),
    fetchData('https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical'),
    fetchData('https://pro-api.coinmarketcap.com/v3/index/cmc100-latest')
  ]);

  let btc_current = "N/A", eth_current = "N/A", btc_change = "N/A", eth_change = "N/A";
  if (globalMetrics) {
    btc_current = globalMetrics.btc_dominance ? Number(globalMetrics.btc_dominance).toFixed(2) : "N/A";
    eth_current = globalMetrics.eth_dominance ? Number(globalMetrics.eth_dominance).toFixed(2) : "N/A";
    btc_change = globalMetrics.btc_dominance_24h_percentage_change ? Math.abs(Number(globalMetrics.btc_dominance_24h_percentage_change)).toFixed(2) : "N/A";
    eth_change = globalMetrics.eth_dominance_24h_percentage_change ? Math.abs(Number(globalMetrics.eth_dominance_24h_percentage_change)).toFixed(2) : "N/A";
  }
  let others_current = "N/A", others_change = "N/A";
  if (btc_current !== "N/A" && eth_current !== "N/A") {
    others_current = (100 - Number(btc_current) - Number(eth_current)).toFixed(2);
    if (btc_change !== "N/A" && eth_change !== "N/A") {
      others_change = ((Number(btc_change) + Number(eth_change)) / 2).toFixed(2);
    }
  }

  await captureChart('https://coinmarketcap.com/charts/bitcoin-dominance/', 'charts/btc_dominance.png');
  await captureChart('https://coinmarketcap.com/charts/fear-and-greed-index/', 'charts/fear_greed.png');

  return [
    { key: "dominance", name: "Dominance", text: `BTC: ${btc_current}%, ETH: ${eth_current}%, Others: ${others_current}%`, image: "charts/btc_dominance.png" },
    { key: "fear_and_greed", name: "Fear & Greed Index", text: `Value: ${fearAndGreed || "N/A"}`, image: "charts/fear_greed.png" },
    { key: "cmc100_index", name: "CMC 100 Index", text: `Value: ${cmc100 || "N/A"}` }
  ];
}

module.exports = { getMarketOverviewData };
