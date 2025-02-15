require('dotenv').config({ path: './config/.env' });
const logger = require('./logs/apiLogger');
const express = require('express');

console.log("🚀 Starting CryptoHawk project...");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Функция для запуска бота с логированием
async function launchBot(bot, name) {
  try {
    await bot.launch();
    logger.info(`✅ ${name} успешно запущен.`);
  } catch (error) {
    logger.error(`❌ Ошибка запуска ${name}: ${error.message}`);
  }
}

// ✅ Запускаем Admin Bot первым
(async () => {
  try {
    const adminBot = require('./bots/adminBot');
    await launchBot(adminBot.bot, "Admin Bot");

    // ✅ После успешного запуска Admin Bot, запускаем другие боты
    const marketStatsBot = require('./bots/marketStatsBot');
    const cexBot = require('./CEX/cexBot');

    await launchBot(marketStatsBot.bot, "MarketStats Bot");
    await launchBot(cexBot.bot, "CEX Bot");

  } catch (error) {
    logger.error(`❌ Критическая ошибка при запуске ботов: ${error.message}`);
  }
})();

// ✅ Запускаем Express-сервер для проверки состояния ботов
app.get('/', (req, res) => res.send('CryptoHawk bots are running.'));
app.listen(PORT, () => logger.info(`✅ Server running on port ${PORT}`));
