// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
require('dotenv').config({ path: __dirname + '/../config/.env' });

// Флаг активности события Market Overview
let marketOverviewActive = false;
// Интервал поллера
let pollerInterval = null;
// Callback для отправки уведомлений (заданный извне, из бота)
let notificationCallback = null;

/**
 * Устанавливает активность события Market Overview.
 */
function setMarketOverviewActive(active) {
  marketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

/**
 * Позволяет задать callback для отправки уведомлений.
 */
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

/**
 * Основная функция поллинга.
 * Если событие активно, получает данные обзора и отправляет уведомление через notificationCallback.
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

/**
 * Запускает поллер с заданным интервалом (в миллисекундах).
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

module.exports = {
  setMarketOverviewActive,
  setNotificationCallback,
  startPoller,
  stopPoller
};
