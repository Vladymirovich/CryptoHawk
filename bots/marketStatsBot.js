// bots/marketStatsBot.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
// Обязательно запускаем поллер MarketStats:
require('../MarketStats/poller');

const { Telegraf } = require('telegraf');
const marketStatsEventBus = require('../MarketStats/events');
const logger = require('../logs/apiLogger');

const marketBot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

let chatId = null;

marketBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('Welcome to CryptoHawk Market Stats Bot!\nPress /start to begin receiving notifications.', {
    reply_markup: { keyboard: [['/start']], resize_keyboard: true }
  });
});

marketBot.command('start', (ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('Market Stats Bot is active. You will receive notifications soon.');
});

marketBot.help((ctx) => {
  ctx.reply('This bot sends Market Stats notifications.');
});

marketStatsEventBus.on('notification', async (notification) => {
  if (!chatId) {
    logger.info('MarketStats Bot: Chat ID is not set yet.');
    return;
  }
  if (notification.graph_url && notification.graph_url !== 'N/A') {
    try {
      await marketBot.telegram.sendPhoto(chatId, notification.graph_url, { caption: notification.message, parse_mode: 'Markdown' });
      logger.info('MarketStats Bot: Notification with photo sent successfully.');
    } catch (err) {
      logger.error(`MarketStats Bot error sending photo: ${err.message}`);
      await marketBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' });
    }
  } else {
    marketBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' })
      .then(() => logger.info('MarketStats Bot: Notification sent successfully.'))
      .catch((err) => logger.error(`MarketStats Bot error: ${err.message}`));
  }
});

marketBot.launch()
  .then(() => logger.info('CryptoHawk Market Stats Bot launched and ready.'))
  .catch(err => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => marketBot.stop('SIGINT'));
process.once('SIGTERM', () => marketBot.stop('SIGTERM'));
