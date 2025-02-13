const { Telegraf } = require('telegraf');
require('dotenv').config({ path: '../config/.env' });
const logger = require('../logs/apiLogger');
const { startPoller, stopPoller } = require('../MarketStats/poller');

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ✅ Асинхронное получение активных событий (избегаем циклических зависимостей)
async function getActiveMarketStatsEvents() {
  try {
    const adminBot = require('../bots/adminBot'); // Динамический импорт
    if (adminBot && typeof adminBot.getActiveMarketStatsEvents === 'function') {
      return adminBot.getActiveMarketStatsEvents();
    } else {
      logger.error("❌ Ошибка: getActiveMarketStatsEvents не определена в adminBot.");
      return [];
    }
  } catch (error) {
    logger.error(`❌ Ошибка при получении активных событий: ${error.message}`);
    return [];
  }
}

// ✅ Функция обновления активных событий
async function updateActiveEvents() {
  try {
    const activeEvents = await getActiveMarketStatsEvents();

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
    updateActiveEvents(); // 🔄 Проверяем активные события при запуске
  })
  .catch((error) => {
    if (error.response && error.response.error_code === 409) {
      logger.error("❌ Ошибка: 409 Conflict. Уже запущен другой экземпляр бота!");
    } else {
      logger.error(`❌ Ошибка запуска MarketStats Bot: ${error.message}`);
    }
  });

// 🛠 Экспортируем функцию обновления активных событий
module.exports = { updateActiveEvents };
