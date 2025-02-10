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

// White-list middleware
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('You are not on the admin white-list. Request access from an existing admin.');
  }
  return next();
});

// In-memory настройки для CEX Screen
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// Основное меню (обычная клавиатура)
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

// Обработчики основных кнопок
bot.hears('Market Status', (ctx) => {
  ctx.reply('Market Status filter settings are under development.', getMainKeyboard());
});
bot.hears('OnChain', (ctx) => {
  ctx.reply('OnChain filter settings are under development.', getMainKeyboard());
});
bot.hears('DEX Screen', (ctx) => {
  ctx.reply('DEX Screen filter settings are under development.', getMainKeyboard());
});
bot.hears('News', (ctx) => {
  ctx.reply('News filter settings are under development.', getMainKeyboard());
});
bot.hears('Trends', (ctx) => {
  ctx.reply('Trends filter settings are under development.', getMainKeyboard());
});
bot.hears('Status', (ctx) => {
  ctx.reply('All systems are running normally.', getMainKeyboard());
});

// Обработчик для кнопки "Activate Bots"
bot.hears('Activate Bots', (ctx) => {
  const inlineKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("Market Status", "activate_market_status"),
      Markup.button.callback("OnChain", "activate_onchain")
    ],
    [
      Markup.button.callback("CEX Screen", "activate_cex_screen"),
      Markup.button.callback("DEX Screen", "activate_dex_screen")
    ],
    [
      Markup.button.callback("News", "activate_news"),
      Markup.button.callback("Trends", "activate_trends")
    ]
  ]);
  ctx.reply("Activate Bots:\nSelect a bot to activate:", { reply_markup: inlineKeyboard.reply_markup });
});

// Обработчики для Activate Bots callbacks (пример)
bot.action('activate_market_status', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate Market Status Bot: [Click here](https://t.me/CryptoHawkMarketStatusBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_onchain', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate OnChain Bot: [Click here](https://t.me/CryptoHawkOnChainBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate CEX Screen Bot: [Click here](https://t.me/CryptoHawkCEXBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_dex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate DEX Screen Bot: [Click here](https://t.me/CryptoHawkDEXBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_news', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate News Bot: [Click here](https://t.me/CryptoHawkNewsBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_trends', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Activate Trends Bot: [Click here](https://t.me/CryptoHawkTrendsBot)', { parse_mode: 'Markdown' });
});

// -------------- CEX Screen --------------
// При нажатии на кнопку "CEX Screen" выводится подменю с 6 категориями (каждая с Toggle и Filters)
bot.hears('CEX Screen', (ctx) => {
  ctx.reply('CEX Screen Settings:\nSelect a category to toggle or adjust filters.', { reply_markup: buildCexMenu().reply_markup });
});

// Функция для построения inline-клавиатуры CEX Screen
function buildCexMenu() {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(getLabel("Flow Alerts"), 'cex_toggle_flow_alerts'),
      Markup.button.callback("Filters", 'cex_filters_flow_alerts')
    ],
    [
      Markup.button.callback(getLabel("CEX Tracking"), 'cex_toggle_cex_tracking'),
      Markup.button.callback("Filters", 'cex_filters_cex_tracking')
    ],
    [
      Markup.button.callback(getLabel("All Spot"), 'cex_toggle_all_spot'),
      Markup.button.callback("Filters", 'cex_filters_all_spot')
    ],
    [
      Markup.button.callback(getLabel("All Derivatives"), 'cex_toggle_all_derivatives'),
      Markup.button.callback("Filters", 'cex_filters_all_derivatives')
    ],
    [
      Markup.button.callback(getLabel("All Spot%"), 'cex_toggle_all_spot_percent'),
      Markup.button.callback("Filters", 'cex_filters_all_spot_percent')
    ],
    [
      Markup.button.callback(getLabel("All Derivatives%"), 'cex_toggle_all_derivatives_percent'),
      Markup.button.callback("Filters", 'cex_filters_all_derivatives_percent')
    ]
  ]);
  return { reply_markup: keyboard.reply_markup };
}

// Функция для формирования ярлыка (toggle) для категории
function getLabel(category) {
  const key = camelCase(category);
  const setting = cexSettings[key] || { active: false };
  return setting.active ? `✅${category}` : `❌${category}`;
}

// Преобразование строки в camelCase (например, "Flow Alerts" → "flowAlerts")
function camelCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, chr) => chr);
}

// Toggle callback handlers для каждой категории
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

// Добавляем кнопку "Back" в каждом Filters подменю
function backButton() {
  return Markup.button.callback("← Back", "cex_back_to_menu");
}

// Filters callback для Flow Alerts
bot.action('cex_filters_flow_alerts', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Favorite coins', 'flow_alerts_fav')],
    [Markup.button.callback('Unwanted coins', 'flow_alerts_unw')],
    [Markup.button.callback('AutoTrack', 'flow_alerts_auto')],
    [backButton()]
  ]);
  ctx.reply("Flow Alerts Filters:\nFlows Alert Tracker monitors exchange transactions. Large inflows or outflows may signal upcoming price or sentiment changes.\nSelect an option:", { reply_markup: keyboard.reply_markup });
});
bot.action('flow_alerts_fav', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter your favorite coins for Flow Alerts (comma-separated):');
});
bot.action('flow_alerts_unw', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter unwanted coins for Flow Alerts (comma-separated):');
});
bot.action('flow_alerts_auto', (ctx) => {
  // Переключаем авто-трекинг для Flow Alerts
  // Здесь можно обновить cexSettings.flowAlerts.autoTrack, например:
  cexSettings.flowAlerts.autoTrack = !cexSettings.flowAlerts.autoTrack;
  ctx.answerCbQuery(`AutoTrack for Flow Alerts is now ${cexSettings.flowAlerts.autoTrack ? 'ENABLED' : 'DISABLED'}`);
});

// Filters callback для CEX Tracking
bot.action('cex_filters_cex_tracking', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Favorite coins', 'cex_tracking_fav')],
    [Markup.button.callback('Unwanted coins', 'cex_tracking_unw')],
    [Markup.button.callback('Rate ±5%', 'cex_tracking_rate5')],
    [Markup.button.callback('Rate ±10%', 'cex_tracking_rate10')],
    [Markup.button.callback('60 sec ±1%', 'cex_tracking_rate60')],
    [Markup.button.callback('Activate', 'cex_tracking_activate')],
    [Markup.button.callback('AutoTrack', 'cex_tracking_auto')],
    [backButton()]
  ]);
  ctx.reply("CEX Tracking Filters:\nIf within 15 minutes the difference between buys and sells exceeds $100K and is ≥10% of the 24h volume, you'll receive an alert.\nSelect an option:", { reply_markup: keyboard.reply_markup });
});
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

// Аналогичные Filters подменю для All Spot
bot.action('cex_filters_all_spot', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'all_spot_buy')],
    [Markup.button.callback('Sell', 'all_spot_sell')],
    [Markup.button.callback('5min', 'all_spot_5min')],
    [Markup.button.callback('30min', 'all_spot_30min')],
    [Markup.button.callback('60min', 'all_spot_60min')],
    [Markup.button.callback('24hrs', 'all_spot_24hrs')],
    [backButton()]
  ]);
  ctx.reply("All Spot Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});
// Аналогичные обработчики для All Derivatives, All Spot%, All Derivatives% можно добавить аналогичным образом:
bot.action('cex_filters_all_derivatives', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'all_derivatives_buy')],
    [Markup.button.callback('Sell', 'all_derivatives_sell')],
    [Markup.button.callback('5min', 'all_derivatives_5min')],
    [Markup.button.callback('30min', 'all_derivatives_30min')],
    [Markup.button.callback('60min', 'all_derivatives_60min')],
    [Markup.button.callback('24hrs', 'all_derivatives_24hrs')],
    [backButton()]
  ]);
  ctx.reply("All Derivatives Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});
bot.action('cex_filters_all_spot_percent', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'all_spot_percent_buy')],
    [Markup.button.callback('Sell', 'all_spot_percent_sell')],
    [Markup.button.callback('5min', 'all_spot_percent_5min')],
    [Markup.button.callback('30min', 'all_spot_percent_30min')],
    [Markup.button.callback('60min', 'all_spot_percent_60min')],
    [Markup.button.callback('24hrs', 'all_spot_percent_24hrs')],
    [backButton()]
  ]);
  ctx.reply("All Spot% Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});
bot.action('cex_filters_all_derivatives_percent', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Buy', 'all_derivatives_percent_buy')],
    [Markup.button.callback('Sell', 'all_derivatives_percent_sell')],
    [Markup.button.callback('5min', 'all_derivatives_percent_5min')],
    [Markup.button.callback('30min', 'all_derivatives_percent_30min')],
    [Markup.button.callback('60min', 'all_derivatives_percent_60min')],
    [Markup.button.callback('24hrs', 'all_derivatives_percent_24hrs')],
    [backButton()]
  ]);
  ctx.reply("All Derivatives% Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});

// Обработчик для кнопки "Back" (для всех подменю фильтров)
bot.action('cex_back_to_menu', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageReplyMarkup(buildCexMenu().reply_markup);
});

// Запуск бота: сбрасываем вебхук и запускаем polling
bot.launch()
  .then(() => {
    return bot.telegram.setWebhook('');
  })
  .then(() => {
    logger.info('CryptoHawk Admin Bot launched with CEX Screen submenu and Activate Bots menu.');
  })
  .catch((err) => {
    logger.error(`Error launching admin bot: ${err.message}`);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
