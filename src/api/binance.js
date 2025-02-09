const logger = require('../../logs/apiLogger');

async function fetchDataBinance(symbol, params = {}) {
  logger.info(`[Binance] symbol=${symbol}, params=${JSON.stringify(params)}`);
  // Заглушка, в реальном проекте подключили бы binance API
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataBinance };
