// CEX/CEXScreen.js
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const logger = require('../logs/apiLogger');
const { cexUserFilters } = require('./settings');  // Обратите внимание: путь может быть скорректирован в зависимости от структуры
require('dotenv').config({ path: __dirname + '/../config/.env' });

// Загрузка шаблонов уведомлений из файла templates.json
const templatesPath = path.join(__dirname, '../config/templates.json');
let templates = {};
try {
  if (fs.existsSync(templatesPath)) {
    const data = fs.readFileSync(templatesPath, 'utf8');
    templates = JSON.parse(data);
  } else {
    logger.warn('Templates file not found.');
  }
} catch (err) {
  logger.error("Error loading templates: " + err.message);
}

// Создаём шину событий для CEX
class CEXEventBus extends EventEmitter {}
const cexEventBus = new CEXEventBus();

// --------------------------
// Функции фильтрации событий
// --------------------------

// Фильтрация для Flow Alerts
function evaluateFlowAlerts(eventData, settings) {
  if (!settings.active) return false;
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  if (settings.autoTrack === true) return true;
  return true;
}

// Фильтрация для CEX Tracking
function evaluateCexTracking(eventData, settings) {
  if (!settings.active) return false;
  if (eventData.buySellDifference >= 100000 && eventData.buySellDifference >= 0.1 * eventData.dailyVolume) {
    if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
      if (!settings.favoriteCoins.includes(eventData.asset)) return false;
    }
    if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
      if (settings.unwantedCoins.includes(eventData.asset)) return false;
    }
    return true;
  }
  return false;
}

// Фильтрация для остальных категорий (All Spot, All Derivatives и их процентные версии)
function evaluateGeneric(eventData, settings) {
  return settings.active === true;
}

// Маппинг категорий событий к функциям фильтрации
const evaluationMap = {
  'flow_alerts': evaluateFlowAlerts,
  'cex_tracking': evaluateCexTracking,
  'all_spot': evaluateGeneric,
  'all_derivatives': evaluateGeneric,
  'all_spot_percent': evaluateGeneric,
  'all_derivatives_percent': evaluateGeneric
};

// --------------------------
// Функция форматирования уведомления по шаблону
// --------------------------
function applyTemplate(templateObj, data) {
  if (!templateObj) return '';
  let message = `${templateObj.title}\n\n${templateObj.message}`;
  for (const param of templateObj.parameters) {
    const regex = new RegExp(`{{${param}}}`, 'g');
    message = message.replace(regex, data[param] !== undefined ? data[param] : 'N/A');
  }
  return message;
}

// --------------------------
// Основная функция обработки CEX событий
// --------------------------
async function processCEXEvent(eventData) {
  if (!eventData || !eventData.category) {
    logger.error("CEX: Received event with missing category!");
    return;
  }
  const category = eventData.category;
  const evalFunc = evaluationMap[category];
  if (!evalFunc) {
    logger.warn(`CEX: Unknown event category "${category}". Event skipped.`);
    return;
  }
  const settings = cexUserFilters[category] || {};
  if (!evalFunc(eventData, settings)) {
    logger.info(`CEX: Event "${eventData.event}" did not pass filters for category "${category}".`);
    return;
  }
  const templateObj = templates[category];
  const notificationMessage = templateObj ? applyTemplate(templateObj, eventData) : `CEX Event: ${JSON.stringify(eventData, null, 2)}`;
  cexEventBus.emit('notification', { message: notificationMessage });
  logger.info(`CEX: Notification for event "${eventData.event}" emitted.`);
}

module.exports = {
  processCEXEvent,
  cexEventBus
};
