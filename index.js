// index.js
require('dotenv').config({ path: './config/.env' });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

// Запускаем все боты (каждый бот должен использовать уникальный токен)
require('./bots/adminBot');
require('./bots/marketStatsBot');
require('./bots/cexBot');

// Запускаем простой HTTP-сервер для keep-alive (важно для Railway)
app.get('/', (req, res) => {
  res.send('CryptoHawk bots are running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
