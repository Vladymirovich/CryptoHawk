// CEX/settings.js
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'cexSettings.json');

// Значения по умолчанию для настроек фильтров CEX Screen
const defaultCexSettings = {
  flowAlerts: {},
  cexTracking: {},
  allSpot: {},
  allDerivatives: {},
  allSpotPercent: {},
  allDerivativesPercent: {}
};

// Функция загрузки настроек (если файл существует, объединяет с настройками по умолчанию)
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      return { ...defaultCexSettings, ...parsed };
    }
  } catch (err) {
    console.error("Error loading CEX settings:", err.message);
  }
  return { ...defaultCexSettings };
}

// Функция сохранения настроек в файл
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving CEX settings:", err.message);
  }
}

const cexUserFilters = loadSettings();

module.exports = { cexUserFilters, saveSettings };
