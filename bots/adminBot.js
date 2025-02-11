// bots/adminBot.js

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const si = require('systeminformation'); // убедитесь, что пакет установлен (npm install systeminformation)
const logger = require('../logs/apiLogger');

// Проверяем наличие токена админ-бота
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
// Добавлен флаг market_overview – опрос глобальных метрик выполняется только при его включении.
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
  "Bitcoin Dominance": "bitcoin_dominance",
  "Market Overview": "market_overview"
};

/* --------------------------
   Функция для сбора метрик сервера
-------------------------- */
// Функция измеряет время отклика локального HTTP-сервера и собирает системные метрики через systeminformation.
async function getServerMetrics() {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/`;
  const start = Date.now();

  const responseTime = await new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.on('data', () => {}); // потребляем данные
      res.on('end', () => resolve(Date.now() - start));
    }).on('error', (err) => reject(err));
  });

  const memData = await si.mem();
  const cpuLoad = await si.currentLoad();
  const fsData = await si.fsSize();
  const netStats = await si.networkStats();
  const usersData = await si.users();

  const totalMem = (memData.total / (1024 * 1024)).toFixed(2);
  const freeMem = (memData.available / (1024 * 1024)).toFixed(2);
  const usedMem = ((memData.total - memData.available) / (1024 * 1024)).toFixed(2);
  const usedMemPercentage = (((memData.total - memData.available) / memData.total) * 100).toFixed(0);

  const cpuLoadPercent = cpuLoad.currentLoad.toFixed(2);
  const uptime = os.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  let throughput = "0 KB/s";
  if (netStats && netStats.length > 0) {
    const totalBytesPerSec = netStats[0].rx_sec + netStats[0].tx_sec;
    throughput = (totalBytesPerSec / 1024).toFixed(2) + " KB/s";
  }
  
  const activeUsers = usersData.length;

  let diskUsagePercent = "0";
  let diskUsageStr = "N/A";
  if (fsData && fsData.length > 0) {
    const rootFs = fsData.find(fs => fs.mount === '/') || fsData[0];
    diskUsagePercent = rootFs.use.toFixed(0);
    const usedGB = (rootFs.used / (1024 * 1024 * 1024)).toFixed(2);
    const sizeGB = (rootFs.size / (1024 * 1024 * 1024)).toFixed(2);
    diskUsageStr = `${usedGB} / ${sizeGB} GB (${diskUsagePercent}%)`;
  }

  // Генерация динамических графиков через QuickChart.io
  const memGaugeUrl = `https://quickchart.io/chart?c={type:'radialGauge',data:{datasets:[{data:[${usedMemPercentage}]}]},options:{domain:{min:0,max:100},title:{display:true,text:'Memory Usage (%)'}}}`;
  const cpuGaugeUrl = `https://quickchart.io/chart?c={type:'radialGauge',data:{datasets:[{data:[${cpuLoadPercent}]}]},options:{domain:{min:0,max:100},title:{display:true,text:'CPU Load (%)'}}}`;
  const netVal = netStats && netStats.length > 0 ? Math.min((netStats[0].rx_sec + netStats[0].tx_sec) / 1024 / 10, 100).toFixed(0) : "0";
  const netGaugeUrl = `https://quickchart.io/chart?c={type:'radialGauge',data:{datasets:[{data:[${netVal}]}]},options:{domain:{min:0,max:100},title:{display:true,text:'Network Throughput (%)'}}}`;
  const diskGaugeUrl = `https://quickchart.io/chart?c={type:'radialGauge',data:{datasets:[{data:[${diskUsagePercent}]}]},options:{domain:{min:0,max:100},title:{display:true,text:'Disk Usage (%)'}}}`;

  return {
    responseTime,
    totalMem,
    usedMem,
    freeMem,
    usedMemPercentage,
    cpuLoadPercent,
    uptime: uptimeStr,
    throughput,
    activeUsers,
    diskUsageStr,
    memGaugeUrl,
    cpuGaugeUrl,
    netGaugeUrl,
    diskGaugeUrl
  };
}

// Асинхронная функция, которая формирует подробный отчёт о состоянии сервера и отправляет его с фото-метриками
async function sendServerStatus(ctx) {
  try {
    const metrics = await getServerMetrics();
    const statusText = `🖥 **Server Status Report**:
• **Response Time:** ${metrics.responseTime} ms
• **Throughput:** ${metrics.throughput}
• **Active Users:** ${metrics.activeUsers}

• **Memory:** Total: ${metrics.totalMem} MB, Used: ${metrics.usedMem} MB, Free: ${metrics.freeMem} MB (${metrics.usedMemPercentage}%)
• **CPU Load:** ${metrics.cpuLoadPercent}%
• **Network Throughput:** ${metrics.throughput}
• **Disk Usage:** ${metrics.diskUsageStr}
• **Uptime:** ${metrics.uptime}

#CryptoHawk`;
    
    // Отправляем медиагруппу с изображениями для Memory, CPU и Disk
    const media = [
      { type: 'photo', media: metrics.memGaugeUrl, caption: 'Memory Usage (%)' },
      { type: 'photo', media: metrics.cpuGaugeUrl, caption: 'CPU Load (%)' },
      { type: 'photo', media: metrics.diskGaugeUrl, caption: 'Disk Usage (%)' }
    ];
    await ctx.telegram.sendMediaGroup(ctx.chat.id, media);
    
    // Отправляем текстовый отчёт с кнопкой "← Back"
    await ctx.reply(statusText, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("← Back", "back_from_status")]
      ]).reply_markup
    });
  } catch (err) {
    ctx.reply(`Error retrieving server metrics: ${err.message}`);
  }
}

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

bot.action('menu_status', async (ctx) => {
  ctx.answerCbQuery();
  await sendServerStatus(ctx);
});

bot.action('back_from_status', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
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
      Markup.button.callback(getMarketToggleLabel("Market Overview"), "toggle_market_overview")
    ],
    [
      Markup.button.callback("← Back", "back_from_marketstats")
    ]
  ]);
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
}

function getMarketToggleLabel(label) {
  const key = marketStatsCategoryMapping[label];
  const setting = marketStatsSettings[key] || { active: false };
  return setting.active ? `✅${label}` : `❌${label}`;
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

bot.action('toggle_market_overview', (ctx) => {
  marketStatsSettings.market_overview.active = !marketStatsSettings.market_overview.active;
  ctx.answerCbQuery(`Market Overview now ${marketStatsSettings.market_overview.active ? 'ENABLED' : 'DISABLED'}`);
  showMarketStatsMenu(ctx);
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
