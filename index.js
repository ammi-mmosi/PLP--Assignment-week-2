const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// 1. In-Memory Queue State
const queue = [];
let isProcessing = false;

// Simulated Database
const inventoryDb = {
  't-shirt-1': 100
};

// 2. Sequential Background Worker
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const nextTask = queue.shift();
    console.log('[Worker] Processing order ' + nextTask.orderId + ' for SKU ' + nextTask.sku);

    // Simulate database write delay (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    if (inventoryDb[nextTask.sku] !== undefined) {
      inventoryDb[nextTask.sku] -= nextTask.quantity;
      console.log('[Worker] Success! Updated stock for ' + nextTask.sku + ' to: ' + inventoryDb[nextTask.sku]);
    } else {
      console.log('[Worker] Failed! SKU ' + nextTask.sku + ' not found.');
    }
  }

  isProcessing = false;
}

// 3. Webhook Input Validation Helper
function validateOrderWebhook(payload) {
  const errors = [];
  if (!payload.orderId || typeof payload.orderId !== 'string') {
    errors.push("Missing or invalid 'orderId'.");
  }
  if (!payload.sku || typeof payload.sku !== 'string') {
    errors.push("Missing or invalid 'sku'.");
  }
  if (typeof payload.quantity !== 'number' || payload.quantity <= 0 || !Number.isInteger(payload.quantity)) {
    errors.push("Invalid 'quantity' (must be positive integer).");
  }
  const allowedChannels = ['shopify', 'amazon'];
  if (!payload.channel || !allowedChannels.includes(payload.channel)) {
    errors.push("Invalid 'channel' (must be 'shopify' or 'amazon').");
  }
  return { isValid: errors.length === 0, errors };
}

// 4. Safe Browser Route
app.get('/', (req, res) => {
  res.send('Inventory Sync Gateway is Online!');
});

// 5. Ingestion Route
app.post('/webhooks/order', (req, res) => {
  console.log('[Express] Received webhook payload:', req.body);
  
  const validation = validateOrderWebhook(req.body);
  if (!validation.isValid) {
    console.warn('[Express] Rejected invalid webhook:', validation.errors);
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  queue.push(req.body);
  console.log('[Express] Buffered task ' + req.body.orderId + '. Queue size: ' + queue.length);
  
  processQueue();
  res.status(200).send('Webhook queued and validated!');
});

app.listen(PORT, () => {
  console.log('Server running! Open http://localhost:' + PORT + ' in your browser');
});