# PLP Assignment 2

## Overview

This repository documents two stages of an event-driven backend architecture built for the Meridian Pivot engineering simulation: an **initial (main) implementation** using a decoupled ingestion pipeline, and a **pivot implementation** that extends the same core pattern (validate → queue → sequential worker) into a full asynchronous webhook-callback model for a real-world use case. Both branches share the same architectural philosophy — fast, non-blocking ingestion decoupled from slower downstream processing — but the pivot branch adds duplicate-request protection and a callback-driven state resolution loop.

| Branch | Use Case | Core Pattern |
|---|---|---|
| **`main`** | Order webhook → inventory sync | Validate → Queue → Sequential Worker |
| **`pivot`** | Kiosk scan → badge print confirmation | Validate → Lock State → Queue → Webhook Callback Resolution |

---

## 🔀 What Changed Between Branches

The `pivot` branch is not a bug fix — it's an architectural evolution of the same core idea, applied to a scenario with an external hardware dependency (a physical badge printer) instead of a database write.

| Attribute | `main` (Order Sync) | `pivot` (Kiosk Print) |
|---|---|---|
| **Trigger** | External sales channel webhook | Staff QR code scan |
| **Immediate response** | `200 OK` after queuing | `202 Accepted` after state lock |
| **Concurrency guard** | Boolean lock (`isProcessing`) on the worker loop | State lock (`Pending`) on the individual record |
| **Completion signal** | Worker loop finishes processing internally | External vendor calls back via `/api/printer/callback` |
| **Duplicate protection** | Implicit (FIFO queue processes everything once) | Explicit `409 Conflict` on repeat scans while `Pending` |
| **Final state source** | Local worker computes the result | Third-party webhook confirms the result |

In short: `main` decouples ingestion from *internal* processing speed. `pivot` goes a step further and decouples ingestion from an *external* system's completion time, using a callback instead of assuming the worker alone can finish the job.

---

## 🧩 Branch 1: `main` — Order Ingestion & Inventory Sync

### Architecture

```
                    [ Incoming Webhook ]
                             │
                             ▼
             ┌──────────────────────────────┐
             │  1. Express HTTP Gateway     │  <-- Responds with 200 OK instantly
             └───────────────┬──────────────┘
                             │
                             ▼
             ┌──────────────────────────────┐
             │  2. Input Schema Validator   │  <-- Filters out malformed data
             └───────────────┬──────────────┘
                             │
                             ▼
             ┌──────────────────────────────┐
             │  3. In-Memory Array Queue    │  <-- Buffers incoming load spikes
             └───────────────┬──────────────┘
                             │
                             ▼
             ┌──────────────────────────────┐
             │  4. Sequential Worker Loop   │  <-- Single-worker thread lock (Mutex)
             └───────────────┬──────────────┘
                             │
                             ▼
             ┌──────────────────────────────┐
             │  5. Local Database Store     │  <-- Consistent state updates
             └──────────────────────────────┘
```

| Component | Implementation | Responsibility |
|---|---|---|
| **HTTP Gateway** | `app.post('/webhooks/order')` | Single entry point for incoming order webhooks |
| **Input Validator** | `validateOrderWebhook()` | Rejects malformed or invalid payloads |
| **In-Memory Queue** | `const queue = []` | Buffers validated payloads to absorb traffic spikes |
| **Background Worker** | `processQueue()` | Sequentially drains the queue, one task at a time |
| **Database State Store** | `const inventoryDb` | Local source of truth for current stock levels |

### Getting Started — `main` branch

```bash
git clone https://github.com/ammi-mmosi/plp-assignment-2.git
```

```bash
cd plp-assignment-2
```

```bash
npm install express
```

```bash
node index.js
```

Expected output:

```
Server running! Open http://localhost:3000 in your browser
```

### Running the Test — `main` branch

In a **second terminal**, with the server still running:

```bash
node test-webhook.js
```

**Client output:**

```
Response from Server: Webhook queued and validated!
```

**Server output** (after a simulated 500ms DB write):

```
[Express] Received webhook payload: { orderId: 'ord_994857', sku: 't-shirt-1', ... }
[Express] Buffered task ord_994857. Current Queue size: 1
[Worker] Processing order ord_994857 for SKU t-shirt-1
[Worker] Success! Updated stock for t-shirt-1 to: 98
```

---

## 🔄 Branch 2: `pivot` — Solstice Kiosk Badge Printing

### Architecture

```
[Staff Scan QR]
       │
       ▼
┌────────────────────────┐
│ Express Ingestion API  │ ──(Instant 202 Accepted)──> [Update UI to Pending]
│ - Runs Idempotency Check│
│ - Pushes to Local Queue│
└────────────────────────┘
       │
       ▼
┌────────────────────────┐
│ In-Memory Msg Queue    │
└────────────────────────┘
       │
       ▼
┌────────────────────────┐
│ Background Worker Loop │
└────────────────────────┘
       │
       ▼
[Vendor Printer Queue] ──(Processes Physical Print Job)──┐
                                                         │
                                                 (Webhook Callback)
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  Webhook Callback   │
                                              │  Endpoint Handler   │
                                              └─────────────────────┘
                                                         │
                                               (State Transition)
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │   Database State    │
                                              │   ("Checked In")    │
                                              └─────────────────────┘
```

### Three-State UI Flow

1. **Unscanned** — baseline state; kiosk prompts for a scan.
2. **Pending** — set the instant a valid scan is received. The kiosk shows a loading spinner; any duplicate scan is rejected with `409 Conflict`.
3. **Checked In** — set once the printer vendor's webhook callback confirms a successful print. The kiosk spinner resolves to a success checkmark.

### Getting Started — `pivot` branch

```bash
git clone https://github.com/ammi-mmosi/plp-assignment-2.git
```

```bash
cd plp-assignment-2
```

```bash
git checkout pivot
```

```bash
npm install express
```

```bash
node index.js
```

Expected output:

```
Solstice Kiosk server running on http://localhost:3000
```

### Running the Test — `pivot` branch

In a **second terminal**, with the server still running:

```bash
node test-pivot.js
```

This asserts, end to end:

1. Initial scan for Alice (`att_1`) → `202 Accepted`, status `Pending`.
2. Immediate duplicate scan → `409 Conflict`, confirming the idempotency guard.
3. Simulated printer success callback → `200 OK`.
4. Final database check → Alice's status is `Checked In`.

---

## 🧭 Idempotency & Concurrency Design (Both Branches)

| Branch | Lock Mechanism | What It Prevents |
|---|---|---|
| `main` | Boolean `isProcessing` flag guards the worker loop | Two worker loops running concurrently over the same queue |
| `pivot` | Per-record `Pending` state guards individual attendees | Duplicate print jobs from rapid double-scans on the same attendee |

Both patterns commit their lock **synchronously, before any async work begins** — creating an application-level mutex that holds regardless of how many requests arrive concurrently.

## 🔍 Troubleshooting (Both Branches)

**Port 3000 already in use:**

```bash
npx kill-port 3000
```

**Windows PowerShell + curl:** PowerShell's `curl` alias maps to `Invoke-WebRequest`, which rejects standard cURL flags. Avoid this entirely by using the provided `node test-webhook.js` / `node test-pivot.js` scripts — they run identically across Bash, CMD, and PowerShell.