const logger = require('../../logs/apiLogger');

async function fetchDataCoinbase(symbol, params={}) {
  logger.info(`[Coinbase] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataCoinbase };
