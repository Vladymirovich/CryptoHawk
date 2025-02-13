const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

let pollerInterval = null;
let notificationCallback = null;
let activeEvents = new Set(); // Отслеживаем активные события

// Устанавливаем callback для уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// ====================
// Устанавливаем активные события и перезапускаем поллер
// ====================
function setActiveEvents(events) {
  activeEvents = new Set(events);
  restartPoller();
}

// ====================
// Основная функция поллинга
// ====================
async function pollMarketOverview() {
  if (activeEvents.size === 0) {
    logger.info("⏸ No active events. Skipping poll cycle.");
    return;
  }

  try {
    const eventsData = await getMarketOverviewData();
    for (const event of eventsData) {
      if (!activeEvents.has(event.key)) continue; // Пропускаем неактивные события

      let imageBuffer = null;
      if (event.image) {
        try {
          const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
          const res = await fetch(event.image);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
          } else {
            logger.error(`❌ Failed to fetch image for event ${event.key}: ${res.status}`);
          }
        } catch (imgErr) {
          logger.error(`❌ Error fetching image for event ${event.key}: ${imgErr.message}`);
        }
      }

      if (notificationCallback) {
        await notificationCallback(event.text, imageBuffer);
      } else {
        logger.warn("⚠️ Notification callback not set.");
      }
    }
  } catch (err) {
    logger.error("❌ Error in Market Overview poller: " + err.message);
  }
}

// ====================
// Запуск поллера
// ====================
function startPoller(intervalMs, events) {
  setActiveEvents(events);
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`🚀 Market Overview poller started with interval ${intervalMs} ms.`);
}

// ====================
// Перезапуск поллера
// ====================
function restartPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = setInterval(pollMarketOverview, 100000);
    logger.info("🔄 Market Overview poller restarted.");
  }
}

// ====================
// Остановка поллера
// ====================
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("🛑 Market Overview poller stopped.");
  }
}

module.exports = {
  setNotificationCallback,
  startPoller,
  stopPoller,
  setActiveEvents
};
