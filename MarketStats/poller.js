const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

let pollerInterval = null;
let notificationCallback = null;
let activeEvents = new Set();

// ====================
// Установка callback'а для уведомлений
// ====================
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// ====================
// Запуск поллера с выбранными событиями
// ====================
function startPoller(intervalMs, events) {
  if (!events.length) return stopPoller();
  activeEvents = new Set(events);

  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);

  logger.info(`🚀 Market Overview poller started with events: ${[...activeEvents].join(', ')}`);
}

// ====================
// Остановка поллера
// ====================
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    activeEvents.clear();
    logger.info("🛑 Market Overview poller stopped.");
  }
}

// ====================
// Выполнение запроса к API для активных событий
// ====================
async function pollMarketOverview() {
  if (!activeEvents.size) return stopPoller();

  try {
    const eventsData = await getMarketOverviewData([...activeEvents]);
    for (const event of eventsData) {
      if (notificationCallback) {
        await notificationCallback(event.text, event.image);
      } else {
        logger.warn("⚠️ Notification callback not set.");
      }
    }
  } catch (err) {
    logger.error(`❌ Error polling market overview: ${err.message}`);
  }
}

module.exports = {
  setNotificationCallback,
  startPoller,
  stopPoller
};
