require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const logger = require('../logs/apiLogger');

const adminFile = path.join(__dirname, '../config/admins.json');
let adminList = [];
try {
  const raw = fs.readFileSync(adminFile, 'utf8');
  adminList = JSON.parse(raw).admins || [];
} catch (err) {
  logger.error(`Error reading admins.json: ${err.message}`);
}

const bot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN);

// White-list проверка
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('You are not on the admin white-list. Request access from admin.');
  }
  return next();
});

// Пример главного меню
function getMainKeyboard() {
  return Markup.keyboard([
    ['Market Status', 'OnChain'],
    ['CEX Screen', 'DEX Screen'],
    ['News', 'Trends'],
    ['Activate Bots', 'Status']
  ]).resize();
}

bot.start((ctx) => {
  ctx.reply('Welcome to CryptoHawk Admin Bot!', getMainKeyboard());
});
bot.help((ctx) => {
  ctx.reply('Available commands: Market Status, OnChain, CEX Screen, DEX Screen, News, Trends, Activate Bots, Status', getMainKeyboard());
});

// Пример обработчика для CEX Screen (подменю)
bot.hears('CEX Screen', (ctx) => {
  ctx.reply('CEX Screen Settings:\nSelect category to enable/disable or open filters.', buildCexMenu());
});

// Функция для построения inline-клавиатуры CEX Screen
function buildCexMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.callbackButton(getLabelFlowAlerts(), 'cex_toggle_flow_alerts'),
      Markup.callbackButton('Filters', 'cex_filters_flow_alerts')
    ],
    [
      Markup.callbackButton(getLabelCexTracking(), 'cex_toggle_cex_tracking'),
      Markup.callbackButton('Filters', 'cex_filters_cex_tracking')
    ],
    [
      Markup.callbackButton(getLabelAllSpot(), 'cex_toggle_all_spot'),
      Markup.callbackButton('Filters', 'cex_filters_all_spot')
    ],
    [
      Markup.callbackButton(getLabelAllDerivatives(), 'cex_toggle_all_derivatives'),
      Markup.callbackButton('Filters', 'cex_filters_all_derivatives')
    ],
    [
      Markup.callbackButton(getLabelAllSpotPercent(), 'cex_toggle_all_spot_percent'),
      Markup.callbackButton('Filters', 'cex_filters_all_spot_percent')
    ],
    [
      Markup.callbackButton(getLabelAllDerivativesPercent(), 'cex_toggle_all_derivatives_percent'),
      Markup.callbackButton('Filters', 'cex_filters_all_derivatives_percent')
    ]
  ]);
}

function getLabelFlowAlerts() {
  return cexSettings.flowAlerts.active ? '✅Flow Alerts' : '❌Flow Alerts';
}
function getLabelCexTracking() {
  return cexSettings.cexTracking.active ? '✅CEX Tracking' : '❌CEX Tracking';
}
function getLabelAllSpot() {
  return cexSettings.allSpot.active ? '✅All Spot' : '❌All Spot';
}
function getLabelAllDerivatives() {
  return cexSettings.allDerivatives.active ? '✅All Derivatives' : '❌All Derivatives';
}
function getLabelAllSpotPercent() {
  return cexSettings.allSpotPercent.active ? '✅All Spot%' : '❌All Spot%';
}
function getLabelAllDerivativesPercent() {
  return cexSettings.allDerivativesPercent.active ? '✅All Derivatives%' : '❌All Derivatives%';
}

// Toggle callbacks для CEX Screen
bot.action('cex_toggle_flow_alerts', (ctx) => {
  cexSettings.flowAlerts.active = !cexSettings.flowAlerts.active;
  ctx.answerCbQuery(`Flow Alerts now ${cexSettings.flowAlerts.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});
bot.action('cex_toggle_cex_tracking', (ctx) => {
  cexSettings.cexTracking.active = !cexSettings.cexTracking.active;
  ctx.answerCbQuery(`CEX Tracking now ${cexSettings.cexTracking.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});
bot.action('cex_toggle_all_spot', (ctx) => {
  cexSettings.allSpot.active = !cexSettings.allSpot.active;
  ctx.answerCbQuery(`All Spot now ${cexSettings.allSpot.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});
bot.action('cex_toggle_all_derivatives', (ctx) => {
  cexSettings.allDerivatives.active = !cexSettings.allDerivatives.active;
  ctx.answerCbQuery(`All Derivatives now ${cexSettings.allDerivatives.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});
bot.action('cex_toggle_all_spot_percent', (ctx) => {
  cexSettings.allSpotPercent.active = !cexSettings.allSpotPercent.active;
  ctx.answerCbQuery(`All Spot% now ${cexSettings.allSpotPercent.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});
bot.action('cex_toggle_all_derivatives_percent', (ctx) => {
  cexSettings.allDerivativesPercent.active = !cexSettings.allDerivativesPercent.active;
  ctx.answerCbQuery(`All Derivatives% now ${cexSettings.allDerivativesPercent.active ? 'ENABLED' : 'DISABLED'}`);
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});

// Пример Filters callback для Flow Alerts
bot.action('cex_filters_flow_alerts', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `Flow Alerts Filters\n\nFlows Alert Tracker is designed to monitor exchange transactions.\nLarge inflows or outflows may indicate impending price or market sentiment changes.\n\nSelect an option:`,
    Markup.inlineKeyboard([
      [Markup.callbackButton('Favorite coins', 'flow_alerts_fav')],
      [Markup.callbackButton('Unwanted coins', 'flow_alerts_unw')],
      [Markup.callbackButton('AutoTrack', 'flow_alerts_auto')]
    ])
  );
});

bot.action('flow_alerts_fav', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter your favorite coins (comma-separated, e.g., BTC,ETH,BNB):');
});
bot.action('flow_alerts_unw', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter unwanted coins (comma-separated):');
});
bot.action('flow_alerts_auto', (ctx) => {
  // Toggle autoTrack for Flow Alerts
  // Для примера: просто логируем изменение
  ctx.answerCbQuery('AutoTrack toggled for Flow Alerts.');
});


// Пример Filters callback для CEX Tracking
bot.action('cex_filters_cex_tracking', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `CEX Tracking Filters\n\nIf within 15 minutes the difference between buys and sells exceeds $100K and is ≥10% of the 24h volume, you'll receive an alert.\nFilters:\n • Rate ±5%\n • Rate ±10%\n • 60 sec ±1%\n • Activate\n • AutoTrack\n • Favorite/Unwanted coins\n\nSelect an option:`,
    Markup.inlineKeyboard([
      [Markup.callbackButton('Favorite coins', 'cex_tracking_fav')],
      [Markup.callbackButton('Unwanted coins', 'cex_tracking_unw')],
      [Markup.callbackButton('Rate ±5%', 'cex_tracking_rate5')],
      [Markup.callbackButton('Rate ±10%', 'cex_tracking_rate10')],
      [Markup.callbackButton('60 sec ±1%', 'cex_tracking_rate60')],
      [Markup.callbackButton('Activate', 'cex_tracking_activate')],
      [Markup.callbackButton('AutoTrack', 'cex_tracking_auto')]
    ])
  );
});

// Примеры обработчиков для cex_tracking фильтров
bot.action('cex_tracking_fav', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter favorite coins for CEX Tracking (comma-separated):');
});
bot.action('cex_tracking_unw', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter unwanted coins for CEX Tracking (comma-separated):');
});
bot.action('cex_tracking_rate5', (ctx) => {
  ctx.answerCbQuery('Rate ±5% filter toggled for CEX Tracking.');
});
bot.action('cex_tracking_rate10', (ctx) => {
  ctx.answerCbQuery('Rate ±10% filter toggled for CEX Tracking.');
});
bot.action('cex_tracking_rate60', (ctx) => {
  ctx.answerCbQuery('60 sec ±1% filter toggled for CEX Tracking.');
});
bot.action('cex_tracking_activate', (ctx) => {
  ctx.answerCbQuery('Activate filter toggled for CEX Tracking.');
});
bot.action('cex_tracking_auto', (ctx) => {
  ctx.answerCbQuery('AutoTrack toggled for CEX Tracking.');
});

// Аналогичные callbacks можно добавить для остальных категорий (All Spot, All Derivatives, All Spot%, All Derivatives%).

bot.launch()
  .then(() => {
    // Сбрасываем вебхук, чтобы избежать конфликтов
    return bot.telegram.setWebhook('');
  })
  .then(() => {
    logger.info('CryptoHawk Admin Bot launched with CEX Screen submenu.');
  })
  .catch((err) => {
    logger.error(`Error launching admin bot: ${err.message}`);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
