/* =========================
 * CEX/events.js (Refactored)
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
} = require('../utils/filters');

class CEXEventBus extends EventEmitter {}
const cexEventBus = new CEXEventBus();

// Load notification templates
const templatePath = path.join(__dirname, '../config/templates.json');
const templates = fs.existsSync(templatePath) ? JSON.parse(fs.readFileSync(templatePath, 'utf8')) : {};

const mergedEvents = {};
const mergeThreshold = 30 * 1000; // 30 секунд

// Utility function to apply template
function applyTemplate(templateObj, data) {
  return Object.keys(data).reduce((message, param) => {
    return message.replace(new RegExp(`{{${param}}}`, 'g'), data[param] || 'N/A');
  }, `${templateObj.title}\n\n${templateObj.message}`);
}

// Format event notifications
function formatNotification(eventObj) {
  const { data } = eventObj;
  const eventType = data.event_type || 'large_inflow_outflow';
  const chosen = templates[eventType];
  if (!chosen) return { message: `CEX Event: ${data.event}\n${JSON.stringify(data, null, 2)}` };

  return { message: applyTemplate(chosen, data) };
}

// Process and filter CEX events
function processCEXEvent(eventData) {
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
    logger.info(`CEX: Unknown category "${category}". Event filtered out.`);
    return;
  }

  if (!filterMap[category](eventData, eventData.settings || {})) {
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
    mergedEvents[key] = { data: eventData, timestamp: now };
    logger.info(`CEX: New event "${eventData.event}".`);
    cexEventBus.emit('notification', formatNotification(mergedEvents[key]));
  }
}

// Clear old events periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(mergedEvents).forEach(key => {
    if (now - mergedEvents[key].timestamp > mergeThreshold) delete mergedEvents[key];
  });
}, mergeThreshold);

module.exports = { cexEventBus, processCEXEvent };
