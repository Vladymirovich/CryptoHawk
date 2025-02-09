const logger = require('../../logs/apiLogger');

async function fetchDataByBit(symbol, params={}) {
  logger.info(`[ByBit] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataByBit };
