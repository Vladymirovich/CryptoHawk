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

const bot = new Telegraf(process.env.TELEGRAM_ADMIN_BOT_TOKEN);

// White-list middleware
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('You are not on the admin white-list. Request access from an existing admin.');
  }
  return next();
});

// In-memory настройки для CEX Screen – все по умолчанию выключены
const cexSettings = {
  flowAlerts: { active: false, favoriteCoins: [], unwantedCoins: [], autoTrack: false },
  cexTracking: { active: false, favoriteCoins: [], unwantedCoins: [], rate5: false, rate10: false, rate60: false, activate: false, autoTrack: false },
  allSpot: { active: false, filters: { period: [], buy: false, sell: false } },
  allDerivatives: { active: false, filters: { period: [], buy: false, sell: false } },
  allSpotPercent: { active: false, filters: { period: [], buy: false, sell: false } },
  allDerivativesPercent: { active: false, filters: { period: [], buy: false, sell: false } }
};

// Маппинг для категорий – используется для формирования ярлыков toggle‑кнопок
const categoryMapping = {
  "Flow Alerts": "flowAlerts",
  "CEX Tracking": "cexTracking",
  "All Spot": "allSpot",
  "All Derivatives": "allDerivatives",
  "All Spot%": "allSpotPercent",
  "All Derivatives%": "allDerivativesPercent"
};

// Функция формирования ярлыка с toggle‑статусом (использует categoryMapping)
function getLabel(category) {
  const key = categoryMapping[category];
  const setting = cexSettings[key] || { active: false };
  return setting.active ? `✅${category}` : `❌${category}`;
}

// Главное меню как inline-сообщение, кнопки по две в строке
function showMainMenu(ctx) {
  const text = "Welcome to CryptoHawk Admin Bot!\nSelect an option:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "menu_market_status"), Markup.button.callback("OnChain", "menu_onchain")],
    [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
    [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
    [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
}

// Обработчики главного меню
bot.start((ctx) => {
  ctx.reply("Welcome to CryptoHawk Admin Bot!\nSelect an option:", {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("MarketStats", "menu_market_status"), Markup.button.callback("OnChain", "menu_onchain")],
      [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
      [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
      [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
    ]).reply_markup
  });
});

bot.action('menu_market_status', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("MarketStats settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_onchain', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("OnChain settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_dex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("DEX Screen settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_news', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("News settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_trends', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("Trends settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_status', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("All systems are running normally.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});

// Обработчик для "Activate Bots" – inline меню с кнопкой Back
bot.action('menu_activate_bots', (ctx) => {
  const text = "Activate Bots:\nSelect a bot to activate:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "activate_market_status"), Markup.button.callback("OnChain", "activate_onchain")],
    [Markup.button.callback("CEX Screen", "activate_cex_screen"), Markup.button.callback("DEX Screen", "activate_dex_screen")],
    [Markup.button.callback("News", "activate_news"), Markup.button.callback("Trends", "activate_trends")],
    [Markup.button.callback("← Back", "back_from_activate")]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
});
bot.action('back_from_activate', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});
bot.action('activate_market_status', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate MarketStats Bot: [Click here](https://t.me/CryptoHawkMarketStatusBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_onchain', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate OnChain Bot: [Click here](https://t.me/CryptoHawkOnChainBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate CEX Screen Bot: [Click here](https://t.me/CryptoHawkCEXBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_dex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate DEX Screen Bot: [Click here](https://t.me/CryptoHawkDEXBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_news', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate News Bot: [Click here](https://t.me/CryptoHawkNewsBot)', { parse_mode: 'Markdown' });
});
bot.action('activate_trends', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('Activate Trends Bot: [Click here](https://t.me/CryptoHawkTrendsBot)', { parse_mode: 'Markdown' });
});

// Обработчик для "CEX Screen" – вывод подменю CEX Screen
bot.action('menu_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  showCexScreenMenu(ctx);
});

// Функция отображения подменю CEX Screen
function showCexScreenMenu(ctx) {
  const text = "CEX Screen Settings:\nSelect a category to toggle or adjust filters.";
  try {
    ctx.editMessageText(text, { reply_markup: buildCexMenu().reply_markup });
  } catch (err) {
    if (!err.description.includes("message is not modified")) {
      logger.error(err.message);
    }
  }
}

// Функция построения inline‑клавиатуры для CEX Screen
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
    ],
    [
      Markup.button.callback("← Back", "back_from_cex")
    ]
  ]);
  return { reply_markup: keyboard.reply_markup };
}

// Toggle callback handlers для CEX Screen
bot.action('cex_toggle_flow_alerts', (ctx) => {
  cexSettings.flowAlerts.active = !cexSettings.flowAlerts.active;
  ctx.answerCbQuery(`Flow Alerts now ${cexSettings.flowAlerts.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});
bot.action('cex_toggle_cex_tracking', (ctx) => {
  cexSettings.cexTracking.active = !cexSettings.cexTracking.active;
  ctx.answerCbQuery(`CEX Tracking now ${cexSettings.cexTracking.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});
bot.action('cex_toggle_all_spot', (ctx) => {
  cexSettings.allSpot.active = !cexSettings.allSpot.active;
  ctx.answerCbQuery(`All Spot now ${cexSettings.allSpot.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});
bot.action('cex_toggle_all_derivatives', (ctx) => {
  cexSettings.allDerivatives.active = !cexSettings.allDerivatives.active;
  ctx.answerCbQuery(`All Derivatives now ${cexSettings.allDerivatives.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});
bot.action('cex_toggle_all_spot_percent', (ctx) => {
  cexSettings.allSpotPercent.active = !cexSettings.allSpotPercent.active;
  ctx.answerCbQuery(`All Spot% now ${cexSettings.allSpotPercent.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});
bot.action('cex_toggle_all_derivatives_percent', (ctx) => {
  cexSettings.allDerivativesPercent.active = !cexSettings.allDerivativesPercent.active;
  ctx.answerCbQuery(`All Derivatives% now ${cexSettings.allDerivativesPercent.active ? 'ENABLED' : 'DISABLED'}`);
  showCexScreenMenu(ctx);
});

// --- Filters callbacks ---
// Фильтры для Flow Alerts
bot.action('cex_filters_flow_alerts', (ctx) => {
  ctx.answerCbQuery();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Favorite coins', 'flow_alerts_fav')],
    [Markup.button.callback('Unwanted coins', 'flow_alerts_unw')],
    [Markup.button.callback('AutoTrack', 'flow_alerts_auto')],
    [backButton()]
  ]);
  ctx.editMessageText("Flow Alerts Filters:\nFlows Alert Tracker monitors exchange transactions. Large inflows or outflows may signal price/sentiment changes.\nSelect an option:", { reply_markup: keyboard.reply_markup });
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
  cexSettings.flowAlerts.autoTrack = !cexSettings.flowAlerts.autoTrack;
  ctx.answerCbQuery(`Flow Alerts AutoTrack is now ${cexSettings.flowAlerts.autoTrack ? 'ENABLED' : 'DISABLED'}`);
});

// Фильтры для CEX Tracking
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
  ctx.editMessageText("CEX Tracking Filters:\nIf within 15 minutes the difference between buys and sells exceeds $100K and is ≥10% of the 24h volume, you'll receive an alert.\nSelect an option:", { reply_markup: keyboard.reply_markup });
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

// Фильтры для All Spot
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
  ctx.editMessageText("All Spot Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});

// Фильтры для All Derivatives
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
  ctx.editMessageText("All Derivatives Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});

// Фильтры для All Spot%
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
  ctx.editMessageText("All Spot% Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});

// Фильтры для All Derivatives%
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
  ctx.editMessageText("All Derivatives% Filters:\nSelect options for period and trade type:", { reply_markup: keyboard.reply_markup });
});

// Функция для создания кнопки "← Back" в подменю фильтров
function backButton() {
  return Markup.button.callback("← Back", "cex_back_to_menu");
}

// Callback для кнопки "← Back" во всех фильтровых подменю
bot.action('cex_back_to_menu', (ctx) => {
  ctx.answerCbQuery();
  showCexScreenMenu(ctx);
});

// Сброс вебхука и запуск бота
bot.launch()
  .then(() => bot.telegram.setWebhook(''))
  .then(() => {
    logger.info('CryptoHawk Admin Bot launched with updated menus.');
  })
  .catch((err) => {
    logger.error(`Error launching admin bot: ${err.message}`);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
