// src/api/coinmarketcap.js
require('dotenv').config({ path: __dirname + '/../../config/.env' });
const { COINMARKETCAP_API_KEY } = process.env;

async function fetchGlobalMetrics() {
  const url = 'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest';
  const options = {
    headers: {
      'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
      'Accept': 'application/json'
    }
  };

  console.log("Fetching global metrics using API key:", COINMARKETCAP_API_KEY);

  try {
    // Используем динамический импорт для node-fetch, так как v3 является ESM‑only
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log("Received global metrics:", data.data);
    return data.data;
  } catch (error) {
    console.error('Error fetching global metrics:', error);
    return null;
  }
}

module.exports = { fetchGlobalMetrics };
