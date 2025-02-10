// MarketStats/poller.js
const { fetchCoinMarketCapData } = require('../api/coinmarketcap');
const { processMarketStatsEvent } = require('./events');
const logger = require('../logs/apiLogger');

// Если монета не возвращает графику, используем placeholder URL (можете заменить)
const DEFAULT_GRAPH_URL = 'https://via.placeholder.com/150';

setInterval(async () => {
  const coins = await fetchCoinMarketCapData();
  if (coins && coins.length > 0) {
    coins.forEach(coin => {
      // Пример: событие для "crypto_market_cap"
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

      // Пример дополнительного события: для ETH (если coin.symbol === 'ETH')
      if (coin.symbol === 'ETH') {
        const ethEvent = {
          type: 'eth_gas',
          asset: coin.symbol,
          event: 'ETH Gas Update',
          value: coin.quote.USD.price, // заменить на реальное значение, если доступно
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
}, 60000);

console.log("MarketStats poller started.");
