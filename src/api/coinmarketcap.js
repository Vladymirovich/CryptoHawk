// src/api/coinmarketcap.js
require('dotenv').config({ path: __dirname + '/../../config/.env' });
const fetch = require('node-fetch');
const { COINMARKETCAP_API_KEY } = process.env;

async function fetchCoinMarketCapData() {
  // Пример запроса: получаем топ-10 монет
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  const options = {
    headers: {
      'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
      'Accept': 'application/json'
    }
  };

  console.log("Fetching CoinMarketCap data using API key:", COINMARKETCAP_API_KEY);

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log("Received data from CoinMarketCap:", data.data.length, "coins");
    return data.data;
  } catch (error) {
    console.error('Error fetching CoinMarketCap data:', error);
    return [];
  }
}

module.exports = { fetchCoinMarketCapData };
