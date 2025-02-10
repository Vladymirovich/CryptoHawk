// MarketStats/poller.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { fetchGlobalMetrics } = require('../src/api/coinmarketcap');
const { processMarketStatsEvent } = require('./events');
const logger = console; // Используем console для отладки

const DEFAULT_GRAPH_URL = 'https://via.placeholder.com/150';

async function pollData() {
  logger.info("MarketStats Poller: Starting poll cycle...");
  try {
    const globalMetrics = await fetchGlobalMetrics();
    if (globalMetrics && globalMetrics.quote && globalMetrics.quote.USD) {
      const usdData = globalMetrics.quote.USD;
      logger.info("MarketStats Poller: Received global metrics data.");
      
      // Событие для глобального Market Cap
      const marketCapEvent = {
        type: 'crypto_market_cap',
        asset: 'GLOBAL',
        event: 'Crypto Market Cap Update',
        value: usdData.total_market_cap,
        change: 'N/A',
        period: '1min',
        graph_url: DEFAULT_GRAPH_URL,
        timestamp: Date.now(),
        settings: { active: true }
      };
      processMarketStatsEvent(marketCapEvent);
      
      // Событие для Bitcoin Dominance
      const btcDominanceEvent = {
        type: 'bitcoin_dominance',
        asset: 'GLOBAL',
        event: 'Bitcoin Dominance Update',
        value: usdData.bitcoin_dominance,
        change: 'N/A',
        period: '1min',
        graph_url: DEFAULT_GRAPH_URL,
        timestamp: Date.now(),
        settings: { active: true }
      };
      processMarketStatsEvent(btcDominanceEvent);
      
      // Событие для 24h Total Volume
      const volumeEvent = {
        type: 'total_volume_24h',
        asset: 'GLOBAL',
        event: 'Total Volume 24h Update',
        value: usdData.total_volume_24h,
        change: 'N/A',
        period: '1min',
        graph_url: DEFAULT_GRAPH_URL,
        timestamp: Date.now(),
        settings: { active: true }
      };
      processMarketStatsEvent(volumeEvent);
      
    } else {
      logger.info("MarketStats Poller: No global metrics data received.");
    }
  } catch (error) {
    logger.error(`MarketStats Poller: Error during poll cycle: ${error.message}`);
  }
}

setInterval(pollData, 60000);
pollData(); // запустить сразу один цикл
logger.info("MarketStats poller started.");
