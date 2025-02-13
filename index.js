require('dotenv').config({ path: './config/.env' });
const logger = require('./logs/apiLogger');

console.log("Starting CryptoHawk project...");

// ✅ Запускаем Admin Bot первым
const adminBot = require('./bots/adminBot');
adminBot.bot.launch()
  .then(() => {
    logger.info("✅ Admin Bot успешно запущен.");

    // ✅ После успешного запуска Admin Bot, запускаем другие боты
    const marketStatsBot = require('./bots/marketStatsBot');
    const cexBot = require('./bots/cexBot');

    marketStatsBot.bot.launch()
      .then(() => logger.info("✅ MarketStats Bot успешно запущен."))
      .catch((error) => logger.error(`❌ Ошибка запуска MarketStats Bot: ${error.message}`));

    cexBot.bot.launch()
      .then(() => logger.info("✅ CEX Bot успешно запущен."))
      .catch((error) => logger.error(`❌ Ошибка запуска CEX Bot: ${error.message}`));
  })
  .catch((error) => logger.error(`❌ Ошибка запуска Admin Bot: ${error.message}`));

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('CryptoHawk bots are running.'));
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
