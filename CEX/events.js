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

// In-memory settings (в реальном проекте можно хранить в базе)
const cexSettings = {
  flowAlerts: { active: false },
  cexTracking: { active: false },
  allSpot: { active: false, filters: {} },
  allDerivatives: { active: false, filters: {} },
  allSpotPercent: { active: false, filters: {} },
  allDerivativesPercent: { active: false, filters: {} }
};

class CEXEventBus extends EventEmitter {}
const cexEventBus = new CEXEventBus();

let templates = {};
try {
  const templatePath = path.join(__dirname, 'templates.json');
  const raw = fs.readFileSync(templatePath, 'utf8');
  templates = JSON.parse(raw);
} catch (err) {
  logger.error(`CEX Module: Error reading templates: ${err.message}`);
}

const mergedEvents = {};
const mergeThreshold = 30 * 1000;

function applyTemplate(templateObj, data) {
  let msg = `${templateObj.title}\n\n${templateObj.message}`;
  templateObj.parameters.forEach((p) => {
    const reg = new RegExp(`{{${p}}}`, 'g');
    msg = msg.replace(reg, data[p] || 'N/A');
  });
  return msg;
}

function formatNotification(eventObj) {
  const { data } = eventObj;
  const eventType = data.event_type || 'default_cex';
  const chosen = templates[eventType];
  if (!chosen) {
    return {
      message: `CEX Event: ${data.name}\nDetails: ${JSON.stringify(data, null, 2)}`
    };
  }

  const msgData = {
    asset: data.asset || 'N/A',
    volume: data.volume || 'N/A',
    volume_usd: data.volume_usd || 'N/A',
    exchange: data.exchange || 'N/A',
    time_utc: data.time_utc || 'N/A',
    action_type: data.action_type || 'N/A'
  };
  return { message: applyTemplate(chosen, msgData) };
}

function processCEXEvent(eventData) {
  // Определяем категорию (flow_alerts, cex_tracking, all_spot, ...).
  const category = eventData.category; // например, 'flow_alerts'
  let pass = false;

  switch (category) {
    case 'flow_alerts':
      pass = evaluateFlowAlerts(eventData, cexSettings.flowAlerts);
      break;
    case 'cex_tracking':
      pass = evaluateCexTracking(eventData, cexSettings.cexTracking);
      break;
    case 'all_spot':
      pass = evaluateAllSpot(eventData, cexSettings.allSpot);
      break;
    case 'all_derivatives':
      pass = evaluateAllDerivatives(eventData, cexSettings.allDerivatives);
      break;
    case 'all_spot_percent':
      pass = evaluateAllSpotPercent(eventData, cexSettings.allSpotPercent);
      break;
    case 'all_derivatives_percent':
      pass = evaluateAllDerivativesPercent(eventData, cexSettings.allDerivativesPercent);
      break;
    default:
      // Если категория не указана или неизвестна – можно либо пропускать, либо принимать
      pass = false;
  }

  if (!pass) {
    logger.info(`CEX: Event [${eventData.name}] filtered out by category ${category}.`);
    return;
  }

  // Механизм объединения (30с)
  const key = JSON.stringify({
    name: eventData.name,
    metrics: eventData.metrics
  });
  const now = Date.now();

  if (mergedEvents[key] && (now - mergedEvents[key].timestamp < mergeThreshold)) {
    mergedEvents[key].data = { ...mergedEvents[key].data, ...eventData };
    mergedEvents[key].timestamp = now;
    logger.info(`CEX: Merged event ${eventData.name}`);
    cexEventBus.emit('notification', formatNotification(mergedEvents[key]));
  } else {
    mergedEvents[key] = {
      data: eventData,
      timestamp: now
    };
    logger.info(`CEX: New event ${eventData.name}`);
    cexEventBus.emit('notification', formatNotification(mergedEvents[key]));
  }
}

module.exports = cexEventBus;
module.exports.processCEXEvent = processCEXEvent;
