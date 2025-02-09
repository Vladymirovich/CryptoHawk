function evaluateFlowAlerts(eventData, settings) {
  if (!settings.active) return false;
  // Избранные монеты, ненужные монеты, autoTrack
  // ... 
  return true;
}

function evaluateCexTracking(eventData, settings) {
  if (!settings.active) return false;
  // rate5, rate10, rate60, activate, autoTrack, favoriteCoins, unwantedCoins
  // ...
  return true;
}

function evaluateAllSpot(eventData, settings) {
  if (!settings.active) return false;
  // buy/sell, 5min,30min,60min,24hrs
  return true;
}

function evaluateAllDerivatives(eventData, settings) {
  if (!settings.active) return false;
  // buy/sell, 5min,30min,60min,24hrs
  return true;
}

function evaluateAllSpotPercent(eventData, settings) {
  if (!settings.active) return false;
  // buy/sell, 5min,30min,60min,24hrs
  // delta% ?
  return true;
}

function evaluateAllDerivativesPercent(eventData, settings) {
  if (!settings.active) return false;
  // buy/sell, 5min,30min,60min,24hrs
  // delta%
  return true;
}

module.exports = {
  evaluateFlowAlerts,
  evaluateCexTracking,
  evaluateAllSpot,
  evaluateAllDerivatives,
  evaluateAllSpotPercent,
  evaluateAllDerivativesPercent
};
