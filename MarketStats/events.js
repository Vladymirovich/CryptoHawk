// MarketStats/events.js
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { evaluateOpenInterest, evaluateTopFunding, evaluateGenericMarketStat } = require('./filters');

class MarketStatsEventBus extends EventEmitter {}
const marketStatsEventBus = new MarketStatsEventBus();

let templates = {};
try {
  const templatePath = path.join(__dirname, 'templates.json');
  const raw = fs.readFileSync(templatePath, 'utf8');
  templates = JSON.parse(raw);
} catch (err) {
  console.error(`MarketStats Module: Error reading templates: ${err.message}`);
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
  const eventType = data.type || 'generic';
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
    graph_url: data.graph_url || 'N/A'
  };
  return { message: applyTemplate(chosen, templateData), graph_url: templateData.graph_url };
}

function processMarketStatsEvent(eventData) {
  let passFilter = false;
  switch (eventData.type) {
    case 'open_interest':
      passFilter = evaluateOpenInterest(eventData, { active: true });
      break;
    case 'top_funding':
      passFilter = evaluateTopFunding(eventData, { active: true });
      break;
    default:
      passFilter = evaluateGenericMarketStat(eventData, { active: true });
      break;
  }
  
  if (!passFilter) {
    console.log(`MarketStats: Event "${eventData.event}" of type "${eventData.type}" filtered out.`);
    return;
  }
  
  const key = JSON.stringify({ event: eventData.event, type: eventData.type, metrics: eventData.metrics });
  const now = Date.now();
  
  if (mergedEvents[key] && (now - mergedEvents[key].timestamp < mergeThreshold)) {
    mergedEvents[key].data = { ...mergedEvents[key].data, ...eventData };
    mergedEvents[key].timestamp = now;
    console.log(`MarketStats: Merged event "${eventData.event}" of type "${eventData.type}".`);
    marketStatsEventBus.emit('notification', formatNotification(mergedEvents[key]));
  } else {
    mergedEvents[key] = { data: eventData, timestamp: now };
    console.log(`MarketStats: New event "${eventData.event}" of type "${eventData.type}".`);
    marketStatsEventBus.emit('notification', formatNotification(mergedEvents[key]));
  }
}

module.exports = marketStatsEventBus;
module.exports.processMarketStatsEvent = processMarketStatsEvent;
