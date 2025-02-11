// index.js
require('dotenv').config({ path: './config/.env' });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// Запускаем Admin Bot
require('./bots/adminBot');

// Запускаем MarketStats Bot
require('./bots/marketStatsBot');

// Запускаем CEX Bot
require('./bots/cexBot');

// Простейший HTTP-сервер для keep-alive (обязательно для Railway и подобных сервисов)
app.get('/', (req, res) => {
  res.send('CryptoHawk bots are running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
