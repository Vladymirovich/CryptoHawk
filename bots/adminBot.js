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

/* --------------------------
   IN-MEMORY НАСТРОЙКИ
-------------------------- */

// Настройки для CEX Screen (все по умолчанию выключены)
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// Настройки для MarketStats (все по умолчанию выключены)
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

// Маппинги для формирования ярлыков
const cexCategoryMapping = {
  "Flow Alerts": "flowAlerts",
  "CEX Tracking": "cexTracking",
  "All Spot": "allSpot",
  "All Derivatives": "allDerivatives",
  "All Spot%": "allSpotPercent",
  "All Derivatives%": "allDerivativesPercent"
};

const marketStatsCategoryMapping = {
  "Open Interest": "open_interest",
  "Top OI": "top_oi",
  "Top Funding": "top_funding",
  "Crypto ETFs Net Flow": "crypto_etfs_net_flow",
  "Crypto Market Cap": "crypto_market_cap",
  "CMC Fear & Greed": "cmc_fear_greed",
  "CMC Altcoin Season": "cmc_altcoin_season",
  "CMC 100 Index": "cmc100_index",
  "ETH Gas": "eth_gas",
  "Bitcoin Dominance": "bitcoin_dominance"
};

/* --------------------------
   ГЛАВНОЕ МЕНЮ (INLINE)
-------------------------- */
function showMainMenu(ctx) {
  const text = "Welcome to CryptoHawk Admin Bot!\nSelect an option:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "menu_marketstats"), Markup.button.callback("OnChain", "menu_onchain")],
    [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
    [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
    [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
}

/* --------------------------
   ОБРАБОТЧИКИ ГЛАВНОГО МЕНЮ
-------------------------- */
bot.start((ctx) => {
  ctx.reply("Welcome to CryptoHawk Admin Bot!\nSelect an option:", {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("MarketStats", "menu_marketstats"), Markup.button.callback("OnChain", "menu_onchain")],
      [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
      [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
      [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
    ]).reply_markup
  });
});

bot.action('menu_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMarketStatsMenu(ctx);
});
bot.action('menu_onchain', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("OnChain settings are under development.\nReturning to main menu...", { reply_markup: {} });
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  showCexScreenMenu(ctx);
});
bot.action('menu_dex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("DEX Screen settings are under development.\nReturning to main menu...", { reply_markup: {} });
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_news', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("News settings are under development.\nReturning to main menu...", { reply_markup: {} });
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_trends', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("Trends settings are under development.\nReturning to main menu...", { reply_markup: {} });
  setTimeout(() => showMainMenu(ctx), 2000);
});
bot.action('menu_status', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("All systems are running normally.\nReturning to main menu...", { reply_markup: {} });
  setTimeout(() => showMainMenu(ctx), 2000);
});

/* --------------------------
   ACTIVATE BOTS МЕНЮ
-------------------------- */
// Используем URL-кнопки для автоматического перехода к ботам
bot.action('menu_activate_bots', (ctx) => {
  const text = "Activate Bots:\nSelect a bot to activate:";
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.url("MarketStats", "https://t.me/CryptoHawk_market_bot"),
      Markup.button.url("OnChain", "https://t.me/CryptoHawkOnChainBot")
    ],
    [
      Markup.button.url("CEX Screen", "https://t.me/CryptoHawk_cex_bot"),
      Markup.button.url("DEX Screen", "https://t.me/CryptoHawkDEXBot")
    ],
    [
      Markup.button.url("News", "https://t.me/CryptoHawkNewsBot"),
      Markup.button.url("Trends", "https://t.me/CryptoHawkTrendsBot")
    ],
    [
      Markup.button.callback("← Back", "back_from_activate")
    ]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
});
bot.action('back_from_activate', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});

/* --------------------------
   CEX SCREEN МЕНЮ
-------------------------- */
bot.action('menu_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  showCexScreenMenu(ctx);
});

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

function buildCexMenu() {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(getToggleLabel("Flow Alerts"), 'cex_toggle_flow_alerts'),
      Markup.button.callback("Filters", 'cex_filters_flow_alerts')
    ],
    [
      Markup.button.callback(getToggleLabel("CEX Tracking"), 'cex_toggle_cex_tracking'),
      Markup.button.callback("Filters", 'cex_filters_cex_tracking')
    ],
    [
      Markup.button.callback(getToggleLabel("All Spot"), 'cex_toggle_all_spot'),
      Markup.button.callback("Filters", 'cex_filters_all_spot')
    ],
    [
      Markup.button.callback(getToggleLabel("All Derivatives"), 'cex_toggle_all_derivatives'),
      Markup.button.callback("Filters", 'cex_filters_all_derivatives')
    ],
    [
      Markup.button.callback(getToggleLabel("All Spot%"), 'cex_toggle_all_spot_percent'),
      Markup.button.callback("Filters", 'cex_filters_all_spot_percent')
    ],
    [
      Markup.button.callback(getToggleLabel("All Derivatives%"), 'cex_toggle_all_derivatives_percent'),
      Markup.button.callback("Filters", 'cex_filters_all_derivatives_percent')
    ],
    [
      Markup.button.callback("← Back", "back_from_cex")
    ]
  ]);
  return { reply_markup: keyboard.reply_markup };
}

function getToggleLabel(category) {
  const key = cexCategoryMapping[category];
  const setting = cexSettings[key] || { active: false };
  return setting.active ? `✅${category}` : `❌${category}`;
}

bot.action('back_from_cex', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});

// Toggle callbacks для CEX Screen
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

/* --------------------------
   MARKETSTATS МЕНЮ
-------------------------- */
bot.action('menu_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMarketStatsMenu(ctx);
});

function showMarketStatsMenu(ctx) {
  const text = "MarketStats Settings:\nSelect an event to toggle activation:";
  ctx.editMessageText(text, { reply_markup: buildMarketStatsMenu().reply_markup });
}

function buildMarketStatsMenu() {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(getMarketToggleLabel("Open Interest"), "toggle_open_interest"),
      Markup.button.callback(getMarketToggleLabel("Top OI"), "toggle_top_oi")
    ],
    [
      Markup.button.callback(getMarketToggleLabel("Top Funding"), "toggle_top_funding"),
      Markup.button.callback(getMarketToggleLabel("Crypto ETFs Net Flow"), "toggle_crypto_etfs_net_flow")
    ],
    [
      Markup.button.callback(getMarketToggleLabel("Crypto Market Cap"), "toggle_crypto_market_cap"),
      Markup.button.callback(getMarketToggleLabel("CMC Fear & Greed"), "toggle_cmc_fear_greed")
    ],
    [
      Markup.button.callback(getMarketToggleLabel("CMC Altcoin Season"), "toggle_cmc_altcoin_season"),
      Markup.button.callback(getMarketToggleLabel("CMC 100 Index"), "toggle_cmc100_index")
    ],
    [
      Markup.button.callback(getMarketToggleLabel("ETH Gas"), "toggle_eth_gas"),
      Markup.button.callback(getMarketToggleLabel("Bitcoin Dominance"), "toggle_bitcoin_dominance")
    ],
    [
      Markup.button.callback("← Back", "back_from_marketstats")
    ]
  ]);
  return { reply_markup: keyboard.reply_markup };
}

function getMarketToggleLabel(eventName) {
  const key = marketStatsCategoryMapping[eventName];
  const setting = marketStatsSettings[key] || { active: false };
  return setting.active ? `✅${eventName}` : `❌${eventName}`;
}

bot.action('back_from_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});

// Toggle callbacks для MarketStats
bot.action('toggle_open_interest', (ctx) => {
  marketStatsSettings.open_interest.active = !marketStatsSettings.open_interest.active;
  ctx.answerCbQuery(`Open Interest now ${marketStatsSettings.open_interest.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_top_oi', (ctx) => {
  marketStatsSettings.top_oi.active = !marketStatsSettings.top_oi.active;
  ctx.answerCbQuery(`Top OI now ${marketStatsSettings.top_oi.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_top_funding', (ctx) => {
  marketStatsSettings.top_funding.active = !marketStatsSettings.top_funding.active;
  ctx.answerCbQuery(`Top Funding now ${marketStatsSettings.top_funding.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_crypto_etfs_net_flow', (ctx) => {
  marketStatsSettings.crypto_etfs_net_flow.active = !marketStatsSettings.crypto_etfs_net_flow.active;
  ctx.answerCbQuery(`Crypto ETFs Net Flow now ${marketStatsSettings.crypto_etfs_net_flow.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_crypto_market_cap', (ctx) => {
  marketStatsSettings.crypto_market_cap.active = !marketStatsSettings.crypto_market_cap.active;
  ctx.answerCbQuery(`Crypto Market Cap now ${marketStatsSettings.crypto_market_cap.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_cmc_fear_greed', (ctx) => {
  marketStatsSettings.cmc_fear_greed.active = !marketStatsSettings.cmc_fear_greed.active;
  ctx.answerCbQuery(`CMC Fear & Greed now ${marketStatsSettings.cmc_fear_greed.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_cmc_altcoin_season', (ctx) => {
  marketStatsSettings.cmc_altcoin_season.active = !marketStatsSettings.cmc_altcoin_season.active;
  ctx.answerCbQuery(`CMC Altcoin Season now ${marketStatsSettings.cmc_altcoin_season.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_cmc100_index', (ctx) => {
  marketStatsSettings.cmc100_index.active = !marketStatsSettings.cmc100_index.active;
  ctx.answerCbQuery(`CMC 100 Index now ${marketStatsSettings.cmc100_index.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_eth_gas', (ctx) => {
  marketStatsSettings.eth_gas.active = !marketStatsSettings.eth_gas.active;
  ctx.answerCbQuery(`ETH Gas now ${marketStatsSettings.eth_gas.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});
bot.action('toggle_bitcoin_dominance', (ctx) => {
  marketStatsSettings.bitcoin_dominance.active = !marketStatsSettings.bitcoin_dominance.active;
  ctx.answerCbQuery(`Bitcoin Dominance now ${marketStatsSettings.bitcoin_dominance.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});

/* --------------------------
   Запуск бота
-------------------------- */
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
