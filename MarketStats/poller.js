const { fetchCoinMarketCapData } = require('../api/coinmarketcap');
const { processMarketStatsEvent } = require('./events');
const logger = require('../logs/apiLogger');

// Замените на URL вашего placeholder изображения, если требуется
const DEFAULT_GRAPH_URL = 'https://via.placeholder.com/150';

setInterval(async () => {
  const coins = await fetchCoinMarketCapData();
  if (coins && coins.length > 0) {
    coins.forEach(coin => {
      // Пример формирования события для "crypto_market_cap"
      const eventData = {
        type: 'crypto_market_cap',
        asset: coin.symbol,
        event: 'Crypto Market Cap Update',
        value: coin.quote.USD.market_cap,
        change: coin.quote.USD.percent_change_24h,
        period: '1min',
        // Если API не возвращает логотип, используем placeholder
        graph_url: coin.logo ? coin.logo : DEFAULT_GRAPH_URL,
        timestamp: Date.now(),
        settings: { active: true }
      };
      processMarketStatsEvent(eventData);

      // Можно добавить дополнительные события, например для ETH Gas,
      // если такие данные доступны в API (это лишь пример)
      if (coin.symbol === 'ETH') {
        const ethEvent = {
          type: 'eth_gas',
          asset: coin.symbol,
          event: 'ETH Gas Update',
          value: coin.quote.USD.price, // здесь заменить на реальное значение, если доступно
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
