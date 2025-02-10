// bots/marketStatsBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf } = require('telegraf');
const marketStatsEventBus = require('../MarketStats/events');
const logger = require('../logs/apiLogger');

// Объект настроек для MarketStats (все события по умолчанию отключены)
const marketStatsSettings = {
  open_interest: { active: false },
  top_oi: { active: false },
  top_funding: { active: false },
  crypto_etfs_net_flow: { active: false },
  crypto_market_cap: { active: false },
  cmc_fear_greed: { active: false },
  cmc_altcoin_season: { active: false },
  cmc100_index: { active: false },
  eth_gas: { active: false },
  bitcoin_dominance: { active: false }
};

// Запускаем пуллер для MarketStats (он запустится автоматически)
require('../MarketStats/poller');

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
