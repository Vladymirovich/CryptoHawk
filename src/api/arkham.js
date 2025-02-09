const logger = require('../../logs/apiLogger');

async function fetchDataArkham(endpoint, params={}) {
  logger.info(`[ArkhamFake] endpoint=${endpoint}, params=${JSON.stringify(params)}`);
  return { success: true, message: 'Fake Arkham data for testing.' };
}

module.exports = { fetchDataArkham };
