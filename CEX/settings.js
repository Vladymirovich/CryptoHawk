const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'cexSettings.json');

// Функция загрузки настроек (если файл существует, иначе пустой объект)
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading CEX settings:", err.message);
  }
  return {};
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
