const { Telegraf } = require('telegraf');
require('dotenv').config({ path: '../config/.env' });
const logger = require('../logs/apiLogger');
const { startPoller, stopPoller } = require('../MarketStats/poller');

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ✅ Получение активных событий из Admin Bot
function getActiveMarketStatsEvents() {
  try {
    const adminBot = require('../bots/adminBot');
    if (adminBot && typeof adminBot.getActiveMarketStatsEvents === 'function') {
      return adminBot.getActiveMarketStatsEvents();
    }
  } catch (error) {
    logger.error(`❌ Ошибка получения активных событий: ${error.message}`);
  }
  return [];
}

// ✅ Функция обновления активных событий
function updateActiveEvents() {
  try {
    const activeEvents = getActiveMarketStatsEvents();
    
    if (!activeEvents || activeEvents.length === 0) {
      stopPoller();
      logger.info("🛑 Poller остановлен (нет активных событий).");
    } else {
      startPoller(100000, activeEvents);
      logger.info(`✅ Poller запущен для событий: ${activeEvents.join(', ')}`);
    }
  } catch (error) {
    logger.error(`❌ Ошибка обновления активных событий: ${error.message}`);
  }
}

// 🚀 Запуск MarketStats Bot
bot.launch()
  .then(() => {
    logger.info("✅ MarketStats Bot запущен.");
    updateActiveEvents();
  })
  .catch((error) => logger.error(`❌ Ошибка запуска MarketStats Bot: ${error.message}`));

module.exports = { updateActiveEvents };
