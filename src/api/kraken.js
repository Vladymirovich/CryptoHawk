const logger = require('../../logs/apiLogger');

async function fetchDataKraken(symbol, params={}) {
  logger.info(`[Kraken] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataKraken };
