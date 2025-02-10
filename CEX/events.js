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
} = require('./filters');

class CEXEventBus extends EventEmitter {}
const cexEventBus = new CEXEventBus();

// Загрузка шаблонов уведомлений
let templates = {};
try {
  const templatePath = path.join(__dirname, 'templates.json');
  const raw = fs.readFileSync(templatePath, 'utf8');
  templates = JSON.parse(raw);
} catch (err) {
  logger.error(`CEX Module: Error reading templates: ${err.message}`);
}

const mergedEvents = {};
const mergeThreshold = 30 * 1000; // 30 секунд

function applyTemplate(templateObj, data) {
  let message = `${templateObj.title}\n\n${templateObj.message}`;
  templateObj.parameters.forEach((param) => {
    const regex = new RegExp(`{{${param}}}`, 'g');
    message = message.replace(regex, data[param] || 'N/A');
  });
  return message;
}

function formatNotification(eventObj) {
  const { data } = eventObj;
  // Если event_type не указан, по умолчанию используем large_inflow_outflow
  const eventType = data.event_type || 'large_inflow_outflow';
  const chosen = templates[eventType];
  if (!chosen) {
    return { message: `CEX Event: ${data.event}\n${JSON.stringify(data, null, 2)}` };
  }
  const templateData = {
    asset: data.asset || 'N/A',
    event: data.event || 'N/A',
    volume: data.volume || 'N/A',
    volume_usd: data.volume_usd || 'N/A',
    exchange: data.exchange || 'N/A',
    time_utc: data.time_utc || 'N/A',
    commentary: data.commentary || 'N/A',
    timeframe: data.timeframe || 'N/A',
    price: data.price || 'N/A',
    price_change_24h: data.price_change_24h || '',
    volume_24h: data.volume_24h || 'N/A',
    action_type: data.action_type || 'N/A',
    open_interest: data.open_interest || 'N/A',
    volatility: data.volatility || 'N/A',
    previous_time: data.previous_time || 'N/A',
    previous_text: data.previous_text || 'N/A',
    deltaPercent: data.deltaPercent || 'N/A'
  };
  return { message: applyTemplate(chosen, templateData) };
}

function processCEXEvent(eventData) {
  // category – одна из: flow_alerts, cex_tracking, all_spot, all_derivatives, all_spot_percent, all_derivatives_percent
  const category = eventData.category;
  let passFilter = false;
  switch (category) {
    case 'flow_alerts':
      passFilter = evaluateFlowAlerts(eventData, eventData.settings || {});
      break;
    case 'cex_tracking':
      passFilter = evaluateCexTracking(eventData, eventData.settings || {});
      break;
    case 'all_spot':
      passFilter = evaluateAllSpot(eventData, eventData.settings || {});
      break;
    case 'all_derivatives':
      passFilter = evaluateAllDerivatives(eventData, eventData.settings || {});
      break;
    case 'all_spot_percent':
      passFilter = evaluateAllSpotPercent(eventData, eventData.settings || {});
      break;
    case 'all_derivatives_percent':
      passFilter = evaluateAllDerivativesPercent(eventData, eventData.settings || {});
      break;
    default:
      logger.info(`CEX: Unknown category "${category}". Event filtered out.`);
      return;
  }

  if (!passFilter) {
    logger.info(`CEX: Event "${eventData.event}" did not pass filter for category "${category}".`);
    return;
  }

  const key = JSON.stringify({ event: eventData.event, metrics: eventData.metrics });
  const now = Date.now();
  if (mergedEvents[key] && (now - mergedEvents[key].timestamp < mergeThreshold)) {
    mergedEvents[key].data = { ...mergedEvents[key].data, ...eventData };
    mergedEvents[key].timestamp = now;
    logger.info(`CEX: Merged event "${eventData.event}".`);
    cexEventBus.emit('notification', formatNotification(mergedEvents[key]));
  } else {
    mergedEvents[key] = {
      data: eventData,
      timestamp: now
    };
    logger.info(`CEX: New event "${eventData.event}".`);
    cexEventBus.emit('notification', formatNotification(mergedEvents[key]));
  }
}

module.exports = cexEventBus;
module.exports.processCEXEvent = processCEXEvent;
