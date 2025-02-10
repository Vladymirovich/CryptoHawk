// bots/marketStatsBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const marketStatsEventBus = require('../MarketStats/events');
const logger = require('../logs/apiLogger');

const marketBot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

let chatId = null;

marketBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('Welcome to CryptoHawk Market Stats Bot! You will receive Market Stats alerts here.');
});

marketBot.help((ctx) => {
  ctx.reply('This bot sends Market Stats notifications.');
});

marketStatsEventBus.on('notification', (notification) => {
  if (!chatId) {
    logger.info('MarketStats Bot: Chat ID is not set yet.');
    return;
  }
  marketBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' })
    .then(() => logger.info('MarketStats Bot: Notification sent successfully.'))
    .catch((err) => logger.error(`MarketStats Bot error: ${err.message}`));
});

marketBot.launch()
  .then(() => logger.info('CryptoHawk Market Stats Bot launched and ready.'))
  .catch(err => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => marketBot.stop('SIGINT'));
process.once('SIGTERM', () => marketBot.stop('SIGTERM'));
