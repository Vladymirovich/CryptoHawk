/* =========================
 * MarketStats/poller.js (Optimized & Enhanced)
 * ========================= */
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
const fs = require('fs');

let isMarketOverviewActive = false;
let pollerInterval = null;
let notificationCallback = null;

function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

function setNotificationCallback(callback) {
  notificationCallback = callback;
}

async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const events = await getMarketOverviewData();
    for (const event of events) {
      let imageBuffer = null;
      if (event.image && fs.existsSync(event.image)) {
        imageBuffer = fs.readFileSync(event.image);
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
  startPoller,
  stopPoller
};
