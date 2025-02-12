// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

// Флаг активации события Market Overview (устанавливается из админ‑бота)
let isMarketOverviewActive = false;

// Интервал поллера
let pollerInterval = null;

// Callback-функция для отправки уведомлений (задается из бота MarketStats)
let notificationCallback = null;

// Устанавливает активность события
function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

// Позволяет задать callback для отправки уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// Основная функция поллинга: получает данные и отправляет уведомление, если событие активно
async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const eventsData = await getMarketOverviewData();
    let output = "📊 **Market Overview Update**\n\n";
    for (const key in eventsData) {
      const event = eventsData[key];
      output += `• **${event.name}:** ${event.value}\n`;
      output += `Chart: ${event.chartUrl}\n\n`;
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

// Запускает поллер с заданным интервалом (в мс)
function startPoller(intervalMs) {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`Market Overview poller started with interval ${intervalMs} ms.`);
}

// Останавливает поллер
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("Market Overview poller stopped.");
  }
}

module.exports = {
  setMarketOverviewActive,
  startPoller,
  stopPoller,
  setNotificationCallback
};
