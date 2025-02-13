const logger = require('../logs/apiLogger');
const { fetchMarketData } = require('./MarketOverviewEvent');
const fetch = require('node-fetch');

let pollerInterval = null;
let activeEvents = new Set();
let notificationCallback = null;

// 🔄 Устанавливаем Callback для уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// 🛠 Устанавливаем активные события и перезапускаем Poller
function setActiveEvents(events) {
  if (!events || events.length === 0) {
    logger.warn("⚠ Попытка установки пустого списка событий в Poller.");
    return;
  }
  activeEvents = new Set(events);
  restartPoller();
}

// 🚀 Основная функция Polling
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

// 🛠 Запуск Poller
function startPoller(intervalMs, events) {
  if (!events || events.length === 0) {
    logger.warn("⚠ Попытка запуска Poller без активных событий!");
    return;
  }

  setActiveEvents(events);
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = s
