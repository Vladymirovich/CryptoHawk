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
    return ctx.reply('You are not on the admin white-list. Request access from admin.');
  }
  return next();
});

// Основное меню (остальное меню не изменялось)
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

// -------------------- Обработчик для кнопки "CEX Screen" --------------------
bot.hears('CEX Screen', (ctx) => {
  // Вывод подменю для CEX Screen с 6 категориями.
  return ctx.reply(
    'CEX Screen Settings:\nSelect a category to toggle or adjust filters:',
    Markup.inlineKeyboard([
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
    ]).extra()
  );
});

// Функция для формирования ярлыка с toggle-статусом
function getLabel(category) {
  // Используем in-memory объект настроек (пример)
  // Если настройки отсутствуют, по умолчанию считаем неактивными
  const settings = cexSettings[camelCase(category)] || { active: false };
  return settings.active ? `✅${category}` : `❌${category}`;
}

// Преобразование строки в camelCase (например, "Flow Alerts" → "flowAlerts")
function camelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (m, chr) => chr);
}

// Пример in-memory настроек для CEX Screen (глобально в этом файле)
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false },
  allDerivatives: { active: false },
  allSpotPercent: { active: false },
  allDerivativesPercent: { active: false }
};

// Toggle callback для каждой категории
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

// Функция для пересборки меню CEX Screen
function buildCexMenu() {
  return Markup.inlineKeyboard([
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
  ]).extra();
}

// Callback для кнопки "Activate Bots"
bot.hears('Activate Bots', (ctx) => {
  return ctx.reply(
    "Activate Bots:\nSelect a bot to activate:",
    Markup.inlineKeyboard([
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
    ]).extra()
  );
});

// Примеры callback-обработчиков для Activate Bots
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
