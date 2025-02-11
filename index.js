// index.js
require('dotenv').config({ path: './config/.env' });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// Запускаем все боты (каждый бот должен использовать уникальный Telegram-токен)
// Admin Bot (например, bots/adminBot.js)
require('./bots/adminBot');

// MarketStats Bot (например, bots/marketStatsBot.js)
// В этом файле должен присутствовать вызов: require('../MarketStats/poller') для запуска опроса API
require('./bots/marketStatsBot');

// Если есть и другие боты (например, CEX Bot), можно добавить:
// require('./bots/cexBot');

// Поднимаем простой HTTP-сервер для keep-alive (необходим Railway.app)
app.get('/', (req, res) => {
  res.send('CryptoHawk bots are running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
