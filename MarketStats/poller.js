/* =========================
 * MarketStats/poller.js (Optimized & Dynamic)
 * ========================= */
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

let isMarketOverviewActive = false;
let pollerInterval = null;
let notificationCallback = null;
let activeEvents = new Set(); // Хранит активные события

function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

function setNotificationCallback(callback) {
  notificationCallback = callback;
}

function updateActiveEvents(events) {
  activeEvents = new Set(events);
  if (activeEvents.size > 0) {
    startPoller(100000);
  } else {
    stopPoller();
  }
}

async function pollMarketOverview() {
  if (!isMarketOverviewActive || activeEvents.size === 0) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const events = await getMarketOverviewData(Array.from(activeEvents));

    for (const event of events) {
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
            logger.error(`Failed to fetch image for event ${event.key}: ${res.status}`);
          }
        } catch (imgErr) {
          logger.error(`Error fetching image for event ${event.key}: ${imgErr.message}`);
        }
      }

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

function startPoller(intervalMs) {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`Market Overview poller started with interval ${intervalMs} ms.`);
}

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
  updateActiveEvents,
  startPoller,
  stopPoller
};
