// bots/marketStatsBot.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const logger = require('../logs/apiLogger');
const { startPoller, setNotificationCallback } = require('../MarketStats/poller');

if (!process.env.TELEGRAM_MARKET_BOT_TOKEN) {
  console.error("Error: TELEGRAM_MARKET_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// Глобальная переменная для хранения chat_id уведомлений
let notificationChatId = null;

// ОБРАБОТКА КОМАНДЫ /start
bot.start(async (ctx) => {
  try {
    if (ctx.message && ctx.message.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch (err) {
    logger.error("Error deleting /start message: " + err.message);
  }
  notificationChatId = ctx.chat.id;
  await ctx.reply(
    "🟦 <b>MarketStats Bot</b>\n\nReceive real‑time Market Overview notifications.",
    { parse_mode: "HTML" }
  );
});

// Устанавливаем callback для уведомлений из поллера.
// Если передан photoBuffer – отправляем фото с подписью, иначе – текстовое сообщение.
setNotificationCallback(async (messageText, photoBuffer) => {
  if (notificationChatId) {
    try {
      if (photoBuffer) {
        await bot.telegram.sendPhoto(
          notificationChatId,
          { source: photoBuffer },
          { caption: messageText, parse_mode: "Markdown" }
        );
      } else {
        await bot.telegram.sendMessage(notificationChatId, messageText, { parse_mode: "Markdown" });
      }
    } catch (err) {
      logger.error("Error sending market overview notification: " + err.message);
    }
  } else {
    logger.warn("No notification chat id set. Notification not sent.");
  }
});

// Запускаем поллер с интервалом 100000 мс (можно настроить по необходимости)
startPoller(100000);

bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
