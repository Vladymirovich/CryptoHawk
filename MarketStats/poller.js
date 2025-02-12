// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
require('dotenv').config({ path: __dirname + '/../config/.env' });

// Флаг активности события Market Overview (задается из админ‑бота)
let isMarketOverviewActive = false;
// Интервал поллера
let pollerInterval = null;
// Callback для отправки уведомлений (заданный извне, из бота)
let notificationCallback = null;

/**
 * Устанавливает активность события Market Overview.
 */
function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

/**
 * Позволяет задать callback для отправки уведомлений.
 * Новый callback должен принимать два аргумента: (messageText, photoBuffer?).
 */
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

/**
 * Основная функция поллинга:
 * Если событие активно, получает данные и для каждого события отправляет отдельное уведомление
 * с прикрепленным графиком (или без, если загрузка изображения не удалась).
 */
async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const overviewData = await getMarketOverviewData();
    for (const key in overviewData) {
      if (overviewData.hasOwnProperty(key)) {
        const event = overviewData[key];
        const text = `📊 **${event.name}**\n\n${event.value}`;
        if (notificationCallback) {
          try {
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(event.chartUrl);
            if (!res.ok) throw new Error(`Failed to fetch image from ${event.chartUrl}: ${res.status}`);
            const arrayBuf = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            // Отправляем уведомление с фото
            await notificationCallback(text, buffer);
          } catch (imgErr) {
            logger.error(`Error fetching image for ${event.name}: ${imgErr.message}`);
            // Если не удалось получить изображение – отправляем только текст
            await notificationCallback(text);
          }
        } else {
          logger.warn("Notification callback not set.");
        }
      }
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
