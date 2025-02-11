// bots/marketStatsBot.js

// Загружаем переменные окружения из файла .env
require('dotenv').config({ path: __dirname + '/../config/.env' });

const { Telegraf, Markup } = require('telegraf');
const logger = require('../logs/apiLogger');

// Флаг для отслеживания, запущен ли уже пуллер
let pollerRunning = false;

// Создаем экземпляр бота с токеном Market Bot
const marketBot = new Telegraf(process.env.TELEGRAM_MARKET_BOT_TOKEN);

let chatId = null;

// При старте бот отправляет сообщение с reply-клавиатурой для активации пуллера
marketBot.start((ctx) => {
  chatId = ctx.chat.id;
  ctx.reply(
    "Welcome to CryptoHawk Market Stats Bot!\nPress the 🔵 START button below to activate Market Overview polling.",
    Markup.keyboard([["🔵 START"]]).resize().extra()
  );
});

// Обработчик нажатия на кнопку "🔵 START"
marketBot.hears(/^🔵 START$/, async (ctx) => {
  chatId = ctx.chat.id;
  if (!pollerRunning) {
    try {
      // Динамически подключаем модуль пуллера, чтобы он начал опрашивать API
      require('../MarketStats/poller');
      pollerRunning = true;
      await ctx.reply("Market Overview activated. Polling started.");
      logger.info("Market Overview polling activated.");
    } catch (err) {
      logger.error("Error activating Market Overview polling: " + err.message);
      await ctx.reply("Error activating Market Overview polling.");
    }
  } else {
    await ctx.reply("Market Overview polling is already active.");
  }
  // Убираем клавиатуру после активации
  await ctx.reply("You can now use the inline menu for further actions.", Markup.removeKeyboard().extra());
});

// Команда /help
marketBot.help((ctx) => {
  ctx.reply("This bot sends Market Stats notifications.\nPress 🔵 START to activate polling for Market Overview.");
});

// Подписка на уведомления из модуля MarketStats/events.js
const marketStatsEventBus = require('../MarketStats/events');
marketStatsEventBus.on('notification', async (notification) => {
  if (!chatId) {
    logger.info('MarketStats Bot: Chat ID is not set yet.');
    return;
  }
  // Если в уведомлении задан URL изображения, пробуем отправить фото
  if (notification.graph_url && notification.graph_url !== 'N/A') {
    try {
      await marketBot.telegram.sendPhoto(chatId, notification.graph_url, { caption: notification.message, parse_mode: 'Markdown' });
      logger.info('MarketStats Bot: Notification with photo sent successfully.');
    } catch (err) {
      logger.error(`MarketStats Bot error sending photo: ${err.message}`);
      await marketBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' });
    }
  } else {
    // Если изображения нет, отправляем текстовое сообщение
    try {
      await marketBot.telegram.sendMessage(chatId, notification.message, { parse_mode: 'Markdown' });
      logger.info('MarketStats Bot: Notification sent successfully.');
    } catch (err) {
      logger.error(`MarketStats Bot error sending message: ${err.message}`);
    }
  }
});

// Запуск бота
marketBot.launch()
  .then(() => logger.info('CryptoHawk Market Stats Bot launched and ready.'))
  .catch(err => logger.error(`MarketStats Bot launch error: ${err.message}`));

process.once('SIGINT', () => marketBot.stop('SIGINT'));
process.once('SIGTERM', () => marketBot.stop('SIGTERM'));
