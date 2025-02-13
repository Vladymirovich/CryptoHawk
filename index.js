require('dotenv').config({ path: './config/.env' });
const axios = require('axios');
const express = require('express');
const logger = require('./logs/apiLogger'); // Добавляем логгер
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// Запускаем админ бота первым
const adminBot = require('./bots/adminBot');

// Функция ожидания успешного старта админ бота
async function startBots() {
  try {
    logger.info("🚀 Запускаем Admin Bot...");
    await adminBot.launch();
    logger.info("✅ Admin Bot запущен.");

    // После успешного запуска adminBot – загружаем остальные боты
    const marketStatsBot = require('./bots/marketStatsBot');
    const cexBot = require('./bots/cexBot');

    // Запуск остальных ботов параллельно для увеличения скорости
    await Promise.all([
      (async () => {
        logger.info("🚀 Запускаем MarketStats Bot...");
        await marketStatsBot.launch();
        logger.info("✅ MarketStats Bot запущен.");
      })(),
      (async () => {
        logger.info("🚀 Запускаем CEX Bot...");
        await cexBot.launch();
        logger.info("✅ CEX Bot запущен.");
      })()
    ]);

  } catch (error) {
    logger.error(`❌ Ошибка запуска ботов: ${error.message}`);
  }
}

// Мониторинг состояния сервера
app.get('/', (req, res) => res.send('✅ CryptoHawk bots are running.'));

// Запускаем HTTP-сервер
app.listen(PORT, () => logger.info(`✅ Server running on port ${PORT}`));

// Запускаем боты в правильном порядке
startBots();
