const { Telegraf } = require('telegraf');
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');
const { getActiveMarketStatsEvents } = require('../bots/adminBot');
const { startPoller, stopPoller } = require('../MarketStats/poller');

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ====================
// Функция обновления активных событий
// ====================
function updateActiveEvents() {
  const activeEvents = getActiveMarketStatsEvents();
  
  if (activeEvents.length > 0) {
    startPoller(100000, activeEvents); // Запускаем Poller с активными событиями
    logger.info(`✅ Poller запущен для событий: ${activeEvents.join(', ')}`);
  } else {
    stopPoller();
    logger.info("🛑 Poller остановлен (нет активных событий).");
  }
}

// ====================
// Запуск MarketStats Bot
// ====================
bot.launch().then(() => {
  logger.info("✅ MarketStats Bot запущен.");
  updateActiveEvents(); // Проверяем активные события при запуске
});

module.exports = { updateActiveEvents };
