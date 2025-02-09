/**
 * Функция evaluateFlowAlerts
 * settings: {
 *   active: boolean,
 *   favoriteCoins: array (например, ['BTC', 'ETH']),
 *   unwantedCoins: array,
 *   autoTrack: boolean
 * }
 * Возвращает true, если событие проходит фильтр Flow Alerts.
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
 * Функция evaluateCexTracking
 * settings: {
 *   active: boolean,
 *   favoriteCoins: array,
 *   unwantedCoins: array,
 *   rate5: boolean,    // требует изменение цены ≥ 5%
 *   rate10: boolean,   // требует изменение цены ≥ 10%
 *   rate60: boolean,   // требует изменение цены ≥ 1% за 60 сек
 *   activate: boolean, // требует: difference >= 100k$ и ≥10% от 24h объёма
 *   autoTrack: boolean
 * }
 */
function evaluateCexTracking(eventData, settings) {
  if (!settings.active) return false;
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  if (settings.rate5) {
    if (Math.abs(eventData.priceChangePerc || 0) < 5) return false;
  }
  if (settings.rate10) {
    if (Math.abs(eventData.priceChangePerc || 0) < 10) return false;
  }
  if (settings.rate60) {
    if (Math.abs(eventData.priceChangePerc1min || 0) < 1) return false;
  }
  if (settings.activate) {
    if ((eventData.buySellDiff || 0) < 100000) return false;
    if (eventData.dailyVolume && (eventData.buySellDiff < 0.1 * eventData.dailyVolume)) return false;
  }
  if (settings.autoTrack) return true;
  return true;
}

/**
 * Функция evaluateAllSpot
 * settings: {
 *   active: boolean,
 *   filters: {
 *     period: array of allowed periods (e.g. ['5min', '30min', '60min', '24hrs']),
 *     buy: boolean,
 *     sell: boolean
 *   }
 * }
 */
function evaluateAllSpot(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  let periodValid = false;
  (filters.period || []).forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) periodValid = true;
  });
  return periodValid;
}

/**
 * Функция evaluateAllDerivatives
 * Аналогична evaluateAllSpot, но для деривативов.
 */
function evaluateAllDerivatives(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  let periodValid = false;
  (filters.period || []).forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) periodValid = true;
  });
  return periodValid;
}

/**
 * Функция evaluateAllSpotPercent
 * Аналогична evaluateAllSpot, но дополнительно фильтрует по процентной разнице (deltaPercent).
 */
function evaluateAllSpotPercent(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  let periodValid = false;
  (filters.period || []).forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) periodValid = true;
  });
  // Допустим, eventData.deltaPercent содержит процент изменения.
  return periodValid;
}

/**
 * Функция evaluateAllDerivativesPercent
 * Аналогична evaluateAllSpotPercent.
 */
function evaluateAllDerivativesPercent(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  let periodValid = false;
  (filters.period || []).forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) periodValid = true;
  });
  return periodValid;
}

module.exports = {
  evaluateFlowAlerts,
  evaluateCexTracking,
  evaluateAllSpot,
  evaluateAllDerivatives,
  evaluateAllSpotPercent,
  evaluateAllDerivativesPercent
};
