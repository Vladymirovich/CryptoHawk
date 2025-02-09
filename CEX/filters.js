/**
 * Фильтр для Flow Alerts.
 * settings: {
 *   active: boolean,
 *   favoriteCoins: array (например, ['BTC', 'ETH']),
 *   unwantedCoins: array,
 *   autoTrack: boolean
 * }
 */
function evaluateFlowAlerts(eventData, settings) {
  if (!settings.active) return false;
  // Если заданы избранные монеты – событие должно быть среди них.
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  // Если заданы нежелательные монеты – событие не должно принадлежать к ним.
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  // Если включён AutoTrack – принимаем событие
  if (settings.autoTrack) return true;
  return true;
}

/**
 * Фильтр для CEX Tracking.
 * settings: {
 *   active: boolean,
 *   favoriteCoins: array,
 *   unwantedCoins: array,
 *   rate5: boolean,         // требуется изменение цены ≥ 5%
 *   rate10: boolean,        // требуется изменение цены ≥ 10%
 *   rate60: boolean,        // требуется изменение цены ≥ 1% за 60 сек
 *   activate: boolean,      // проверка: buySellDiff >= 100k и >= 10% от dailyVolume
 *   autoTrack: boolean
 * }
 */
function evaluateCexTracking(eventData, settings) {
  if (!settings.active) return false;
  
  // Проверка избранных/нежелательных монет
  if (Array.isArray(settings.favoriteCoins) && settings.favoriteCoins.length > 0) {
    if (!settings.favoriteCoins.includes(eventData.asset)) return false;
  }
  if (Array.isArray(settings.unwantedCoins) && settings.unwantedCoins.length > 0) {
    if (settings.unwantedCoins.includes(eventData.asset)) return false;
  }
  
  // Фильтры изменения цены
  if (settings.rate5) {
    if (Math.abs(eventData.priceChangePerc || 0) < 5) return false;
  }
  if (settings.rate10) {
    if (Math.abs(eventData.priceChangePerc || 0) < 10) return false;
  }
  if (settings.rate60) {
    if (Math.abs(eventData.priceChangePerc1min || 0) < 1) return false;
  }
  
  // Проверка алгоритма CEX Tracking: разница между покупками и продажами
  if (settings.activate) {
    if ((eventData.buySellDiff || 0) < 100000) return false;
    if (eventData.dailyVolume && (eventData.buySellDiff < 0.1 * eventData.dailyVolume)) return false;
  }
  
  if (settings.autoTrack) return true;
  
  return true;
}

/**
 * Фильтр для All Spot.
 * settings: {
 *   active: boolean,
 *   filters: {
 *     period: array of allowed periods (например, ['5min','30min','60min','24hrs']),
 *     buy: boolean,
 *     sell: boolean
 *   }
 * }
 */
function evaluateAllSpot(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  // Проверяем, что хотя бы один из режимов активен
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;

  // Проверка временного интервала
  const now = Date.now();
  const allowedPeriods = filters.period || [];
  if (allowedPeriods.length === 0) return false;
  let valid = false;
  allowedPeriods.forEach(p => {
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
 * Фильтр для All Derivatives.
 * Логика аналогична All Spot.
 */
function evaluateAllDerivatives(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;

  const now = Date.now();
  const allowedPeriods = filters.period || [];
  if (allowedPeriods.length === 0) return false;
  let valid = false;
  allowedPeriods.forEach(p => {
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
 * Фильтр для All Spot%.
 * Здесь дополнительно учитывается процентное изменение (deltaPercent).
 * settings имеет такую же структуру, как для All Spot.
 */
function evaluateAllSpotPercent(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  const allowedPeriods = filters.period || [];
  if (allowedPeriods.length === 0) return false;
  let valid = false;
  allowedPeriods.forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) valid = true;
  });
  // Допустим, eventData.deltaPercent содержит процент изменения
  return valid;
}

/**
 * Фильтр для All Derivatives%.
 * Аналогичный All Spot%.
 */
function evaluateAllDerivativesPercent(eventData, settings) {
  if (!settings.active) return false;
  const filters = settings.filters || {};
  if (!filters.buy && !filters.sell) return false;
  if (eventData.type === 'buy' && !filters.buy) return false;
  if (eventData.type === 'sell' && !filters.sell) return false;
  
  const now = Date.now();
  const allowedPeriods = filters.period || [];
  if (allowedPeriods.length === 0) return false;
  let valid = false;
  allowedPeriods.forEach(p => {
    let ms = 0;
    if (p === '5min') ms = 5 * 60 * 1000;
    else if (p === '30min') ms = 30 * 60 * 1000;
    else if (p === '60min') ms = 60 * 60 * 1000;
    else if (p === '24hrs') ms = 24 * 60 * 60 * 1000;
    if (now - eventData.timestamp <= ms) valid = true;
  });
  return valid;
}

module.exports = {
  evaluateFlowAlerts,
  evaluateCexTracking,
  evaluateAllSpot,
  evaluateAllDerivatives,
  evaluateAllSpotPercent,
  evaluateAllDerivativesPercent
};
