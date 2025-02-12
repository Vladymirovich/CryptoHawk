// ====================
// MarketStats/poller.js
// ====================

const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
const marketStatsBot = require('../bots/marketStatsBot');
require('dotenv').config({ path: __dirname + '/../config/.env' });

// Флаг активности события Market Overview
let marketOverviewActive = false;
// Интервал поллера
let pollerInterval = null;

// Задаём chat_id для уведомлений (должен быть указан в .env как MARKET_STATS_CHAT_ID)
const targetChatId = process.env.MARKET_STATS_CHAT_ID;
if (!targetChatId) {
  logger.error("MARKET_STATS_CHAT_ID is not defined in .env");
  process.exit(1);
}

/**
 * Устанавливает активность события Market Overview.
 * Если активируется – запускается поллер с интервалом 100000 мс,
 * если деактивируется – поллер останавливается.
 * @param {boolean} active 
 */
function setMarketOverviewActive(active) {
  marketOverviewActive = active;
  if (active) {
    startPoller(100000);
  } else {
    stopPoller();
  }
}

/**
 * Запускает поллер с заданным интервалом (в мс).
 * @param {number} intervalMs 
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
 * Если событие активно, получает данные обзора рынка и для каждого события отправляет уведомление.
 */
async function pollMarketOverview() {
  if (!marketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const overviewData = await getMarketOverviewData();
    // Для каждого события в полученных данных отправляем отдельное уведомление
    for (const key in overviewData) {
      if (overviewData.hasOwnProperty(key)) {
        const event = overviewData[key];
        // Формируем текст уведомления
        const text = `📊 **${event.name}**\nValue: ${event.value}`;
        try {
          // Динамический импорт node-fetch (для совместимости с ESM)
          const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
          // Прикрепляем параметры w и h для стандартизации размера изображения (250x150)
          const imageUrl = `${event.chartUrl}&w=250&h=150`;
          const res = await fetch(imageUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch image from ${imageUrl}: ${res.status}`);
          }
          // Используем arrayBuffer() вместо buffer() (согласно предупреждению)
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          await marketStatsBot.telegram.sendPhoto(
            targetChatId,
            { source: buffer },
            { caption: text, parse_mode: 'Markdown' }
          );
        } catch (imgErr) {
          logger.error("Error sending event notification (photo): " + imgErr.message);
          // Если загрузка фото не удалась – отправляем текстовое уведомление
          await marketStatsBot.telegram.sendMessage(targetChatId, text, { parse_mode: 'Markdown' });
        }
      }
    }
  } catch (err) {
    logger.error("Error in Market Overview poller: " + err.message);
  }
}

module.exports = {
  setMarketOverviewActive,
  startPoller,
  stopPoller
};
