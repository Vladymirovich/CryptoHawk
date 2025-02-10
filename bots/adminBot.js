// bots/adminBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const logger = require('../logs/apiLogger');

// Загрузка white-list администраторов из config/admins.json
const adminFile = path.join(__dirname, '../config/admins.json');
let adminList = [];
try {
  const raw = fs.readFileSync(adminFile, 'utf8');
  adminList = JSON.parse(raw).admins || [];
} catch (err) {
  logger.error(`Error reading admins.json: ${err.message}`);
}

// Создаем экземпляр админ-бота
const bot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN);

// White-list middleware
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('You are not on the admin white-list. Request access from an existing admin.');
  }
  return next();
});

// Основное in-memory хранилище настроек для CEX Screen
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// Функция формирования главного меню (обычная клавиатура)
function getMainKeyboard() {
  return Markup.keyboard([
    ['Market Status', 'OnChain'],
    ['CEX Screen', 'DEX Screen'],
    ['News', 'Trends'],
    ['Activate Bots', 'Status']
  ]).resize();
}

// Обработчики для главного меню
bot.start((ctx) => {
  ctx.reply('Welcome to CryptoHawk Admin Bot!', getMainKeyboard());
});

bot.help((ctx) => {
  ctx.reply('Available commands: Market Status, OnChain, CEX Screen, DEX Screen, News, Trends, Activate Bots, Status', getMainKeyboard());
});

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

// Обработчик для кнопки "Activate Bots" – вывод inline-меню для активации отдельных ботов
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

// Callback-обработчики для Activate Bots (пример)
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

// Обработчик для кнопки "CEX Screen" – вывод подменю с настройками фильтров
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

// Функция для формирования ярлыка с toggle-статусом для каждой категории
function getLabel(category) {
  const key = camelCase(category);
  const setting = cexSettings[key] || { active: false };
  return setting.active ? `✅${category}` : `❌${category}`;
}

// Преобразование строки в camelCase (например, "Flow Alerts" → "flowAlerts")
function camelCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, chr) => chr);
}

// Callback-обработчики для toggle кнопок
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

// Пример callback для кнопки Filters в категории Flow Alerts
bot.action('cex_filters_flow_alerts', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `Flow Alerts Filters:\n\nFlows Alert Tracker is designed to monitor exchange transactions.\nLarge inflows or outflows may signal upcoming price or sentiment changes.\n\nSelect an option:`,
    { reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('Favorite coins', 'flow_alerts_fav')],
      [Markup.button.callback('Unwanted coins', 'flow_alerts_unw')],
      [Markup.button.callback('AutoTrack', 'flow_alerts_auto')]
    ]).reply_markup }
  );
});

// Примеры обработчиков для Flow Alerts Filters
bot.action('flow_alerts_fav', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter your favorite coins (comma-separated, e.g., BTC,ETH,BNB):');
});
bot.action('flow_alerts_unw', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('Please enter unwanted coins (comma-separated):');
});
bot.action('flow_alerts_auto', (ctx) => {
  // Здесь переключаем флаг autoTrack для Flow Alerts, если требуется.
  ctx.answerCbQuery('AutoTrack toggled for Flow Alerts.');
});

// Пример callback для кнопки Filters в категории CEX Tracking
bot.action('cex_filters_cex_tracking', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `CEX Tracking Filters:\n\nIf within 15 minutes the difference between buys and sells exceeds $100K and is at least 10% of the 24h volume, you'll receive an alert.\nFilters include:\n • Rate ±5%\n • Rate ±10%\n • 60 sec ±1%\n • Activate\n • AutoTrack\n • Favorite/Unwanted coins\n\nSelect an option:`,
    { reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('Favorite coins', 'cex_tracking_fav')],
      [Markup.button.callback('Unwanted coins', 'cex_tracking_unw')],
      [Markup.button.callback('Rate ±5%', 'cex_tracking_rate5')],
      [Markup.button.callback('Rate ±10%', 'cex_tracking_rate10')],
      [Markup.button.callback('60 sec ±1%', 'cex_tracking_rate60')],
      [Markup.button.callback('Activate', 'cex_tracking_activate')],
      [Markup.button.callback('AutoTrack', 'cex_tracking_auto')]
    ]).reply_markup }
  );
});

// Пример обработчиков для CEX Tracking Filters
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

// (Аналогичные обработчики можно добавить для остальных категорий Filters: All Spot, All Derivatives, All Spot%, All Derivatives%)

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
