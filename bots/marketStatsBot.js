// bots/marketStatsBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const logger = require('../logs/apiLogger');
const { startPoller, setNotificationCallback } = require('../MarketStats/poller');

if (!process.env.TELEGRAM_MARKET_BOT_TOKEN) {
  console.error("Error: TELEGRAM_MARKET_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

// Глобальная переменная для хранения chat_id, куда будут приходить уведомления
let notificationChatId = null;

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
    logger.error("Error deleting /start message: " + err.message);
  }
  // Сохраняем chat_id для отправки уведомлений
  notificationChatId = ctx.chat.id;

  // Отправляем приветственное уведомление в виде красивого сообщения с inline‑кнопкой "🟦 START"
  await ctx.reply(
    "🟦 <b>MarketStats Bot</b>\n\nPress the <b>🟦 START</b> button below to activate notifications.\n\n" +
    "Receive important and up-to-date market information to help you understand market dynamics and make informed trading decisions.",
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("🟦 START", "start_marketstats")]
      ])
    }
  );
});

// ====================
// ОБРАБОТКА КНОПКИ "🟦 START"
// ====================
bot.action("start_marketstats", async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (err) {
    logger.error("Error answering callback query: " + err.message);
  }
  // Отправляем уведомление об активации – здесь можно запускать логику уведомлений (например, включать поллер)
  await ctx.reply("MarketStats notifications activated. (Poller remains off until manually started if not already active.)");
});

// ====================
// Устанавливаем callback для уведомлений из поллера
// ====================
setNotificationCallback(async (messageText) => {
  if (notificationChatId) {
    try {
      await bot.telegram.sendMessage(notificationChatId, messageText, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error("Error sending market overview notification: " + err.message);
    }
  } else {
    logger.warn("No notification chat id set. Notification not sent.");
  }
});

// Запускаем поллер с интервалом, например, 5 минут (300000 мс)
// (Если событие активировано в админ-боте, поллер будет получать данные; иначе – выводить сообщение о неактивности)
startPoller(300000);

bot.launch()
  .then(() => logger.info("MarketStats Bot launched."))
  .catch((err) => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
