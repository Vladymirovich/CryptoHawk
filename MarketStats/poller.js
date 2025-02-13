const logger = require('../logs/apiLogger');
const { fetchMarketData } = require('./MarketOverviewEvent');

let pollerInterval = null;
let activeEvents = new Set();
let notificationCallback = null;

// ✅ Установка Callback для отправки уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// ✅ Установка активных событий и запуск Poller
function setActiveEvents(events) {
  activeEvents = new Set(events);
  restartPoller();
}

// ✅ Основная логика Poller
async function pollMarketOverview() {
  if (activeEvents.size === 0) {
    logger.info("⚠ Нет активных событий. Пропускаем опрос.");
    return;
  }

  try {
    const eventsData = await fetchMarketData([...activeEvents]);

    for (const event of eventsData) {
      if (!activeEvents.has(event.key)) continue;

      let imageBuffer = null;
      if (event.image) {
        try {
          const res = await fetch(event.image);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
          } else {
            logger.error(`❌ Ошибка загрузки изображения для ${event.key}: ${res.status}`);
          }
        } catch (imgErr) {
          logger.error(`❌ Ошибка при загрузке изображения для ${event.key}: ${imgErr.message}`);
        }
      }

      if (notificationCallback) {
        await notificationCallback(event.text, imageBuffer);
      } else {
        logger.warn("⚠ Уведомление не установлено.");
      }
    }
  } catch (err) {
    logger.error(`❌ Ошибка в Poller: ${err.message}`);
  }
}

// ✅ Запуск Poller
function startPoller(intervalMs, events) {
  if (!events || events.length === 0) {
    logger.warn("⚠ Попытка запуска Poller без активных событий!");
    return;
  }

  setActiveEvents(events);
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`🚀 Poller запущен с интервалом ${intervalMs} мс.`);
}

// ✅ Перезапуск Poller
function restartPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = setInterval(pollMarketOverview, 100000);
  }
}

// ✅ Остановка Poller
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("🛑 Poller остановлен.");
  }
}

module.exports = {
  setNotificationCallback,
  startPoller,
  stopPoller
};
