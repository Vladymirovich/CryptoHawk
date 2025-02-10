// MarketStats/poller.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { fetchCoinMarketCapData } = require('../src/api/coinmarketcap');
const { processMarketStatsEvent } = require('./events');
const logger = require('../logs/apiLogger');

const DEFAULT_GRAPH_URL = 'https://via.placeholder.com/150';

async function pollData() {
  logger.info("MarketStats Poller: Starting poll cycle...");
  try {
    const coins = await fetchCoinMarketCapData();
    if (coins && coins.length > 0) {
      logger.info(`MarketStats Poller: Received ${coins.length} coins from CoinMarketCap.`);
      coins.forEach(coin => {
        const eventData = {
          type: 'crypto_market_cap',
          asset: coin.symbol,
          event: 'Crypto Market Cap Update',
          value: coin.quote.USD.market_cap,
          change: coin.quote.USD.percent_change_24h,
          period: '1min',
          graph_url: coin.logo ? coin.logo : DEFAULT_GRAPH_URL,
          timestamp: Date.now(),
          settings: { active: true }
        };
        processMarketStatsEvent(eventData);

        if (coin.symbol === 'ETH') {
          const ethEvent = {
            type: 'eth_gas',
            asset: coin.symbol,
            event: 'ETH Gas Update',
            value: coin.quote.USD.price, // Замените на корректное значение, если доступно
            change: coin.quote.USD.percent_change_24h,
            period: '1min',
            graph_url: coin.logo ? coin.logo : DEFAULT_GRAPH_URL,
            timestamp: Date.now(),
            settings: { active: true }
          };
          processMarketStatsEvent(ethEvent);
        }
      });
    } else {
      logger.info("MarketStats Poller: No coins data received.");
    }
  } catch (error) {
    logger.error(`MarketStats Poller: Error during poll cycle: ${error.message}`);
  }
}

setInterval(pollData, 60000);
logger.info("MarketStats poller started.");
