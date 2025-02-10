require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const logger = require('../logs/apiLogger');
const promClient = require('prom-client');

const app = express();
app.use(bodyParser.json());

// HMAC
app.use((req, res, next) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return next();
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (signature !== hmac) {
    logger.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }
  next();
});

// Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Count of all HTTP requests',
  labelNames: ['method', 'endpoint']
});
register.registerMetric(httpRequestCounter);

app.use((req, res, next) => {
  httpRequestCounter.inc({ method: req.method, endpoint: req.path });
  next();
});

app.post('/webhook', (req, res) => {
  logger.info('Webhook event received', req.body);
  // Вы можете вызывать processCEXEvent из CEX/events, если category = cex...
  res.status(200).send('OK');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const PORT = process.env.WEBHOOK_PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Webhook + Prometheus server listening on port ${PORT}`);
});
