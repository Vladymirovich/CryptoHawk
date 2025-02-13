/* =========================
 * MarketStats/poller.js (Bugfixes & Enhanced Formatting)
 * ========================= */
const { getMarketOverviewData } = require('./MarketOverviewEvent');
const logger = require('../logs/apiLogger');
const fs = require('fs').promises;
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const chartDir = path.join(__dirname, '../charts');
let isMarketOverviewActive = false;
let pollerInterval = null;
let notificationCallback = null;

// Создание директории, если её нет
async function ensureChartDirExists() {
  try {
    await fs.mkdir(chartDir, { recursive: true });
    logger.info("📂 Charts directory checked/created.");
  } catch (error) {
    logger.error("❌ Error creating charts directory:", error.message);
  }
}

// Карта файлов-графиков
const chartFiles = {
  dominance: "btc_dominance.png",
  fear_and_greed: "fear_greed.png",
  cmc100_index: "cmc100.png"
};

// Загрузка и обновление графиков
async function updateCharts() {
  await ensureChartDirExists();
  for (const [key, filename] of Object.entries(chartFiles)) {
    const filePath = path.join(chartDir, filename);
    const url = `https://coinmarketcap.com/charts/${key}/?w=250&h=150`;

    try {
      logger.info(`📥 Downloading ${filename}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      logger.info(`✅ Updated: ${filename}`);
    } catch (error) {
      logger.error(`❌ Error updating ${filename}:`, error.message);
    }
  }
}

// Устанавливаем активность Market Overview
function setMarketOverviewActive(active) {
  isMarketOverviewActive = active;
  logger.info(`Market Overview active: ${active}`);
}

// Устанавливаем callback для уведомлений
function setNotificationCallback(callback) {
  notificationCallback = callback;
}

// Форматирование текста уведомлений
function formatEventText(event) {
  if (typeof event.text === 'object') {
    return JSON.stringify(event.text, null, 2); // Форматирование JSON в читаемый текст
  }
  return event.text;
}

// Основная функция обработки Market Overview
async function pollMarketOverview() {
  if (!isMarketOverviewActive) {
    logger.info("Market Overview is not active. Skipping poll cycle.");
    return;
  }
  try {
    await updateCharts(); // Обновляем графики перед отправкой уведомлений
    const events = await getMarketOverviewData();

    for (const event of events) {
      const filePath = path.join(chartDir, chartFiles[event.key] || "default.png");
      let imageBuffer = null;

      try {
        imageBuffer = await fs.readFile(filePath);
      } catch (err) {
        logger.warn(`⚠️ Image not found for event ${event.key}: ${err.message}`);
      }

      if (notificationCallback) {
        await notificationCallback(formatEventText(event), imageBuffer);
      } else {
        logger.warn("⚠️ Notification callback not set.");
      }
    }
  } catch (err) {
    logger.error("❌ Error in Market Overview poller:", err.message);
  }
}

// Запускаем поллер с интервалом 100000 мс
function startPoller(intervalMs = 100000) {
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(pollMarketOverview, intervalMs);
  logger.info(`🚀 Market Overview poller started with interval ${intervalMs} ms.`);
}

// Останавливаем поллер
function stopPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("⏹ Market Overview poller stopped.");
  }
}

module.exports = {
  setMarketOverviewActive,
  setNotificationCallback,
  startPoller,
  stopPoller
};
