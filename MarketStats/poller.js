// MarketStats/poller.js
const { fetchCoinMarketCapData } = require('../api/coinmarketcap');
const { processMarketStatsEvent } = require('./events');
const logger = require('../logs/apiLogger');

// Пуллинг каждые 60 секунд (60000 мс)
setInterval(async () => {
  const coins = await fetchCoinMarketCapData();
  if (coins && coins.length > 0) {
    coins.forEach(coin => {
      // Пример: формируем событие "crypto_market_cap" для каждого монеты
      const eventData = {
        type: 'crypto_market_cap',
        asset: coin.symbol,
        event: 'Crypto Market Cap Update',
        value: coin.quote.USD.market_cap,
        change: coin.quote.USD.percent_change_24h,
        period: '1min',
        // Здесь предполагаем, что coin.logo содержит URL графика/логотипа
        graph_url: coin.logo ? coin.logo : 'N/A',
        timestamp: Date.now(),
        settings: { active: true }
      };
      processMarketStatsEvent(eventData);

      // Дополнительно можно формировать события для других типов, если данные доступны
      // Например, для "eth_gas" можно проверять, если coin.symbol === 'ETH'
      if (coin.symbol === 'ETH') {
        const ethEvent = {
          type: 'eth_gas',
          asset: coin.symbol,
          event: 'ETH Gas Update',
          value: coin.quote.USD.price,  // заменить на реальное значение, если API предоставляет
          change: coin.quote.USD.percent_change_24h,
          period: '1min',
          graph_url: coin.logo ? coin.logo : 'N/A',
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
