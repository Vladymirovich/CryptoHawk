const { Telegraf } = require('telegraf');
require('dotenv').config({ path: __dirname + '/../config/.env' });
const logger = require('../logs/apiLogger');
const { startPoller, stopPoller } = require('../MarketStats/poller');

// ====================
// 🔄 Асинхронный импорт активных событий (избегаем циклической зависимости)
// ====================
async function getActiveMarketStatsEvents() {
  try {
    const adminBot = require('../bots/adminBot'); // Динамическая загрузка
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

// ====================
// 🛠️ Инициализация MarketStats Bot
// ====================
const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ====================
// 🔄 Функция обновления активных событий
// ====================
async function updateActiveEvents() {
  const activeEvents = await getActiveMarketStatsEvents();

  if (activeEvents.length > 0) {
    startPoller(100000, activeEvents); // Запускаем Poller с активными событиями
    logger.info(`✅ Poller запущен для событий: ${activeEvents.join(', ')}`);
  } else {
    stopPoller();
    logger.info("🛑 Poller остановлен (нет активных событий).");
  }
}

// ====================
// 🚀 Запуск MarketStats Bot
// ====================
bot.launch()
  .then(() => {
    logger.info("✅ MarketStats Bot запущен.");
    updateActiveEvents(); // Проверяем активные события при запуске
  })
  .catch((error) => logger.error(`❌ Ошибка запуска MarketStats Bot: ${error.message}`));

// ====================
// Экспортируем функцию обновления активных событий
// ====================
module.exports = { updateActiveEvents };
