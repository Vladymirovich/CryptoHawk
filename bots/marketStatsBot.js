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
bot.start((ctx) => {
  ctx.reply(
    "Welcome to MarketStats Bot.\nPress the 🟦 START button below to activate notifications.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🟦 START", "start_marketstats")]
    ])
  );
});

// ====================
// ОБРАБОТКА КНОПКИ "START" в MarketStats боте
// ====================
bot.action("start_marketstats", (ctx) => {
  ctx.answerCbQuery();
  // Здесь можно добавить запуск логики уведомлений (пуллер не стартует автоматически)
  ctx.reply("MarketStats notifications activated. (Poller remains off until manually started.)");
});

bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
