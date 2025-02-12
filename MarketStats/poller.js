// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

// Флаг активации события Market Overview (устанавливается из админ‑бота)
let isMarketOverviewActive = false;

// Переменная интервала поллера
let pollerInterval = null;

// Callback для отправки уведомлений (задаётся из бота MarketStats)
let notificationCallback = null;

// Устанавливаем активность события
function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

// Устанавливаем callback для уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// Основная функция поллинга: получает данные и отправляет уведомления для каждого события отдельно
async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const events = await getMarketOverviewData();
    for (const event of events) {
      let imageBuffer = null;
      try {
        // Используем динамический импорт для node‑fetch
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const res = await fetch(event.image);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
        } else {
          logger.error(`Failed to fetch image for event ${event.key}: ${res.status}`);
        }
      } catch (imgErr) {
        logger.error(`Error fetching image for event ${event.key}: ${imgErr.message}`);
      }
      // Отправляем уведомление через callback, если он задан
      if (notificationCallback) {
        await notificationCallback(event.text, imageBuffer);
      } else {
        logger.warn("Notification callback not set.");
      }
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
  setNotificationCallback,
  startPoller,
  stopPoller
};
