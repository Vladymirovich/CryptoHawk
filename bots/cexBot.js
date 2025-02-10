require('dotenv').config();
const { Telegraf } = require('telegraf');
const cexEventBus = require('../CEX/events');
const logger = require('../logs/apiLogger');

const cexBot = new Telegraf(process.env.TELEGRAM_CEX_BOT_TOKEN);

let chatId = null;

cexBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('Welcome to CryptoHawk CEX Bot! You will receive CEX alerts here.');
});

cexBot.help((ctx) => {
  ctx.reply('This bot sends CEX tracking notifications.');
});

// Слушаем уведомления, генерируемые модулем CEX
cexEventBus.on('notification', (notification) => {
  if (!chatId) {
    logger.info('CEX Bot: Chat ID is not set yet.');
    return;
  }
  cexBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' })
    .then(() => {
      logger.info('CEX Bot: Notification sent successfully.');
    })
    .catch((err) => {
      logger.error(`CEX Bot error: ${err.message}`);
    });
});

cexBot.launch().then(() => {
  logger.info('CryptoHawk CEX Bot launched and ready to receive alerts.');
});

process.once('SIGINT', () => cexBot.stop('SIGINT'));
process.once('SIGTERM', () => cexBot.stop('SIGTERM'));
