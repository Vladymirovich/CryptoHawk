// bots/adminBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../logs/apiLogger');

// Проверка наличия токена админ-бота
if (!process.env.TELEGRAM_BOSS_BOT_TOKEN) {
  console.error("Error: TELEGRAM_BOSS_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

// Загрузка white-list администраторов из config/admins.json
const adminFile = path.join(__dirname, '../config/admins.json');
let adminList = [];
try {
  const raw = fs.readFileSync(adminFile, 'utf8');
  adminList = JSON.parse(raw).admins || [];
} catch (err) {
  logger.error(`Error reading admins.json: ${err.message}`);
}

// Создание экземпляра админ-бота
const bot = new Telegraf(process.env.TELEGRAM_BOSS_BOT_TOKEN);

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

// Настройки для CEX Screen (по умолчанию – все отключены)
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// Настройки для MarketStats (по умолчанию – все отключены)
// Добавлен флаг market_overview – опрос глобальных метрик происходит только если он включён.
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
  bitcoin_dominance: { active: false },
  market_overview: { active: false }
};

// Маппинги для ярлыков (используются при построении меню)
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
  "Bitcoin Dominance": "bitcoin_dominance",
  "Market Overview": "market_overview"
};

/* --------------------------
   ГЛАВНОЕ МЕНЮ
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
   Функция получения статуса сервера
-------------------------- */
function getServerStatus() {
  const totalMem = os.totalmem() / 1024 / 1024;
  const freeMem = os.freemem() / 1024 / 1024;
  const usedMem = totalMem - freeMem;
  const load = os.loadavg();
  const uptime = os.uptime();
  const nodeVersion = process.version;
  // Здесь можно добавить дополнительную информацию по коннекторам API и вебхукам, если доступно
  const apiStatus = "All API connectors are active.";
  const webhookStatus = "All webhooks are active.";
  
  return `🖥 **Server Status Report**:
• **Node.js Version:** ${nodeVersion}
• **Uptime:** ${Math.floor(uptime / 60)} minutes
• **Total Memory:** ${totalMem.toFixed(2)} MB
• **Used Memory:** ${usedMem.toFixed(2)} MB
• **Free Memory:** ${freeMem.toFixed(2)} MB
• **Load Average (1m, 5m, 15m):** ${load.map(l => l.toFixed(2)).join(', ')}

• **API Status:** ${apiStatus}
• **Webhook Status:** ${webhookStatus}

#CryptoHawk`;
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
  ctx.editMessageText("OnChain settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});

bot.action('menu_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("CEX Screen settings are under development.\nReturning to main menu...");
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
  const statusText = getServerStatus();
  ctx.editMessageText(statusText, { parse_mode: 'Markdown' });
  setTimeout(() => showMainMenu(ctx), 10000);
});

/* --------------------------
   ACTIVATE BOTS МЕНЮ
-------------------------- */
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
   MARKETSTATS МЕНЮ
-------------------------- */
bot.action('menu_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMarketStatsMenu(ctx);
});

function showMarketStatsMenu(ctx) {
  const text = "MarketStats Settings:\nToggle market events:";
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(getMarketToggleLabel("MarketStats"), "toggle_marketstats"),
      Markup.button.callback(getMarketToggleLabel("Market Overview"), "toggle_market_overview")
    ],
    [
      Markup.button.callback("← Back", "back_from_marketstats")
    ]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
}

function getMarketToggleLabel(label) {
  if (label === "Market Overview") {
    return marketStatsSettings.market_overview.active ? `✅${label}` : `❌${label}`;
  }
  // Для общего MarketStats можно использовать активность одного из ключевых показателей (например, crypto_market_cap)
  return marketStatsSettings.crypto_market_cap.active ? `✅${label}` : `❌${label}`;
}

bot.action('toggle_marketstats', (ctx) => {
  // Пример: переключаем активность показателя crypto_market_cap
  marketStatsSettings.crypto_market_cap.active = !marketStatsSettings.crypto_market_cap.active;
  ctx.answerCbQuery(`MarketStats events now ${marketStatsSettings.crypto_market_cap.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});

bot.action('toggle_market_overview', (ctx) => {
  marketStatsSettings.market_overview.active = !marketStatsSettings.market_overview.active;
  ctx.answerCbQuery(`Market Overview now ${marketStatsSettings.market_overview.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
});

bot.action('back_from_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});

/* --------------------------
   CEX SCREEN МЕНЮ (Заглушка)
-------------------------- */
bot.action('menu_cex_screen', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText("CEX Screen settings are under development.\nReturning to main menu...");
  setTimeout(() => showMainMenu(ctx), 2000);
});

/* --------------------------
   Запуск админ-бота
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
