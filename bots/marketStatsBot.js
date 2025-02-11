// ====================
// bots/marketStatsBot.js
// ====================

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const logger = require('../logs/apiLogger');

// Проверка наличия токена для MarketStats бота
if (!process.env.TELEGRAM_MARKET_BOT_TOKEN) {
  console.error("Error: TELEGRAM_MARKET_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// ====================
// ОБРАБОТКА КОМАНДЫ /start
// ====================
bot.start(async (ctx) => {
  try {
    // Пытаемся удалить входящее сообщение с командой /start, чтобы оно не отображалось в чате (если бот имеет соответствующие права)
    if (ctx.message && ctx.message.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch (err) {
    console.error("Error deleting /start message:", err.message);
  }
  // Отправляем приветственное уведомление (без inline-кнопок)
  await ctx.reply(
    "Get important and up-to-date market status information. This data will help you better understand market dynamics and make informed trading decisions.",
    { parse_mode: "HTML" }
  );
});

// ====================
// Запуск бота
// ====================
bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
