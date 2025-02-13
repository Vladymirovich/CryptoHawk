// ====================
// bots/adminBot.js
// ====================

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const http = require('http');
const logger = require('../logs/apiLogger');
const { getDetailedServerStatus } = require('../utils/serverMetrics'); // Файл с метриками

// Проверка наличия токена админ-бота
if (!process.env.TELEGRAM_BOSS_BOT_TOKEN) {
  console.error("Error: TELEGRAM_BOSS_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

// ====================
// Загрузка white-list администраторов
// ====================
const adminFile = path.join(__dirname, '../config/admins.json');
let adminList = [];
try {
  const raw = fs.readFileSync(adminFile, 'utf8');
  adminList = JSON.parse(raw).admins || [];
} catch (err) {
  logger.error(`Error reading admins.json: ${err.message}`);
}

// ====================
// Создание экземпляра админ-бота
// ====================
const bot = new Telegraf(process.env.TELEGRAM_BOSS_BOT_TOKEN);

// ====================
// White-list middleware
// ====================
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!adminList.includes(userId)) {
    return ctx.reply('❌ You are not authorized to use this bot.');
  }
  return next();
});



// ====================
// ОБРАБОТКА КОМАНДЫ /start
// ====================
bot.start((ctx) => {
  const text = "Welcome to CryptoHawk Admin Bot!\nSelect an option:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "menu_marketstats"), Markup.button.callback("OnChain", "menu_onchain")],
    [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
    [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
    [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
  ]);
  ctx.reply(text, { reply_markup: keyboard.reply_markup });
});



// ====================
// Функция отображения главного меню
// ====================
function showMainMenu(ctx) {
  const text = "🚀 **CryptoHawk Admin Bot**\nChoose an option:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "menu_marketstats"), Markup.button.callback("OnChain", "menu_onchain")],
    [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
    [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
    [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
  ]);

  if (ctx.updateType === 'callback_query') {
    return ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
  } else {
    return ctx.reply(text, { reply_markup: keyboard.reply_markup });
  }
}



// ====================
// IN-MEMORY НАСТРОЙКИ
// ====================

// Настройки для CEX Screen (по умолчанию – все отключены)
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// ====================
// Маппинги для формирования ярлыков в меню
// ====================
const cexCategoryMapping = {
  "Flow Alerts": "flowAlerts",
  "CEX Tracking": "cexTracking",
  "All Spot": "allSpot",
  "All Derivatives": "allDerivatives",
  "All Spot%": "allSpotPercent",
  "All Derivatives%": "allDerivativesPercent"
};







// ====================
// ОБРАБОТКА ПОДМЕНЮ "MarketStats"
// ====================
bot.action('menu_marketstats', (ctx) => {
  ctx.answerCbQuery();
  showMarketStatsMenu(ctx);
});

// ====================
// Глобальные настройки MarketStats
// ====================
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

// ====================
// Маппинг ярлыков кнопок к настройкам
// ====================
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

// ====================
// Генерация и отображение меню MarketStats
// ====================
function showMarketStatsMenu(ctx) {
  const text = "MarketStats Settings:\nToggle market events:";
  const keyboard = Markup.inlineKeyboard(
    Object.keys(marketStatsCategoryMapping).map((label) => [
      Markup.button.callback(getMarketToggleLabel(label), `toggle_${marketStatsCategoryMapping[label]}`)
    ])
  );

  try {
    ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
  } catch (error) {
    console.error("❌ Ошибка обновления меню MarketStats:", error.message);
  }
}

// ====================
// Формирование текста кнопки (✅ / ❌)
// ====================
function getMarketToggleLabel(label) {
  const key = marketStatsCategoryMapping[label];
  if (!key || !marketStatsSettings[key]) {
    console.error(`❌ Ошибка: Ключ '${label}' не найден в marketStatsSettings!`);
    return `❌ ${label}`;
  }
  return marketStatsSettings[key].active ? `✅ ${label}` : `❌ ${label}`;
}

// ✅ Получение активных событий
function getActiveMarketStatsEvents() {
  return Object.keys(marketStatsSettings).filter((key) => marketStatsSettings[key].active);
}

// 🔄 Универсальная функция переключения событий
function toggleMarketEvent(ctx, key) {
  if (!marketStatsSettings[key]) return;

  marketStatsSettings[key].active = !marketStatsSettings[key].active;
  ctx.answerCbQuery(`${key.replace(/_/g, " ")} теперь ${marketStatsSettings[key].active ? 'Включен ✅' : 'Выключен ❌'}`);

  // 🔄 Обновляем MarketStats Bot
  updateMarketStatsBot();

  showMarketStatsMenu(ctx);
}

// 🛠 Обновление MarketStats Bot
function updateMarketStatsBot() {
  try {
    const marketStatsBot = require('../bots/marketStatsBot');
    if (marketStatsBot && marketStatsBot.updateActiveEvents) {
      marketStatsBot.updateActiveEvents(getActiveMarketStatsEvents());
    }
  } catch (error) {
    console.error("❌ Ошибка обновления MarketStats Bot:", error.message);
  }
}

// ====================
// Проверка и импорт MarketStats Bot (без ошибок)
// ====================
let marketStatsBot;
try {
  marketStatsBot = require('../bots/marketStatsBot');
} catch (error) {
  console.error("❌ Ошибка загрузки MarketStats Bot:", error.message);
  marketStatsBot = null;
}

// ====================
// ОБРАБОТКА КНОПКИ "Activate Bots" – подменю
// ====================
bot.action('menu_activate_bots', (ctx) => {
  const text = "Activate Bots:\nSelect a bot to activate:";
  const keyboard = Markup.inlineKeyboard([
    [
      // Для MarketStats используем URL‑кнопку для перехода в соответствующий бот
      Markup.button.url("MarketStats", "https://t.me/CryptoHawk_market_bot?start=START"),
      Markup.button.url("OnChain", "https://t.me/CryptoHawkOnChainBot?start=START")
    ],
    [
      Markup.button.url("CEX Screen", "https://t.me/CryptoHawk_cex_bot?start=START"),
      Markup.button.url("DEX Screen", "https://t.me/CryptoHawkDEXBot?start=START")
    ],
    [
      Markup.button.url("News", "https://t.me/CryptoHawkNewsBot?start=START"),
      Markup.button.url("Trends", "https://t.me/CryptoHawkTrendsBot?start=START")
    ],
    [
      Markup.button.callback("← Back", "back_from_activate")
    ]
  ]);
  // Обновляем текущее сообщение подменю
  return ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
});

// ====================
// ОБРАБОТКА КНОПКИ "← Back" для подменю "Activate Bots"
// ====================
bot.action('back_from_activate', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});

// ====================
// ОБРАБОТКА КНОПКИ "Status"
// ====================
bot.action('menu_status', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const { text, images } = await getDetailedServerStatus();
    let mediaGroup = [];
    try {
      // Загружаем изображения для Memory, CPU и Disk (для Network картинка не нужна)
      const memBuffer = await fetchImage(images.memGaugeUrl);
      const cpuBuffer = await fetchImage(images.cpuGaugeUrl);
      const diskBuffer = await fetchImage(images.diskGaugeUrl);
      mediaGroup = [
        { type: 'photo', media: { source: memBuffer }, caption: 'Memory Usage' },
        { type: 'photo', media: { source: cpuBuffer }, caption: 'CPU Load' },
        { type: 'photo', media: { source: diskBuffer }, caption: 'Disk Usage' }
      ];
      // Отправляем медиа-группу и сохраняем ID отправленных сообщений для последующего удаления
      const sentMedia = await ctx.replyWithMediaGroup(mediaGroup);
      statusMediaMessages[ctx.chat.id] = sentMedia.map(msg => msg.message_id);
    } catch (imgErr) {
      console.error("Error fetching images, sending text only:", imgErr.message);
    }
    // Отправляем текстовый отчёт с кнопкой "← Back"
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("← Back", "back_from_status")]
      ]).reply_markup
    });
  } catch (err) {
    await ctx.reply(`Error retrieving server status: ${err.message}`);
  }
});

const si = require('systeminformation');
const os = require('os');
const http = require('http');
const logger = require('../logs/apiLogger');

// ====================
// Функция генерации Gauge-графиков через Image-Charts
// ====================
function generateGaugeUrl(value, label) {
  return `https://image-charts.com/chart?cht=gom&chs=300x200&chd=t:${value}&chl=${encodeURIComponent(label)}&chco=36A2EB,FF0000,00FF00`;
}

// ====================
// Функция сбора метрик сервера
// ====================
async function getServerMetrics() {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/`;
  const start = Date.now();
  const responseTime = await new Promise((resolve) => {
    http.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(Date.now() - start));
    }).on('error', () => resolve(9999)); // Если сервер не отвечает
  });

  const memData = await si.mem();
  const cpuLoad = await si.currentLoad();
  const fsData = await si.fsSize();
  const netStats = await si.networkStats();
  const usersData = await si.users();
  const procData = await si.processes();
  const processCount = procData.all;

  const usedMemPercentage = (((memData.total - memData.available) / memData.total) * 100).toFixed(0);
  const cpuLoadPercent = cpuLoad.currentLoad.toFixed(2);

  let throughput = "0 KB/s";
  if (netStats && netStats.length > 0) {
    const totalBytesPerSec = netStats[0].rx_sec + netStats[0].tx_sec;
    throughput = (totalBytesPerSec / 1024).toFixed(2) + " KB/s";
  }

  let diskUsagePercent = "0";
  let diskUsageStr = "N/A";
  if (fsData && fsData.length > 0) {
    const rootFs = fsData.find(fs => fs.mount === '/') || fsData[0];
    diskUsagePercent = rootFs.use.toFixed(0);
    diskUsageStr = `${(rootFs.used / (1024 * 1024 * 1024)).toFixed(2)} / ${(rootFs.size / (1024 * 1024 * 1024)).toFixed(2)} GB (${diskUsagePercent}%)`;
  }

  return {
    responseTime,
    cpuLoadPercent,
    usedMemPercentage,
    diskUsageStr,
    throughput,
    activeUsers: usersData.length,
    processCount,
    totalMem: (memData.total / (1024 * 1024)).toFixed(2),
    usedMem: ((memData.total - memData.available) / (1024 * 1024)).toFixed(2),
    freeMem: (memData.available / (1024 * 1024)).toFixed(2),
    uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
    memGaugeUrl: generateGaugeUrl(usedMemPercentage, 'Memory Usage'),
    cpuGaugeUrl: generateGaugeUrl(cpuLoadPercent, 'CPU Load'),
    diskGaugeUrl: generateGaugeUrl(diskUsagePercent, 'Disk Usage')
  };
}

// ====================
// Функция формирования детального отчёта
// ====================
async function getDetailedServerStatus() {
  try {
    const metrics = await getServerMetrics();
    const systemStatus = metrics.responseTime > 1000 ? "WARNING" : "OK";

    const reportText = `🖥 **SystemStatus: ${systemStatus}**
• **Response Time:** ${metrics.responseTime} ms
• **Throughput:** ${metrics.throughput}
• **Active Users:** ${metrics.activeUsers}
• **Processes:** ${metrics.processCount}
• **Memory:** Total: ${metrics.totalMem} MB, 
   Used: ${metrics.usedMem} MB, 
   Free: ${metrics.freeMem} MB (${metrics.usedMemPercentage}%)
• **CPU Load:** ${metrics.cpuLoadPercent}%
• **Disk Usage:** ${metrics.diskUsageStr}
• **Uptime:** ${metrics.uptime}`;

    return { text: reportText, images: { mem: metrics.memGaugeUrl, cpu: metrics.cpuGaugeUrl, disk: metrics.diskGaugeUrl } };
  } catch (err) {
    return { text: `Error retrieving server metrics: ${err.message}`, images: {} };
  }
}

module.exports = {
  getDetailedServerStatus
};

// ====================
// ОБРАБОТКА КНОПКИ "← Back"
// ====================
bot.action('back_from_status', async (ctx) => {
  await ctx.answerCbQuery();
  // Удаляем ранее отправленные медиа-сообщения, если они существуют
  if (statusMediaMessages[ctx.chat.id]) {
    for (const msgId of statusMediaMessages[ctx.chat.id]) {
      try {
        await ctx.deleteMessage(msgId);
      } catch (delErr) {
        console.error("Error deleting media message:", delErr.message);
      }
    }
    delete statusMediaMessages[ctx.chat.id];
  }
  // Возвращаем пользователя в главное меню
  showMainMenu(ctx);
});

// ====================
// 🚀 Запуск админ-бота
// ====================

// ✅ Обработчик команды /start
bot.start((ctx) => ctx.reply('🚀 CryptoHawk Admin Bot успешно запущен!'));

// ✅ Функция запуска бота с логированием
async function launchBot() {
  try {
    await bot.launch();
    await bot.telegram.setWebhook(''); // Отключаем Webhook для long polling
    logger.info('✅ CryptoHawk Admin Bot успешно запущен.');
  } catch (error) {
    logger.error(`❌ Ошибка запуска Admin Bot: ${error.message}`);
    process.exit(1); // Завершаем процесс, если бот не смог запуститься
  }
}

// ✅ Обработка сигналов завершения работы (SIGINT, SIGTERM)
function handleExit(signal) {
  logger.warn(`⚠️ Admin Bot остановлен (${signal}).`);
  bot.stop(signal);
  process.exit(0);
}

process.once('SIGINT', () => handleExit('SIGINT'));
process.once('SIGTERM', () => handleExit('SIGTERM'));

// ✅ Экспортируем объект бота и функцию запуска
module.exports = {
  bot,
  launch: launchBot,
  getActiveMarketStatsEvents
};
