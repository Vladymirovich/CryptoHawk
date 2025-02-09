const logger = require('../../logs/apiLogger');

async function fetchDataBitfinex(symbol, params={}) {
  logger.info(`[Bitfinex] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataBitfinex };
