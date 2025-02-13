require('dotenv').config({ path: './config/.env' });
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting CryptoHawk project...");

require('./bots/adminBot');
require('./bots/marketStatsBot');
require('./bots/cexBot');

app.get('/', (req, res) => res.send('CryptoHawk bots are running.'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
