// MarketStats/filters.js

/**
 * Фильтр для Open Interest / Top OI.
 * settings: {
 *   active: boolean,
 *   mode: "gainers" | "losers" | "both",
 *   changeFilters: array of numbers, // например, [2.5, 5]
 *   period: array of strings // например, ["15min", "30min"]
 * }
 * eventData должен содержать: oiChangePerc15, oiChangePerc30 (числа)
 */
function evaluateOpenInterest(eventData, settings) {
  if (!settings.active) return false;
  let valid = false;
  if (settings.period.includes("15min") && typeof eventData.oiChangePerc15 === 'number') {
    if (settings.mode === "gainers" && eventData.oiChangePerc15 > 0) valid = true;
    else if (settings.mode === "losers" && eventData.oiChangePerc15 < 0) valid = true;
    else if (settings.mode === "both") valid = true;
  }
  if (!valid && settings.period.includes("30min") && typeof eventData.oiChangePerc30 === 'number') {
    if (settings.mode === "gainers" && eventData.oiChangePerc30 > 0) valid = true;
    else if (settings.mode === "losers" && eventData.oiChangePerc30 < 0) valid = true;
    else if (settings.mode === "both") valid = true;
  }
  if (settings.changeFilters && settings.changeFilters.length > 0) {
    let meetsThreshold = false;
    if (settings.period.includes("15min") && typeof eventData.oiChangePerc15 === 'number') {
      settings.changeFilters.forEach(th => {
        if (Math.abs(eventData.oiChangePerc15) >= th) meetsThreshold = true;
      });
    }
    if (!meetsThreshold && settings.period.includes("30min") && typeof eventData.oiChangePerc30 === 'number') {
      settings.changeFilters.forEach(th => {
        if (Math.abs(eventData.oiChangePerc30) >= th) meetsThreshold = true;
      });
    }
    valid = valid && meetsThreshold;
  }
  return valid;
}

/**
 * Фильтр для Top Funding.
 * settings: {
 *   active: boolean,
 *   mode: "highest" | "lowest" | "both",
 *   period: array of strings // например, ["4h"]
 * }
 * eventData должен содержать: fundingRate (число) и timestamp
 */
function evaluateTopFunding(eventData, settings) {
  if (!settings.active) return false;
  let valid = false;
  if (settings.mode === "highest" && eventData.fundingRate > 0) valid = true;
  else if (settings.mode === "lowest" && eventData.fundingRate < 0) valid = true;
  else if (settings.mode === "both") valid = true;
  if (settings.period && settings.period.includes("4h")) {
    const now = Date.now();
    if (now - eventData.timestamp > 4 * 60 * 60 * 1000) valid = false;
  }
  return valid;
}

/**
 * Универсальный фильтр для остальных событий.
 * settings: { active: boolean }
 */
function evaluateGenericMarketStat(eventData, settings) {
  return settings.active;
}

module.exports = {
  evaluateOpenInterest,
  evaluateTopFunding,
  evaluateGenericMarketStat
};
