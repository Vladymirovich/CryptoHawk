/* =========================
 * CEX/filters.js (Optimized & Refactored)
 * ========================= */
function evaluateEvent(eventData, settings, type) {
  if (!settings.active) return false;

  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0 && !settings.favoriteCoins.includes(eventData.asset)) {
    return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0 && settings.unwantedCoins.includes(eventData.asset)) {
    return false;
  }

  if (type === 'cex_tracking') {
    if (settings.rate5 && Math.abs(eventData.priceChangePerc || 0) < 5) return false;
    if (settings.rate10 && Math.abs(eventData.priceChangePerc || 0) < 10) return false;
    if (settings.rate60 && Math.abs(eventData.priceChangePerc1min || 0) < 1) return false;
    if (settings.activate && ((eventData.buySellDiff || 0) < 100000 || (eventData.dailyVolume && eventData.buySellDiff < 0.1 * eventData.dailyVolume))) {
      return false;
    }
  }

  if (settings.autoTrack) return true;
  return true;
}

module.exports = {
  evaluateFlowAlerts: (e, s) => evaluateEvent(e, s, 'flow_alerts'),
  evaluateCexTracking: (e, s) => evaluateEvent(e, s, 'cex_tracking'),
  evaluateAllSpot: (e, s) => evaluateEvent(e, s, 'all_spot'),
  evaluateAllDerivatives: (e, s) => evaluateEvent(e, s, 'all_derivatives'),
  evaluateAllSpotPercent: (e, s) => evaluateEvent(e, s, 'all_spot_percent'),
  evaluateAllDerivativesPercent: (e, s) => evaluateEvent(e, s, 'all_derivatives_percent')
};
