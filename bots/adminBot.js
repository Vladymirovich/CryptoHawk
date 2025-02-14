// ====================
// bots/adminBot.js
// ====================

require('dotenv').config({ path: __dirname + '/../config/.env' });
const { Telegraf, Markup } = require('telegraf');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const http = require('http');
const logger = require('../logs/apiLogger');
const si = require('systeminformation');
const os = require('os');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const statusMediaMessages = {};

// ====================
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
// CEX Screen меню
// ====================
bot.action('menu_cex_screen', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    showCexMenu(ctx);
  } catch (err) {
    console.error("Error in menu_cex_screen action:", err.message);
  }
});

// ====================
// Глобальные настройки CEX Screen
// ====================
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// ====================
// Маппинг ярлыков к настройкам
// ====================
const cexCategoryMapping = {
  "Flow Alerts": "flowAlerts",
  "CEX Tracking": "cexTracking",
  "All Spot": "allSpot",
  "All Derivatives": "allDerivatives",
  "All Spot%": "allSpotPercent",
  "All Derivatives%": "allDerivativesPercent"
};

const filterMapping = {
  flowAlerts: ["💎 Избранные монеты", "🚫 Ненужные монеты", "🤖 AutoTrack"],
  cexTracking: ["💎 Избранные монеты", "🚫 Ненужные монеты", "📊 Rate +-5%", "📊 Rate +-10%", "⏳ 60 sec +-1%", "🤖 AutoTrack"],
  allSpot: ["5min", "30min", "60min", "24hrs", "Buy", "Sell"],
  allDerivatives: ["5min", "30min", "60min", "24hrs", "Buy", "Sell"],
  allSpotPercent: ["5min", "30min", "60min", "24hrs", "Buy", "Sell"],
  allDerivativesPercent: ["5min", "30min", "60min", "24hrs", "Buy", "Sell"]
};

// ====================
// Генерация и отображение меню кнопки CEX Screen
// ====================
function showCexMenu(ctx, edit = false) {
  const text = "🔍 *CEX Screen Settings*\n\nВыберите параметры, которые хотите отслеживать:";
  const keyboard = Markup.inlineKeyboard(
    Object.keys(cexCategoryMapping).map((label) => [
      Markup.button.callback(`${getCexToggleLabel(label)}`, `toggle_${cexCategoryMapping[label]}`),
      Markup.button.callback("Filters ⚙️", `filters_${cexCategoryMapping[label]}`)
    ]).concat([
      [Markup.button.callback("← Back", "back_from_cex_screen")]
    ])
  );

  try {
    if (edit) {
      ctx.editMessageReplyMarkup(keyboard);
    } else {
      ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard.reply_markup });
    }
  } catch (error) {
    console.error("❌ Ошибка обновления меню CEX Screen:", error.message);
  }
}

// ====================
// Формирование текста кнопки (✅ / ❌)
// ====================
function getCexToggleLabel(label) {
  const key = cexCategoryMapping[label];
  return cexSettings[key].active ? `✅ ${label}` : `❌ ${label}`;
}

// 🔄 Универсальная функция переключения событий
function toggleCexSetting(ctx, key) {
  if (!cexSettings[key]) return;

  cexSettings[key].active = !cexSettings[key].active;
  ctx.answerCbQuery(`${key.replace(/_/g, " ")} теперь ${cexSettings[key].active ? 'Включен ✅' : 'Выключен ❌'}`);
  showCexMenu(ctx, true);
}

// ====================
// Обработчики переключения состояний
// ====================
Object.keys(cexCategoryMapping).forEach((label) => {
  bot.action(`toggle_${cexCategoryMapping[label]}`, async (ctx) => toggleCexSetting(ctx, cexCategoryMapping[label]));
});

// ====================
// ОБРАБОТКА КНОПКИ "← Back"
// ====================
bot.action('back_from_cex_screen', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    showMainMenu(ctx);
  } catch (err) {
    console.error("Error in back_from_cex_screen:", err.message);
  }
});

// ====================
// Подменю фильтров для всех категорий
// ====================
Object.keys(cexCategoryMapping).forEach((label) => {
  bot.action(`filters_${cexCategoryMapping[label]}`, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const categoryKey = cexCategoryMapping[label];
      const filterButtons = filterMapping[categoryKey].map((filter) => [
        Markup.button.callback(filter, `${categoryKey}_${filter.replace(/\s+/g, '_').toLowerCase()}`)
      ]);
      filterButtons.push([Markup.button.callback("← Back", "menu_cex_screen")]);

      ctx.editMessageReplyMarkup(Markup.inlineKeyboard(filterButtons));
    } catch (err) {
      console.error(`Error in filters_${cexCategoryMapping[label]}:`, err.message);
    }
  });
});

// ====================
// Экспортируем функции
// ====================
module.exports = {
  cexSettings,
  toggleCexSetting,
  showCexMenu
};




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
// Обновленная обработка кнопки "Status"
// ====================
bot.action('menu_status', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    const { text, alert } = await getDetailedServerStatus();

    // Отправка текстового отчёта
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback("← Back", "back_from_status")]
      ]).reply_markup
    });

    // Отправка уведомления в админ-бот при критической нагрузке + кнопка рестарта
    if (alert) {
      await ctx.reply(`⚠️ *Critical Server Alert!*\n${alert}`, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Restart Server", "restart_server")]
        ]).reply_markup
      });
    }
  } catch (err) {
    await ctx.reply(`Error retrieving server status: ${err.message}`);
  }
});

// ====================
// Функция обработки кнопки "Restart Server"
// ====================

bot.action('restart_server', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.reply("🔄 Restarting server...");

    require('child_process').exec(
      `if [ -f /.dockerenv ]; then 
         echo "🚀 Docker detected. Restarting container...";
         container_id=$(cat /proc/1/cgroup | grep -oE '[0-9a-f]{64}' | head -n 1);
         if [ -n "$container_id" ]; then 
           docker restart $container_id && echo "✅ Docker container restarted.";
         else 
           echo "❌ Error: Unable to detect Docker container ID."; 
           exit 1;
         fi
       elif [ -n "$RAILWAY_PROJECT_ID" ]; then
         echo "🚀 Railway detected. Triggering redeploy...";
         curl -X POST -H "Authorization: Bearer $RAILWAY_API_KEY" "https://backboard.railway.app/v2/projects/$RAILWAY_PROJECT_ID/deployments"
         echo "✅ Railway redeploy triggered.";
       elif command -v pm2 &> /dev/null && pm2 list --no-color | grep -q "index"; then 
         echo "🔄 PM2 detected. Restarting process...";
         pm2 restart index && echo "✅ PM2 process restarted.";
       elif command -v systemctl &> /dev/null && systemctl is-active --quiet CryptoHawk; then
         echo "⚡ Systemd detected. Restarting service...";
         systemctl restart CryptoHawk && echo "✅ Service restarted.";
       else 
         echo "❌ Error: Could not detect Docker, PM2, or Systemd. Railway API key might be missing.";
         exit 1;
       fi`,
      (error, stdout, stderr) => {
        if (error) {
          ctx.reply(`❌ Error restarting server: ${stderr || error.message}`);
        } else {
          ctx.reply("✅ Server restarted successfully.");
        }
      }
    );

  } catch (err) {
    await ctx.reply(`❌ Error executing restart: ${err.message}`);
  }
});

// ====================
// Функция сбора метрик сервера
// ====================
async function getServerMetrics() {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/`;
  const start = Date.now();

  // Запрашиваем время ответа API
  const responseTime = await new Promise((resolve) => {
    http.get(url, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(Date.now() - start));
    }).on("error", () => resolve(9999));
  });

  // Сбор метрик системы
  const memData = await si.mem();
  const cpuLoad = await si.currentLoad();
  const fsData = await si.fsSize();
  const netStats = await si.networkStats();
  const usersData = await si.users();
  const procData = await si.processes();
  const processCount = procData.all;

  // ✅ ДИНАМИЧЕСКИЙ ЗАПРОС API ENDPOINTS & WEBHOOKS
 let apiEndpoints = 0;
let webhooksConnected = 0;

try {
    const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const [apiResponse, webhooksResponse] = await Promise.all([
        fetch("http://localhost:3000/api/endpoints", { timeout: 5000 }),
        fetch("http://localhost:3000/api/webhooks", { timeout: 5000 })
    ]);

    if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        apiEndpoints = Array.isArray(apiData) ? apiData.length : 0;
    } else {
        console.error("❌ API response error:", apiResponse.status);
    }

    if (webhooksResponse.ok) {
        const webhookData = await webhooksResponse.json();
        webhooksConnected = Array.isArray(webhookData) ? webhookData.length : 0;
    } else {
        console.error("❌ Webhook response error:", webhooksResponse.status);
    }
} catch (err) {
    console.error("❌ Error fetching API/Webhooks:", err.message);
}

  // Определение стабильности API & Webhooks
  const apiStability = responseTime < 500 && apiEndpoints > 0 ? "✅ Stable" : "⚠️ Unstable";
  const webhookStability = webhooksConnected > 3 ? "✅ Stable" : "⚠️ Unstable";

  // Расчёт использования памяти
  const usedMemPercentage = (((memData.total - memData.available) / memData.total) * 100).toFixed(0);
  const cpuLoadPercent = cpuLoad.currentLoad.toFixed(2);

  let alertMessage = "";

  // Расчет загрузки сети
  let throughput = "0 KB/s";
  if (netStats && netStats.length > 0) {
    const totalBytesPerSec = netStats[0].rx_sec + netStats[0].tx_sec;
    throughput = (totalBytesPerSec / 1024).toFixed(2) + " KB/s";
  }

  // Определение использования диска
  let diskUsagePercent = "0";
  let diskUsageStr = "N/A";
  if (fsData && fsData.length > 0) {
    const rootFs = fsData.find(fs => fs.mount === '/') || fsData[0];
    diskUsagePercent = rootFs.use.toFixed(0);
    diskUsageStr = `${(rootFs.used / (1024 * 1024 * 1024)).toFixed(2)} / ${(rootFs.size / (1024 * 1024 * 1024)).toFixed(2)} GB (${diskUsagePercent}%)`;
  }

  // Проверка критических значений
  if (cpuLoadPercent > 90) alertMessage += "🔥 High CPU Load!\n";
  if (usedMemPercentage > 90) alertMessage += "🛑 Low Memory Available!\n";
  if (diskUsagePercent > 90) alertMessage += "💾 Disk Almost Full!\n";
  if (responseTime > 1500) alertMessage += "⚠️ High API Response Time!\n";
  if (apiStability.includes("⚠️")) alertMessage += "⚠️ API Stability Issues!\n";
  if (webhookStability.includes("⚠️")) alertMessage += "⚠️ Webhooks Unstable!\n";

  return {
    responseTime,
    cpuLoadPercent,
    usedMemPercentage,
    diskUsageStr,
    throughput,
    activeUsers: usersData.length,
    processCount,
    apiEndpoints,
    webhooksConnected,
    apiStability,
    webhookStability,
    totalMem: (memData.total / (1024 * 1024)).toFixed(2),
    usedMem: ((memData.total - memData.available) / (1024 * 1024)).toFixed(2),
    freeMem: (memData.available / (1024 * 1024)).toFixed(2),
    uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
    alert: alertMessage.length ? alertMessage : null
  };
}

// ====================
// Функция формирования детального отчёта
// ====================
async function getDetailedServerStatus() {
  try {
    const metrics = await getServerMetrics();
    const systemStatus = metrics.responseTime > 1000 ? "⚠️ WARNING" : "✅ OK";

    const reportText = `🖥 **System Status: ${systemStatus}**
📡 **Response Time:** ${metrics.responseTime} ms
📊 **Throughput:** ${metrics.throughput}
👥 **Active Users:** ${metrics.activeUsers}
🔧 **Processes:** ${metrics.processCount}
🖥 **Memory:** Total: ${metrics.totalMem} MB, 
   Used: ${metrics.usedMem} MB, 
   Free: ${metrics.freeMem} MB (${metrics.usedMemPercentage}%)
⚡ **CPU Load:** ${metrics.cpuLoadPercent}%
💾 **Disk Usage:** ${metrics.diskUsageStr}
⏳ **Uptime:** ${metrics.uptime}

🔗 **API Endpoints:** ${metrics.apiEndpoints} (${metrics.apiStability})
📬 **Webhooks:** ${metrics.webhooksConnected} (${metrics.webhookStability})`;

    return { text: reportText, alert: metrics.alert };
  } catch (err) {
    return { text: `Error retrieving server metrics: ${err.message}`, alert: null };
  }
}

// ====================
// ОБРАБОТКА КНОПКИ "← Back"
// ====================
bot.action('back_from_status', async (ctx) => {
  await ctx.answerCbQuery();
  showMainMenu(ctx);
});

// ====================
// Экспортируем функцию
// ====================
module.exports = {
  getDetailedServerStatus
};


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
