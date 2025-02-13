const fetch = require('node-fetch');
const logger = require('../logs/apiLogger');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.COINMARKETCAP_API_KEY;
const CHARTS_DIR = path.join(__dirname, '../charts');

if (!fs.existsSync(CHARTS_DIR)) fs.mkdirSync(CHARTS_DIR);

// ====================
// API Эндпоинты для 3 событий
// ====================
const eventEndpoints = {
  bitcoin_dominance: "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest",
  cmc_fear_greed: "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest",
  cmc100_index: "https://pro-api.coinmarketcap.com/v3/index/cmc100-latest"
};

// ====================
// Получение данных по API
// ====================
async function getMarketOverviewData(activeEvents) {
  const eventData = [];

  for (const event of activeEvents) {
    if (!eventEndpoints[event]) continue;

    try {
      const response = await fetch(eventEndpoints[event], {
        headers: { "X-CMC_PRO_API_KEY": API_KEY }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const imagePath = path.join(CHARTS_DIR, `${event}.png`);
      await generateChart(event, data, imagePath);

      eventData.push({
        key: event,
        text: formatEventText(event, data),
        image: imagePath
      });

    } catch (err) {
      logger.error(`❌ Failed to fetch data for ${event}: ${err.message}`);
    }
  }

  return eventData;
}

// ====================
// Форматирование текста уведомлений
// ====================
function formatEventText(event, data) {
  switch (event) {
    case "bitcoin_dominance":
      return `📊 *Bitcoin Dominance*\nBTC: ${data.data.btc}% | ETH: ${data.data.eth}% | Others: ${data.data.others}%`;

    case "cmc_fear_greed":
      return `😨 *CMC Fear & Greed Index*\nCurrent Value: *${data.data.value}* - ${data.data.sentiment}`;

    case "cmc100_index":
      return `📈 *CMC 100 Index*\nValue: *${data.data.index_value}*`;

    default:
      return `📊 *${event}*\nData: ${JSON.stringify(data)}`;
  }
}

// ====================
// Генерация изображения (заглушка)
// ====================
async function generateChart(event, data, outputPath) {
  fs.writeFileSync(outputPath, `Fake Image Data for ${event}`);
}

module.exports = { getMarketOverviewData };
