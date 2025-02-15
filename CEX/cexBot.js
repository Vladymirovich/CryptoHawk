// CEX/cexBot.js
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const { cexEventBus } = require('./CEXScreen'); // Импортируем шину уведомлений из объединённого модуля
const logger = require('../logs/apiLogger');

if (!process.env.TELEGRAM_CEX_BOT_TOKEN) {
  console.error("❌ Error: TELEGRAM_CEX_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

const cexBot = new Telegraf(process.env.TELEGRAM_CEX_BOT_TOKEN);
let chatId = null;

cexBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('🚀 Welcome to CryptoHawk CEX Bot! You will receive CEX tracking notifications here.');
});

cexBot.help((ctx) => {
  ctx.reply('ℹ️ This bot sends CEX tracking notifications.');
});

// Проверяем, что шина уведомлений инициализирована правильно
if (cexEventBus instanceof require('events').EventEmitter) {
  logger.info("✅ cexEventBus is properly initialized.");
} else {
  logger.error("❌ cexEventBus is NOT initialized correctly.");
}

// Слушаем уведомления и отправляем их в чат
cexEventBus.on('notification', (notification) => {
  if (!chatId) {
    logger.info('⚠️ CEX Bot: Chat ID is not set yet.');
    return;
  }
  cexBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' })
    .then(() => logger.info('✅ CEX Bot: Notification sent successfully.'))
    .catch((err) => logger.error(`❌ CEX Bot error: ${err.message}`));
});

cexBot.launch()
  .then(() => logger.info('🚀 CryptoHawk CEX Bot launched and ready.'))
  .catch(err => logger.error(`❌ Error launching CEX bot: ${err.message}`));

process.once('SIGINT', () => cexBot.stop('SIGINT'));
process.once('SIGTERM', () => cexBot.stop('SIGTERM'));

module.exports = cexBot;
