// MarketStats/events.js

const EventEmitter = require('events');
const logger = require('../logs/apiLogger');
const fs = require('fs');
const path = require('path');
const { evaluateOpenInterest, evaluateTopFunding, evaluateGenericMarketStat } = require('./filters');

class MarketStatsEventBus extends EventEmitter {}
const marketStatsEventBus = new MarketStatsEventBus();

// Загрузка шаблонов уведомлений
let templates = {};
try {
  const templatePath = path.join(__dirname, 'templates.json');
  const raw = fs.readFileSync(templatePath, 'utf8');
  templates = JSON.parse(raw);
} catch (err) {
  logger.error(`MarketStats Module: Error reading templates: ${err.message}`);
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
  const eventType = data.event_type || 'generic';
  const chosen = templates[eventType];
  if (!chosen) {
    return { message: `MarketStats Event: ${data.event}\n${JSON.stringify(data, null, 2)}` };
  }
  const templateData = {
    asset: data.asset || 'N/A',
    event: data.event || 'N/A',
    value: data.value || 'N/A',
    change: data.change || 'N/A',
    period: data.period || 'N/A',
    additionalInfo: data.additionalInfo || ''
  };
  return { message: applyTemplate(chosen, templateData) };
}

function processMarketStatsEvent(eventData) {
  const type = eventData.type;
  let passFilter = false;
  
  switch (type) {
    case 'open_interest':
    case 'top_oi':
      passFilter = evaluateOpenInterest(eventData, eventData.settings || {});
      break;
    case 'top_funding':
      passFilter = evaluateTopFunding(eventData, eventData.settings || {});
      break;
    default:
      passFilter = evaluateGenericMarketStat(eventData, eventData.settings || { active: true });
      break;
  }
  
  if (!passFilter) {
    logger.info(`MarketStats: Event "${eventData.event}" of type "${type}" filtered out.`);
    return;
  }
  
  const key = JSON.stringify({ event: eventData.event, type, metrics: eventData.metrics });
  const now = Date.now();
  if (mergedEvents[key] && (now - mergedEvents[key].timestamp < mergeThreshold)) {
    mergedEvents[key].data = { ...mergedEvents[key].data, ...eventData };
    mergedEvents[key].timestamp = now;
    logger.info(`MarketStats: Merged event "${eventData.event}" of type "${type}".`);
    marketStatsEventBus.emit('notification', formatNotification(mergedEvents[key]));
  } else {
    mergedEvents[key] = { data: eventData, timestamp: now };
    logger.info(`MarketStats: New event "${eventData.event}" of type "${type}".`);
    marketStatsEventBus.emit('notification', formatNotification(mergedEvents[key]));
  }
}

module.exports = marketStatsEventBus;
module.exports.processMarketStatsEvent = processMarketStatsEvent;
