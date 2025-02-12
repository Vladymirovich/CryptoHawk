// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
const marketStatsBot = require('../bots/marketStatsBot');
require('dotenv').config({ path: __dirname + '/../config/.env' });

// Флаг активности события Market Overview
let marketOverviewActive = false;
// Интервал поллера
let pollerInterval = null;
// Callback для уведомлений (задан из бота)
let notificationCallback = null;

// Задаём chat_id для уведомлений (MARKET_STATS_CHAT_ID должен быть указан в .env)
const targetChatId = process.env.MARKET_STATS_CHAT_ID;
if (!targetChatId) {
  logger.error("MARKET_STATS_CHAT_ID is not defined in .env");
  process.exit(1);
}

/**
 * Устанавливает активность события Market Overview.
 * Если активируется, запускается поллер с интервалом 100000 мс.
 */
function setMarketOverviewActive(active) {
  marketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
  if (active) {
    startPoller(100000);
  } else {
    stopPoller();
  }
}

/**
 * Позволяет задать callback для отправки уведомлений.
 */
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

/**
 * Запускает поллер с заданным интервалом (в мс).
 */
function startPoller(intervalMs) {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`Market Overview poller started with interval ${intervalMs} ms.`);
}

/**
 * Останавливает поллер.
 */
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("Market Overview poller stopped.");
  }
}

/**
 * Основная функция поллинга.
 * Если событие активно, получает данные обзора и отправляет уведомление.
 */
async function pollMarketOverview() {
  if (!marketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const overviewData = await getMarketOverviewData();
    let output = "📊 **Market Overview Update**\n\n";
    for (const key in overviewData) {
      if (overviewData.hasOwnProperty(key)) {
        const event = overviewData[key];
        output += `• **${event.name}:** ${event.value}\n`;
        output += `Chart: ${event.chartUrl}\n\n`;
      }
    }
    if (notificationCallback) {
      await notificationCallback(output);
    } else {
      logger.warn("Notification callback not set.");
    }
  } catch (err) {
    logger.error("Error in Market Overview poller: " + err.message);
  }
}

module.exports = {
  setMarketOverviewActive,
  startPoller,
  stopPoller,
  setNotificationCallback
};
