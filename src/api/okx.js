const logger = require('../../logs/apiLogger');

async function fetchDataOKX(symbol, params={}) {
  logger.info(`[OKX] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataOKX };
