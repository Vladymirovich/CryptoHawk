// ====================
// bots/marketStatsBot.js
// ====================

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
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
    // Пытаемся удалить входящее сообщение с командой /start, чтобы оно не отображалось в чате
    if (ctx.message && ctx.message.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch (err) {
    console.error("Error deleting /start message:", err.message);
  }
  // Отправляем приветственное сообщение с единственной кнопкой "🟦 START"
  await ctx.reply(
    "Press the 🟦 START button below to activate notifications.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🟦 START", "start_marketstats")]
    ])
  );
});

// ====================
// ОБРАБОТКА КНОПКИ "🟦 START"
// ====================
bot.action("start_marketstats", async (ctx) => {
  try {
    // Отвечаем на callback-запрос (чтобы кнопка не висела в ожидании)
    await ctx.answerCbQuery();
  } catch (err) {
    console.error("Error answering callback query:", err.message);
  }
  // Отправляем сообщение об активации уведомлений
  await ctx.reply("MarketStats notifications activated.");
});

bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
