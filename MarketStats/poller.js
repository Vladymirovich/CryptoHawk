// MarketStats/poller.js
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');

// Флаг активации события Market Overview
let isMarketOverviewActive = false;

// Функция для установки активации
function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

// Функция поллинга
async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    const eventsData = await getMarketOverviewData();
    let output = "📊 **Market Overview Update**\n\n";
    for (const key in eventsData) {
      const event = eventsData[key];
      output += `• **${event.name}:** ${event.value}\n`;
      output += `Chart: ${event.chartUrl}\n\n`;
    }
    // Здесь необходимо реализовать отправку уведомления через бота MarketStats.
    // Например, можно экспортировать функцию sendMarketOverviewNotification(output) из данного модуля и вызывать её в боте.
    logger.info("Market Overview Update:\n" + output);
  } catch (err) {
    logger.error("Error in Market Overview poller: " + err.message);
  }
}

let pollerInterval = null;
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
  startPoller,
  stopPoller
};
