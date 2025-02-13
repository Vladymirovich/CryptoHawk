/* =========================
 * bots/marketStatsBot.js (Optimized & Dynamic)
 * ========================= */
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const logger = require('../logs/apiLogger');
const { updateActiveEvents, setNotificationCallback } = require('../MarketStats/poller');

if (!process.env.TELEGRAM_MARKET_BOT_TOKEN) {
  console.error("Error: TELEGRAM_MARKET_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);
let notificationChatId = null;

bot.start(async (ctx) => {
  notificationChatId = ctx.chat.id;
  await ctx.reply("🟦 <b>MarketStats Bot</b>\n\nReceive real-time Market Overview notifications.", { parse_mode: "HTML" });
});

setNotificationCallback(async (messageText, photoBuffer) => {
  if (notificationChatId) {
    try {
      if (photoBuffer) {
        await bot.telegram.sendPhoto(notificationChatId, { source: photoBuffer }, { caption: messageText, parse_mode: "Markdown" });
      } else {
        await bot.telegram.sendMessage(notificationChatId, messageText, { parse_mode: "Markdown" });
      }
    } catch (err) {
      logger.error("Error sending market overview notification: " + err.message);
    }
  }
});

bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

module.exports = bot;
