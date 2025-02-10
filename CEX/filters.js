/**
 * evaluateFlowAlerts:
 * Проверяет, что Flow Alerts активны и, если заданы, фильтрует по избранным и нежелательным монетам.
 */
function evaluateFlowAlerts(eventData, settings) {
  if (!settings.active) return false;
  
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  
  if (settings.autoTrack) return true;
  
  return true;
}

/**
 * evaluateCexTracking:
 * Если за 15 минут разница между покупками и продажами превышает 100k$ и составляет ≥10% от dailyVolume.
 * Дополнительно, если включены фильтры по изменению цены:
 *   - rate5: |priceChangePerc| ≥ 5%
 *   - rate10: |priceChangePerc| ≥ 10%
 *   - rate60: |priceChangePerc1min| ≥ 1%
 */
function evaluateCexTracking(eventData, settings) {
  if (!settings.active) return false;
  
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  
  if (settings.rate5 && Math.abs(eventData.priceChangePerc || 0) < 5) return false;
  if (settings.rate10 && Math.abs(eventData.priceChangePerc || 0) < 10) return false;
  if (settings.rate60 && Math.abs(eventData.priceChangePerc1min || 0) < 1) return false;
  
  if (settings.activate) {
    if ((eventData.buySellDiff || 0) < 100000) return false;
    if (eventData.dailyVolume && (eventData.buySellDiff < 0.1 * eventData.dailyVolume)) return false;
  }
  
  if (settings.autoTrack) return true;
  
  return true;
}

/**
 * evaluateAllSpot:
 * Проверяет, что событие происходит в течение выбранного временного интервала и соответствует режиму (buy/sell).
 * settings: {
 *   active: boolean,
 *   filters: {
 *     period: array of allowed periods (e.g., ['5min', '30min', '60min', '24hrs']),
 *     buy: boolean,
 *     sell: boolean
 *   }
 * }
 */
function evaluateAllSpot(eventData, settings) {
  if (!settings.active) return false;
  
  const filt = settings.filters || {};
  if (!filt.buy && !filt.sell) return false;
  if (eventData.type === 'buy' && !filt.buy) return false;
  if (eventData.type === 'sell' && !filt.sell) return false;
  
  const now = Date.now();
  const periods = filt.period || [];
  if (periods.length === 0) return false;
  let valid = false;
  periods.forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) valid = true;
  });
  return valid;
}

/**
 * evaluateAllDerivatives:
 * Аналогичная логика, как и для All Spot.
 */
function evaluateAllDerivatives(eventData, settings) {
  return evaluateAllSpot(eventData, settings);
}

/**
 * evaluateAllSpotPercent:
 * Фильтрует события для All Spot% по временным интервалам.
 * settings имеет ту же структуру, что и для All Spot.
 * Дополнительно ожидается, что eventData.deltaPercent содержит процентное изменение.
 */
function evaluateAllSpotPercent(eventData, settings) {
  if (!settings.active) return false;
  const filt = settings.filters || {};
  if (!filt.buy && !filt.sell) return false;
  if (eventData.type === 'buy' && !filt.buy) return false;
  if (eventData.type === 'sell' && !filt.sell) return false;
  
  const now = Date.now();
  const periods = filt.period || [];
  if (periods.length === 0) return false;
  let valid = false;
  periods.forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) valid = true;
  });
  return valid;
}

/**
 * evaluateAllDerivativesPercent:
 * Аналогична evaluateAllSpotPercent.
 */
function evaluateAllDerivativesPercent(eventData, settings) {
  return evaluateAllSpotPercent(eventData, settings);
}

module.exports = {
  evaluateFlowAlerts,
  evaluateCexTracking,
  evaluateAllSpot,
  evaluateAllDerivatives,
  evaluateAllSpotPercent,
  evaluateAllDerivativesPercent
};
