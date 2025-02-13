require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const logger = require('../logs/apiLogger');
const { startPoller, stopPoller, setNotificationCallback } = require('../MarketStats/poller');
const fs = require('fs');

if (!process.env.TELEGRAM_MARKET_BOT_TOKEN) {
  console.error("❌ Error: TELEGRAM_MARKET_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);
let notificationChatId = null;

bot.start(async (ctx) => {
  try {
    if (ctx.message?.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch (err) {
    logger.error("❌ Error deleting /start message: " + err.message);
  }
  notificationChatId = ctx.chat.id;
  await ctx.reply(
    "🟦 <b>MarketStats Bot</b>\n\nReceive real-time Market Overview notifications.",
    { parse_mode: "HTML" }
  );
});

// ====================
// Устанавливаем callback для уведомлений
// ====================
setNotificationCallback(async (messageText, imagePath) => {
  if (!notificationChatId) {
    logger.warn("⚠️ No notification chat id set. Notification not sent.");
    return;
  }

  try {
    if (fs.existsSync(imagePath)) {
      await bot.telegram.sendPhoto(
        notificationChatId,
        { source: imagePath },
        { caption: messageText, parse_mode: "Markdown" }
      );
    } else {
      await bot.telegram.sendMessage(notificationChatId, messageText, { parse_mode: "Markdown" });
    }
  } catch (err) {
    logger.error("❌ Error sending market overview notification: " + err.message);
  }
});

// Запуск бота
bot.launch()
  .then(() => logger.info("🚀 MarketStats Bot launched."))
  .catch((err) => logger.error(`❌ MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
