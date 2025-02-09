const logger = require('../../logs/apiLogger');

async function fetchData(endpoint, params = {}) {
  logger.info(`[CoinMarketCap] fetchData endpoint=${endpoint}, params=${JSON.stringify(params)}`);
  // Здесь вы делаете реальный запрос через axios к pro-api.coinmarketcap.com
  // Для примера – заглушка:
  return { success: true, data: { endpoint, params } };
}

module.exports = { fetchData };
