const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
const { marketStatsSettings, updateActiveEvents } = require('../bots/adminBot');

let pollerInterval = null;
let notificationCallback = null;

// ====================
// Устанавливаем callback для уведомлений
// ====================
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// ====================
// Основная функция поллинга
// ====================
async function pollMarketOverview() {
  const activeEvents = updateActiveEvents();
  if (activeEvents.length === 0) {
    logger.info("⚠️ No active events. Skipping poll cycle.");
    return;
  }

  try {
    const eventsData = await getMarketOverviewData(activeEvents);
    for (const event of eventsData) {
      if (!activeEvents.includes(event.key)) continue;

      let imageBuffer = null;
      if (event.image) {
        try {
          const res = await fetch(event.image);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
          } else {
            logger.error(`❌ Error fetching image for event ${event.key}: ${res.status}`);
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
    logger.error(`❌ Error in Market Overview poller: ${err.message}`);
  }
}

// ====================
// Запуск поллера
// ====================
function startPoller(intervalMs) {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`✅ Market Overview poller started with interval ${intervalMs} ms.`);
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

// ====================
// Экспортируем модули
// ====================
module.exports = {
  setNotificationCallback,
  startPoller,
  stopPoller
};
