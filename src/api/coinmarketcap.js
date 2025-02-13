/* =========================
 * src/api/coinmarketcap.js (Refactored)
 * ========================= */
require('dotenv').config({ path: __dirname + '/../../config/.env' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function fetchGlobalMetrics() {
  try {
    console.log("Fetching global metrics using API key:", process.env.COINMARKETCAP_API_KEY);
    const res = await fetch('https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest', {
      headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log("Received global metrics:", data.data);
    return data.data;
  } catch (error) {
    console.error('Error fetching global metrics:', error);
    return null;
  }
}

module.exports = { fetchGlobalMetrics };
