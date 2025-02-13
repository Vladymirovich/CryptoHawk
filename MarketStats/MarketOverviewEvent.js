const axios = require('axios');
require('dotenv').config();
const logger = require('../logs/apiLogger');

const API_KEY = process.env.COINMARKETCAP_API_KEY;
const API_BASE_URL = "https://pro-api.coinmarketcap.com";

// ✅ Запрос данных с API CoinMarketCap
async function fetchMarketData(activeEvents) {
  const results = [];

  try {
    if (activeEvents.includes("bitcoin_dominance")) {
      const btcData = await axios.get(`${API_BASE_URL}/v1/global-metrics/quotes/latest`, {
        headers: { 'X-CMC_PRO_API_KEY': API_KEY }
      });

      const btcDominance = btcData.data.data.btc_dominance.toFixed(2);
      results.push({
        key: "bitcoin_dominance",
        text: `📊 **Bitcoin Dominance**: ${btcDominance}%`,
        image: `https://s3.coinmarketcap.com/generated/sparklines/web/7d/usd/1.png`
      });
    }

    if (activeEvents.includes("cmc100_index")) {
      const cmcData = await axios.get(`${API_BASE_URL}/v3/index/cmc100-latest`, {
        headers: { 'X-CMC_PRO_API_KEY': API_KEY }
      });

      const cmc100Index = cmcData.data.data.price.toFixed(2);
      results.push({
        key: "cmc100_index",
        text: `📈 **CMC 100 Index**: $${cmc100Index}`,
        image: `https://s3.coinmarketcap.com/generated/sparklines/web/7d/usd/2.png`
      });
    }

    if (activeEvents.includes("cmc_fear_greed")) {
      const fearGreedData = await axios.get(`${API_BASE_URL}/v3/fear-and-greed/latest`, {
        headers: { 'X-CMC_PRO_API_KEY': API_KEY }
      });

      const fearGreedIndex = fearGreedData.data.data.value;
      results.push({
        key: "cmc_fear_greed",
        text: `😨 **Fear & Greed Index**: ${fearGreedIndex}/100`,
        image: `https://s3.coinmarketcap.com/generated/sparklines/web/7d/usd/3.png`
      });
    }

  } catch (error) {
    logger.error(`❌ Ошибка запроса к CoinMarketCap API: ${error.message}`);
  }

  return results;
}

module.exports = {
  fetchMarketData
};
