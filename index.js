require('dotenv').config({ path: './config/.env' });
const logger = require('./logs/apiLogger');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// 🚀 Запускаем админ-бот первым
const adminBot = require('./bots/adminBot');

async function startBots() {
  try {
    logger.info("🚀 Запускаем Admin Bot...");
    await adminBot.launch();
    logger.info("✅ Admin Bot запущен.");

    // Запускаем остальные боты ТОЛЬКО после успешного старта админ-бота
    const marketStatsBot = require('./bots/marketStatsBot');
    const cexBot = require('./bots/cexBot');

    logger.info("🚀 Запускаем MarketStats Bot...");
    await marketStatsBot.launch();
    logger.info("✅ MarketStats Bot запущен.");

    logger.info("🚀 Запускаем CEX Bot...");
    await cexBot.launch();
    logger.info("✅ CEX Bot запущен.");

  } catch (error) {
    logger.error(`❌ Ошибка запуска ботов: ${error.message}`);
  }
}

// Запускаем сервер и ботов
startBots();

app.get('/', (req, res) => res.send('CryptoHawk bots are running.'));
app.listen(PORT, () => logger.info(`✅ Server running on port ${PORT}`));

// Обработка сигналов завершения (SIGINT, SIGTERM)
process.once('SIGINT', () => {
  logger.warn('⚠️ Завершение работы (SIGINT)...');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.warn('⚠️ Завершение работы (SIGTERM)...');
  process.exit(0);
});
