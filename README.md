# Overview

PLP Assignment 2 is a Node.js ingestion gateway that receives order webhooks from external sales channels (Shopify, Amazon) and synchronizes inventory counts in real time. It uses a decoupled, event-driven pipeline — validation, an in-memory FIFO queue, and a lock-protected sequential worker — to absorb traffic spikes and prevent race conditions during database writes. Built with pure, dependency-light JavaScript and Express, it demonstrates a shift from legacy polling to a resilient, real-time webhook-push architecture


NOTE FROM MMOSI: Check the Day-4-Pivot Branch to see the updated version with the pivot included


## Getting Started

Clone the repository:

```bash
git clone https://github.com/ammi-mmosi/plp-assignment-2.git
```

Move into the project directory:

```bash
cd plp-assignment-2
```

Install dependencies:

```bash
npm install express
```

Start the server:

```bash
node index.js
```

You should see:

```
Server running! Open http://localhost:3000 in your browser
```

Open `http://localhost:3000` in your browser to confirm the health check route is live.

## Testing the Webhook

The repo includes `test-webhook.js`, a simple client script that POSTs a sample order payload. Keep the server running in one terminal, then in a **second terminal** run:

```bash
node test-webhook.js
```

**Expected client output:**

```
Response from Server: Webhook queued and validated!
```

**Expected server output** (after a simulated 500ms DB write):

```
[Express] Received webhook payload: { orderId: 'ord_994857', sku: 't-shirt-1', ... }
[Express] Buffered task ord_994857. Current Queue size: 1
[Worker] Processing order ord_994857 for SKU t-shirt-1
[Worker] Success! Updated stock for t-shirt-1 to: 98
```
