require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const logger = require('../logs/apiLogger');

// Загрузка white-list администраторов
const adminFile = path.join(__dirname, '../config/admins.json');
let adminList = [];
try {
  const raw = fs.readFileSync(adminFile, 'utf8');
  adminList = JSON.parse(raw).admins || [];
} catch (err) {
  logger.error(`Error reading admins.json: ${err.message}`);
}

const bot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN);

// Middleware: проверка white-list
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('You are not on the admin white-list. Request access from admin.');
  }
  return next();
});

// Храним настройки для CEX Screen:
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

function getMainKeyboard() {
  return Markup.keyboard([
    ['Market Status', 'OnChain'],
    ['CEX Screen', 'DEX Screen'],
    ['News', 'Trends'],
    ['Activate Bots', 'Status']
  ]).resize().extra();
}

bot.start((ctx) => {
  ctx.reply('Welcome to CryptoHawk Admin Bot!', getMainKeyboard());
});

bot.help((ctx) => {
  ctx.reply(
    'Available commands:\n' +
    'Market Status, OnChain\nCEX Screen, DEX Screen\nNews, Trends\nActivate Bots, Status',
    getMainKeyboard()
  );
});

// Обработчики главного меню
bot.hears('Market Status', (ctx) => {
  ctx.reply('Under development', getMainKeyboard());
});
bot.hears('OnChain', (ctx) => {
  ctx.reply('Under development', getMainKeyboard());
});
bot.hears('DEX Screen', (ctx) => {
  ctx.reply('Under development', getMainKeyboard());
});
bot.hears('News', (ctx) => {
  ctx.reply('Under development', getMainKeyboard());
});
bot.hears('Trends', (ctx) => {
  ctx.reply('Under development', getMainKeyboard());
});
bot.hears('Status', (ctx) => {
  ctx.reply('All systems are running normally.', getMainKeyboard());
});

// Кнопка "Activate Bots"
bot.hears('Activate Bots', (ctx) => {
  const inlineKeyboard = Markup.inlineKeyboard([
    [
      Markup.callbackButton('Market Status', 'activate_market_status'),
      Markup.callbackButton('OnChain', 'activate_onchain')
    ],
    [
      Markup.callbackButton('CEX Screen', 'activate_cex_screen'),
      Markup.callbackButton('DEX Screen', 'activate_dex_screen')
    ],
    [
      Markup.callbackButton('News', 'activate_news'),
      Markup.callbackButton('Trends', 'activate_trends')
    ]
  ]);
  ctx.reply('Select the bot to activate:', inlineKeyboard.extra());
});

// CEX Screen
bot.hears('CEX Screen', (ctx) => {
  ctx.reply('CEX Screen Settings:\nSelect category to enable/disable or open filters.', buildCexMenu());
});

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
  ]).extra();
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

// ----- Toggle callbacks -----
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

// ----- Filters callbacks -----
bot.action('cex_filters_flow_alerts', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `Flow Alerts Filters\n\n(Flows Alert Tracker предназначен для мониторинга биржевых транзакций.\nКрупные выводы или вводы могут сигнализировать о возможных изменениях цен.)`,
    Markup.inlineKeyboard([
      [Markup.callbackButton('Favorite coins', 'flow_alerts_fav')],
      [Markup.callbackButton('Unwanted coins', 'flow_alerts_unw')],
      [Markup.callbackButton('AutoTrack', 'flow_alerts_auto')]
    ]).extra()
  );
});

// Пример обработки
bot.action('flow_alerts_fav', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Введите избранные монеты (через запятую).');
});
bot.action('flow_alerts_unw', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Введите нежелательные монеты (через запятую).');
});
bot.action('flow_alerts_auto', (ctx) => {
  // здесь бы toggl'или cexSettings.flowAlerts.autoTrack = !cexSettings.flowAlerts.autoTrack;
  ctx.answerCbQuery('AutoTrack toggled');
});

// Аналогично для cex_tracking, all_spot, all_derivatives, etc.

bot.action('cex_filters_cex_tracking', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `CEX Tracking Filters\n\nЕсли в течение 15 минут разница между покупками и продажами >100k$ и >=10% суточного объёма.\nФильтры:\n • Rate ±5%\n • Rate ±10%\n • 60 sec ±1%\n • Activate\n • AutoTrack\n • Favorite/Unwanted Coins`,
    // ... inlineKeyboard
  );
});

// ... и так далее

bot.launch().then(() => {
  logger.info('CryptoHawk Admin Bot (CEX Screen) launched.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
