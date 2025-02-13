const { Telegraf } = require('telegraf');
require('dotenv').config({ path: '../config/.env' });
const logger = require('../logs/apiLogger');
const { startPoller, stopPoller } = require('../MarketStats/poller');

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ====================
// 🔄 Асинхронное получение активных событий
// ====================
async function getActiveMarketStatsEvents() {
  try {
    const adminBot = require('../bots/adminBot'); // Динамический импорт для предотвращения циклических зависимостей
    if (adminBot && typeof adminBot.getActiveMarketStatsEvents === 'function') {
      const activeEvents = adminBot.getActiveMarketStatsEvents();
      return Array.isArray(activeEvents) ? activeEvents : [];
    } else {
      logger.error("❌ Ошибка: getActiveMarketStatsEvents не определена в adminBot.");
      return [];
    }
  } catch (error) {
    logger.error(`❌ Ошибка при получении активных событий: ${error.message}`);
    return [];
  }
}

// ====================
// 🔄 Функция обновления активных событий
// ====================
async function updateActiveEvents() {
  try {
    const activeEvents = await getActiveMarketStatsEvents();

    if (!Array.isArray(activeEvents) || activeEvents.length === 0) {
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

// ====================
// 🚀 Функция запуска MarketStats Bot
// ====================
async function launchMarketStatsBot() {
  try {
    await bot.launch();
    logger.info("✅ MarketStats Bot успешно запущен.");
    await updateActiveEvents(); // 🔄 Проверяем активные события при запуске
  } catch (error) {
    if (error.response && error.response.error_code === 409) {
      logger.error("❌ Ошибка: 409 Conflict. Уже запущен другой экземпляр бота!");
    } else {
      logger.error(`❌ Ошибка запуска MarketStats Bot: ${error.message}`);
    }
  }
}

// ====================
// 🛠 Обработка сигналов завершения работы
// ====================
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  logger.warn('⚠️ MarketStats Bot остановлен (SIGINT).');
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  logger.warn('⚠️ MarketStats Bot остановлен (SIGTERM).');
});

// ====================
// ✅ Экспортируем функции
// ====================
module.exports = {
  bot,
  launch: launchMarketStatsBot,
  updateActiveEvents
};
