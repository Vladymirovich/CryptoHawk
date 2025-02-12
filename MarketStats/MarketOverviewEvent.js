// ====================
// MarketStats/MarketOverviewEvent.js
// ====================

// Используем динамический импорт для node‑fetch (подходит для версии 3)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('../logs/apiLogger');
require('dotenv').config({ path: __dirname + '/../config/.env' });

const API_KEY = process.env.COINMARKETCAP_API_KEY;
if (!API_KEY) {
  logger.error("COINMARKETCAP_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

// Получение глобальных метрик (используется для расчёта Dominance и Crypto Market Cap)
async function getGlobalMetrics() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  try {
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    return data.data;
  } catch (err) {
    logger.error("Error fetching Global Metrics: " + err.message);
    return null;
  }
}

// Получение Fear and Greed Index
async function getFearAndGreedIndex() {
  const url = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest';
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
    if (data.data) {
      return {
        current: data.data.current_price ? `$${Number(data.data.current_price).toFixed(2)}` : "N/A",
        change: data.data.change_percentage_24h ? `${Number(data.data.change_percentage_24h).toFixed(2)}%` : "N/A"
      };
    }
    return { current: "N/A", change: "N/A" };
  } catch (err) {
    logger.error("Error fetching CMC100 Index: " + err.message);
    return { current: "N/A", change: "N/A" };
  }
}

// Формирование события "Market Dominance"
async function getDominanceEvent() {
  const metrics = await getGlobalMetrics();
  if (!metrics || !metrics.quote || !metrics.quote.USD) {
    return null;
  }
  const usd = metrics.quote.USD;
  const btc_current = usd.btc_dominance ? Number(usd.btc_dominance) : 0;
  const eth_current = usd.eth_dominance ? Number(usd.eth_dominance) : 0;
  const btc_yesterday = usd.btc_dominance_yesterday ? Number(usd.btc_dominance_yesterday) : btc_current;
  const eth_yesterday = usd.eth_dominance_yesterday ? Number(usd.eth_dominance_yesterday) : eth_current;
  const others_current = 100 - (btc_current + eth_current);
  const others_yesterday = 100 - (btc_yesterday + eth_yesterday);
  const btc_change = Number((btc_current - btc_yesterday).toFixed(2));
  const eth_change = Number((eth_current - eth_yesterday).toFixed(2));
  const others_change = Number((others_current - others_yesterday).toFixed(2));

  const text = `**Market Dominance**
• **Bitcoin:** ${btc_current.toFixed(1)}% (Change: ${btc_change >= 0 ? '+' : ''}${btc_change}%)
• **Ethereum:** ${eth_current.toFixed(1)}% (Change: ${eth_change >= 0 ? '+' : ''}${eth_change}%)
• **Others:** ${others_current.toFixed(1)}% (Change: ${others_change >= 0 ? '+' : ''}${others_change}%)`;
  return {
    name: "Market Dominance",
    text,
    image: "https://coinmarketcap.com/charts/bitcoin-dominance/"
  };
}

// Формирование события "CMC Crypto Fear and Greed Index"
async function getFearAndGreedEvent() {
  const indexValue = await getFearAndGreedIndex();
  const text = `**CMC Crypto Fear and Greed Index**
Current Value: ${indexValue}`;
  return {
    name: "Fear and Greed Index",
    text,
    image: "https://coinmarketcap.com/charts/fear-and-greed-index/"
  };
}

// Формирование события "CMC Altcoin Season Index"
async function getAltcoinSeasonEvent() {
  // Для бесплатного плана данные могут отсутствовать – используем фиксированное значение
  const value = "42/100";
  const text = `**CMC Altcoin Season Index**
Current: ${value}
Status: Bitcoin Season / Altcoin Season`;
  return {
    name: "Altcoin Season Index",
    text,
    image: "https://coinmarketcap.com/charts/altcoin-season-index/"
  };
}

// Формирование события "CoinMarketCap 100 Index"
async function getCMC100Event() {
  const data = await getCMC100Index();
  const text = `**CoinMarketCap 100 Index**
Current: ${data.current}
24h Change: ${data.change}`;
  return {
    name: "CMC 100 Index",
    text,
    image: "https://coinmarketcap.com/charts/cmc100/"
  };
}

// Формирование события "Crypto Market Cap"
async function getCryptoMarketCapEvent() {
  const metrics = await getGlobalMetrics();
  if (!metrics || !metrics.quote || !metrics.quote.USD) {
    return null;
  }
  const usd = metrics.quote.USD;
  const current = usd.total_market_cap ? `$${(usd.total_market_cap / 1e12).toFixed(2)}T` : "N/A";
  const change = usd.total_market_cap_yesterday_percentage_change ? `${Number(usd.total_market_cap_yesterday_percentage_change).toFixed(2)}%` : "N/A";
  const text = `**Crypto Market Cap**
Current: ${current}
24h Change: ${change}`;
  return {
    name: "Crypto Market Cap",
    text,
    image: "https://coinmarketcap.com/charts/spot-market/"
  };
}

// Формирование события "Cryptocurrency ETF Tracker"
async function getETFTrackerEvent() {
  // Для бесплатного плана используем заготовленные данные
  const text = `**Cryptocurrency ETF Tracker**
ETF Net Flow by today: - $44.10M
BTC: - $57M, ETH: + $13M`;
  return {
    name: "ETF Tracker",
    text,
    image: "https://coinmarketcap.com/etf/"
  };
}

// Функция для получения всех событий Market Overview
async function getAllMarketOverviewEvents() {
  const events = [];
  const dominance = await getDominanceEvent();
  if (dominance) events.push(dominance);
  const fearAndGreed = await getFearAndGreedEvent();
  if (fearAndGreed) events.push(fearAndGreed);
  const altcoinSeason = await getAltcoinSeasonEvent();
  if (altcoinSeason) events.push(altcoinSeason);
  const cmc100 = await getCMC100Event();
  if (cmc100) events.push(cmc100);
  const cryptoMarketCap = await getCryptoMarketCapEvent();
  if (cryptoMarketCap) events.push(cryptoMarketCap);
  const etfTracker = await getETFTrackerEvent();
  if (etfTracker) events.push(etfTracker);
  return events;
}

module.exports = {
  getAllMarketOverviewEvents
};
