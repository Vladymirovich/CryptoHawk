// index.js
require('dotenv').config({ path: './config/.env' });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// Запускаем ботов (пример: adminBot и marketStatsBot)
require('./bots/adminBot');
require('./bots/marketStatsBot');

// Простой HTTP-сервер для keep-alive
app.get('/', (req, res) => {
  res.send('CryptoHawk bots are running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
