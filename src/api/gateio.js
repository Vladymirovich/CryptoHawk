const logger = require('../../logs/apiLogger');

async function fetchDataGateIO(symbol, params={}) {
  logger.info(`[Gate.IO] symbol=${symbol}, params=${JSON.stringify(params)}`);
  return { success: true, data: { symbol, params } };
}

module.exports = { fetchDataGateIO };
