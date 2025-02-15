
/* =========================
 * bots/cexBot.js (Fixed)
 * ========================= */
require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const { cexEventBus } = require('../CEX/events');
const logger = require('../logs/apiLogger');

const cexBot = new Telegraf(process.env.TELEGRAM_CEX_BOT_TOKEN);

if (!process.env.TELEGRAM_CEX_BOT_TOKEN) {
  console.error("❌ Error: TELEGRAM_CEX_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

let chatId = null;

cexBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply('🚀 Welcome to CryptoHawk CEX Bot! You will receive CEX alerts here.');
});

cexBot.help((ctx) => {
  ctx.reply('ℹ️ This bot sends CEX tracking notifications.');
});

// Проверка и логирование статуса cexEventBus
if (cexEventBus instanceof require('events')) {
  console.log("✅ cexEventBus is properly initialized.");
} else {
  console.error("❌ cexEventBus is NOT initialized correctly.");
}

// Слушаем уведомления, генерируемые модулем CEX
cexEventBus.on('notification', (notification) => {
  if (!chatId) {
    logger.info('⚠️ CEX Bot: Chat ID is not set yet.');
    return;
  }
  cexBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' })
    .then(() => {
      logger.info('✅ CEX Bot: Notification sent successfully.');
    })
    .catch((err) => {
      logger.error(`❌ CEX Bot error: ${err.message}`);
    });
});

// Запуск бота
cexBot.launch()
  .then(() => logger.info('🚀 CryptoHawk CEX Bot launched and ready.'))
  .catch(err => logger.error(`❌ Error launching CEX bot: ${err.message}`));

process.once('SIGINT', () => cexBot.stop('SIGINT'));
process.once('SIGTERM', () => cexBot.stop('SIGTERM'));

module.exports = cexBot;
