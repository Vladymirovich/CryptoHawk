// api/coinmarketcap.js
const fetch = require('node-fetch');
const { COINMARKETCAP_API_KEY } = process.env;

async function fetchCoinMarketCapData() {
  // Пример: получаем топ-10 монет
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=10';
  const options = {
    headers: {
      'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
      'Accept': 'application/json'
    }
  };

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    return data.data; // ожидаем массив объектов монет
  } catch (error) {
    console.error('Error fetching CoinMarketCap data:', error);
    return [];
  }
}

module.exports = { fetchCoinMarketCapData };
