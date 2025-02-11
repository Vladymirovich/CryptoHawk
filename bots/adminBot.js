// ====================
// bots/adminBot.js
// ====================

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const si = require('systeminformation'); // npm install systeminformation
const logger = require('../logs/apiLogger');

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
    return ctx.reply('You are not on the admin white-list. Request access from an existing admin.');
  }
  return next();
});

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

// Настройки для MarketStats (по умолчанию – все отключены)
// Флаг market_overview позволяет контролировать опрос глобальных метрик – при его выключении соответствующий модуль не запускается.
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
// Функция для генерации конфигурации gauge (на основе doughnut)
// ====================
function generateGaugeConfig(value, title) {
  return {
    type: 'doughnut',
    data: {
      datasets: [{
        // Значение и оставшаяся часть до 100
        data: [value, 100 - value],
        backgroundColor: ['#36A2EB', '#555555'], // основной цвет и затемнённый оттенок
        borderColor: ['#000000', '#000000'],
        borderWidth: 1 // тонкая граница
      }]
    },
    options: {
      rotation: Math.PI,       // Начало отрисовки – слева
      circumference: Math.PI,    // Полукруговой график
      cutoutPercentage: 50,      // Увеличен процент выреза, чтобы сделать кольцо тоньше
      plugins: {
        // Плагин для отрисовки текста внутри doughnut (будет отображена только одна строка с числом и знаком '%')
        doughnutlabel: {
          labels: [
            {
              text: `${value}%`,
              font: { size: 24, weight: 'bold' },
              color: '#ffffff'
            }
          ]
        }
      },
      responsive: false,
      maintainAspectRatio: false,
      backgroundColor: '#333333' // Темно-серый фон
    }
  };
}

// ====================
// Глобальный объект для хранения ID отправленных медиа-сообщений по chat_id
// ====================
const statusMediaMessages = {};

// ====================
// Функция для сбора метрик сервера и генерации графиков
// ====================
async function getServerMetrics() {
  // Измеряем время отклика локального HTTP-сервера
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/`;
  const start = Date.now();
  const responseTime = await new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.on('data', () => {}); // потребляем данные
      res.on('end', () => resolve(Date.now() - start));
    }).on('error', (err) => reject(err));
  });

  // Сбор системных метрик через systeminformation
  const memData = await si.mem();
  const cpuLoad = await si.currentLoad();
  const fsData = await si.fsSize();
  const netStats = await si.networkStats(); // Метрика throughput используется только текстом
  const usersData = await si.users();
  const procData = await si.processes();
  const processCount = procData.all;

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

  // Disk Usage – ищем раздел с точкой монтирования "/" (или берем первый раздел)
  let diskUsagePercent = "0";
  let diskUsageStr = "N/A";
  if (fsData && fsData.length > 0) {
    const rootFs = fsData.find(fs => fs.mount === '/') || fsData[0];
    diskUsagePercent = rootFs.use.toFixed(0);
    const usedGB = (rootFs.used / (1024 * 1024 * 1024)).toFixed(2);
    const sizeGB = (rootFs.size / (1024 * 1024 * 1024)).toFixed(2);
    diskUsageStr = `${usedGB} / ${sizeGB} GB (${diskUsagePercent}%)`;
  }

  // Генерация графиков через QuickChart.io (используя endpoint https://quickchart.io/chart)
  const memConfig = generateGaugeConfig(Number(usedMemPercentage), 'Memory Usage (%)');
  const cpuConfig = generateGaugeConfig(Number(cpuLoadPercent), 'CPU Load (%)');
  const diskConfig = generateGaugeConfig(Number(diskUsagePercent), 'Disk Usage (%)');

  const memGaugeUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(memConfig))}&w=250&h=150`;
  const cpuGaugeUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cpuConfig))}&w=250&h=150`;
  const diskGaugeUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(diskConfig))}&w=250&h=150`;

  return {
    responseTime,
    totalMem,
    usedMem,
    freeMem,
    usedMemPercentage,
    cpuLoadPercent,
    uptime: uptimeStr,
    throughput,
    activeUsers: usersData.length,
    processCount,
    diskUsageStr,
    memGaugeUrl,
    cpuGaugeUrl,
    diskGaugeUrl  // Поле для Network Throughput отсутствует – метрика передаётся только текстом
  };
}

// ====================
// Асинхронная функция для формирования детального отчёта о состоянии сервера
// ====================
async function getDetailedServerStatus() {
  try {
    const metrics = await getServerMetrics();
    // Определяем статус системы (например, если Response Time > 1000 ms – WARNING)
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
• **Uptime:** ${metrics.uptime}

#CryptoHawk`;
    return { text: reportText, images: { memGaugeUrl: metrics.memGaugeUrl, cpuGaugeUrl: metrics.cpuGaugeUrl, diskGaugeUrl: metrics.diskGaugeUrl } };
  } catch (err) {
    return { text: `Error retrieving server metrics: ${err.message}`, images: {} };
  }
}


// ====================
// Хелпер: получить изображение по URL как Buffer с обработкой ошибки
// ====================
async function fetchImage(url) {
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image from ${url}: ${res.status}`);
    return await res.buffer();
  } catch (err) {
    console.error("Image fetch error:", err.message);
    throw err;
  }
}

// ====================
// Функция для отображения главного меню
// ====================
function showMainMenu(ctx) {
  const text = "Welcome to CryptoHawk Admin Bot!\nSelect an option:";
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("MarketStats", "menu_marketstats"), Markup.button.callback("OnChain", "menu_onchain")],
    [Markup.button.callback("CEX Screen", "menu_cex_screen"), Markup.button.callback("DEX Screen", "menu_dex_screen")],
    [Markup.button.callback("News", "menu_news"), Markup.button.callback("Trends", "menu_trends")],
    [Markup.button.callback("Activate Bots", "menu_activate_bots"), Markup.button.callback("Status", "menu_status")]
  ]);
  // Если сообщение пришло как callback_query, редактируем его, иначе отправляем новое
  if (ctx.updateType === 'callback_query' && ctx.update.callback_query.message) {
    return ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
  } else {
    return ctx.reply(text, { reply_markup: keyboard.reply_markup });
  }
}

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
// ОБРАБОТКА КНОПКИ "Activate Bots" – подменю
// ====================
bot.action('menu_activate_bots', (ctx) => {
  const text = "Activate Bots:\nSelect a bot to activate:";
  const keyboard = Markup.inlineKeyboard([
    [
      // Для MarketStats используем URL-ссылку, чтобы перенаправить пользователя в соответствующий бот.
      Markup.button.url("MarketStats", "https://t.me/CryptoHawk_market_bot"),
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
  ctx.editMessageText(text, { reply_markup: keyboard.reply_markup });
});

bot.action('back_from_activate', (ctx) => {
  ctx.answerCbQuery();
  showMainMenu(ctx);
});


// ====================
// ОБРАБОТКА ПОДМЕНЮ "MarketStats"
// ====================
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

// ====================
// Toggle callbacks для MarketStats
// ====================
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

// ====================
// Запуск админ-бота
// ====================
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
