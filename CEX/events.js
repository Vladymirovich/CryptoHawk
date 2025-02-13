/* =========================
 * CEX/events.js (Optimized & Refactored)
 * ========================= */
const EventEmitter = require('events');
const logger = require('../logs/apiLogger');
const fs = require('fs');
const path = require('path');
const {
  evaluateFlowAlerts,
  evaluateCexTracking,
  evaluateAllSpot,
  evaluateAllDerivatives,
  evaluateAllSpotPercent,
  evaluateAllDerivativesPercent
} = require('../CEX/filters');

class CEXEventBus extends EventEmitter {}
const cexEventBus = new CEXEventBus();

// Загрузка шаблонов уведомлений
const templatePath = path.join(__dirname, '../config/templates.json');
const templates = fs.existsSync(templatePath) ? JSON.parse(fs.readFileSync(templatePath, 'utf8')) : {};

const mergedEvents = new Map();
const mergeThreshold = 30 * 1000; // 30 секунд

// Функция применения шаблонов
function applyTemplate(templateObj, data) {
  if (!templateObj) return `CEX Event: ${data.event}\n${JSON.stringify(data, null, 2)}`;
  return Object.keys(data).reduce((message, param) => {
    return message.replace(new RegExp(`{{${param}}}`, 'g'), data[param] || 'N/A');
  }, `${templateObj.title}\n\n${templateObj.message}`);
}

// Форматирование уведомлений
function formatNotification(eventObj) {
  const { data } = eventObj;
  const eventType = data.event_type || 'large_inflow_outflow';
  const chosen = templates[eventType];
  return { message: applyTemplate(chosen, data) };
}

// Фильтрация событий CEX
function processCEXEvent(eventData) {
  if (!eventData || !eventData.category) {
    logger.error("CEX: Received event with missing category!");
    return;
  }

  const category = eventData.category;
  const filterMap = {
    flow_alerts: evaluateFlowAlerts,
    cex_tracking: evaluateCexTracking,
    all_spot: evaluateAllSpot,
    all_derivatives: evaluateAllDerivatives,
    all_spot_percent: evaluateAllSpotPercent,
    all_derivatives_percent: evaluateAllDerivativesPercent
  };

  if (!filterMap[category]) {
    logger.warn(`CEX: Unknown category "${category}". Event filtered out.`);
    return;
  }

  if (!filterMap[category](eventData, eventData.settings || {})) {
    logger.info(`CEX: Event "${eventData.event}" did not pass filter for category "${category}".`);
    return;
  }

  const key = JSON.stringify({ event: eventData.event, metrics: eventData.metrics });
  const now = Date.now();

  if (mergedEvents.has(key)) {
    const existingEvent = mergedEvents.get(key);
    if (now - existingEvent.timestamp < mergeThreshold) {
      mergedEvents.set(key, { data: { ...existingEvent.data, ...eventData }, timestamp: now });
      logger.info(`CEX: Merged event "${eventData.event}".`);
    }
  } else {
    mergedEvents.set(key, { data: eventData, timestamp: now });
    logger.info(`CEX: New event "${eventData.event}".`);
  }

  cexEventBus.emit('notification', formatNotification(mergedEvents.get(key)));
}

// Очистка устаревших событий
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of mergedEvents.entries()) {
    if (now - value.timestamp > mergeThreshold) {
      mergedEvents.delete(key);
      logger.info(`CEX: Removed stale event "${key}".`);
    }
  }
}, mergeThreshold);

module.exports = { cexEventBus, processCEXEvent };
