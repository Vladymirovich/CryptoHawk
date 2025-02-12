// MarketStats/MarketOverviewEvent.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');

const API_KEY = process.env.COINMARKETCAP_API_KEY; // ваш CoinMarketCap API-ключ
if (!API_KEY) {
  logger.error("COINMARKETCAP_API_KEY is not defined in .env");
  process.exit(1);
}

const HEADERS = {
  'X-CMC_PRO_API_KEY': API_KEY,
  'Accept': 'application/json'
};

// Вспомогательная функция для форматирования больших чисел
function formatNumber(num) {
  const n = Number(num);
  if (n >= 1e12) {
    return (n / 1e12).toFixed(2) + "T";
  } else if (n >= 1e9) {
    return (n / 1e9).toFixed(2) + "B";
  } else if (n >= 1e6) {
    return (n / 1e6).toFixed(2) + "M";
  } else if (n >= 1e3) {
    return (n / 1e3).toFixed(2) + "K";
  }
  return n.toString();
}

// Основная функция получения данных Market Overview
async function getMarketOverviewData() {
  const fetch = (await import('node-fetch')).default;
  
  // Получаем глобальные метрики
  const globalUrl = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  let globalRes, globalJson, globalMetrics;
  try {
    globalRes = await fetch(globalUrl, { headers: HEADERS });
    globalJson = await globalRes.json();
    globalMetrics = globalJson.data;
  } catch (err) {
    logger.error("Error fetching global metrics: " + err.message);
    throw err;
  }

  // Событие: Dominance (объединяем btc, eth, others)
  let btc = globalMetrics.quote?.USD?.btc_dominance || globalMetrics.btc_dominance;
  let eth = globalMetrics.quote?.USD?.eth_dominance || globalMetrics.eth_dominance;
  btc = Number(btc);
  eth = Number(eth);
  const others = 100 - (btc + eth);
  const dominanceText = `Bitcoin: ${btc.toFixed(2)}% (Change: N/A)\nEthereum: ${eth.toFixed(2)}% (Change: N/A)\nOthers: ${others.toFixed(2)}% (Change: N/A)`;
  const dominanceEvent = {
    name: "Dominance",
    value: dominanceText,
    chartUrl: "https://coinmarketcap.com/charts/bitcoin-dominance/?w=250&h=150"
  };

  // Событие: CMC Crypto Fear and Greed Index
  let fearAndGreed;
  try {
    const fgUrl = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest';
    const fgRes = await fetch(fgUrl, { headers: HEADERS });
    const fgJson = await fgRes.json();
    fearAndGreed = fgJson.data?.value || "N/A";
  } catch (err) {
    logger.error("Error fetching Fear and Greed Index: " + err.message);
    fearAndGreed = "N/A";
  }
  const fearAndGreedEvent = {
    name: "CMC Crypto Fear and Greed Index",
    value: fearAndGreed,
    chartUrl: "https://coinmarketcap.com/charts/fear-and-greed-index/?w=250&h=150"
  };

  // Событие: CMC Altcoin Season Index (в бесплатном плане данные отсутствуют)
  const altcoinSeasonEvent = {
    name: "CMC Altcoin Season Index",
    value: "N/A",
    chartUrl: "https://coinmarketcap.com/charts/altcoin-season-index/?w=250&h=150"
  };

  // Событие: CoinMarketCap 100 Index
  let cmc100;
  try {
    const cmc100Url = 'https://pro-api.coinmarketcap.com/v3/index/cmc100-latest';
    const cmc100Res = await fetch(cmc100Url, { headers: HEADERS });
    const cmc100Json = await cmc100Res.json();
    cmc100 = cmc100Json.data?.value || "N/A";
  } catch (err) {
    logger.error("Error fetching CMC 100 Index: " + err.message);
    cmc100 = "N/A";
  }
  const cmc100Event = {
    name: "CoinMarketCap 100 Index",
    value: cmc100,
    chartUrl: "https://coinmarketcap.com/charts/cmc100/?w=250&h=150"
  };

  // Событие: Spot Market Crypto Market Cap
  let spotMarketCap;
  try {
    const totalMarketCap = globalMetrics.quote?.USD?.total_market_cap;
    if (totalMarketCap) {
      spotMarketCap = formatNumber(totalMarketCap) + " USD";
    } else {
      spotMarketCap = "N/A";
    }
  } catch (err) {
    spotMarketCap = "N/A";
  }
  const spotMarketCapEvent = {
    name: "Spot Market Crypto Market Cap",
    value: spotMarketCap,
    chartUrl: "https://coinmarketcap.com/charts/spot-market/?w=250&h=150"
  };

  // Событие: Cryptocurrency ETF Tracker
  const cryptoETFEvent = {
    name: "Cryptocurrency ETF Tracker",
    value: "N/A",
    chartUrl: "https://coinmarketcap.com/etf/?w=250&h=150"
  };

  // Событие: ETH Gas
  const ethGasEvent = {
    name: "ETH Gas",
    value: "N/A",
    chartUrl: "https://coinmarketcap.com/charts/eth-gas/?w=250&h=150"
  };

  return {
    dominance: dominanceEvent,
    fear_and_greed: fearAndGreedEvent,
    altcoin_season: altcoinSeasonEvent,
    cmc100_index: cmc100Event,
    spot_market_cap: spotMarketCapEvent,
    crypto_etf_tracker: cryptoETFEvent,
    eth_gas: ethGasEvent
  };
}

module.exports = {
  getMarketOverviewData
};
