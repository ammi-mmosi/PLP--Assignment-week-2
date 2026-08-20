# Pivot Branch — Solstice Kiosk Badge Printing

## Overview

The `pivot` branch documents the Day 4 architectural pivot for Solstice Events Co.: a shift from a synchronous, blocking badge-print API to an asynchronous message-queue + webhook-callback model. Instead of holding the connection open while a physical printer heats up and prints, the server now accepts a scan, instantly locks the attendee's state to `Pending`, and returns a `202 Accepted` — resolving to `Checked In` only once the printer vendor confirms completion via a callback. This eliminates duplicate print jobs and keeps kiosk response times sub-millisecond, even under high check-in volume.

## What Changed

| Attribute | Synchronous (Day 3 Legacy) | Asynchronous (Day 4 Pivot) |
|---|---|---|
| **Gateway ingestion** | Blocks the connection until the physical print finishes | Pushes the task to a queue and returns `202 Accepted` instantly |
| **Latency** | High and variable, dependent on hardware speed | Sub-millisecond response |
| **Double-print protection** | Vulnerable to rapid concurrent double-taps | Guaranteed by an immediate `Pending` state lock |
| **Downtime impact** | Entire system hangs if one printer stalls | Non-blocking; tasks buffer gracefully |

## Three-State UI Flow

Each attendee moves through a simple state machine:

1. **Unscanned** — baseline state; kiosk prompts for a scan.
2. **Pending** — set the instant a valid scan is received. The kiosk shows a loading spinner, and any duplicate scan is rejected with `409 Conflict`.
3. **Checked In** — set once the printer vendor's webhook callback confirms a successful print. The kiosk spinner resolves to a success checkmark.

## Getting Started

Clone the repository and switch to the `pivot` branch:

```bash
git clone https://github.com/ammi-mmosi/plp-assignment-2.git
```

```bash
cd plp-assignment-2
```

```bash
git checkout pivot
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
Solstice Kiosk server running on http://localhost:3000
```

## Testing the Pivot Flow

With the server running, open a **second terminal** and run the integration test:

```bash
node test-pivot.js
```

This script simulates the full flow end-to-end:

1. Sends an initial print request for Alice (`att_1`) — expects `202 Accepted`, status `Pending`.
2. Immediately sends a duplicate scan for Alice — expects `409 Conflict`, confirming the idempotency guard blocks it.
3. Simulates the printer vendor's success callback to `/api/printer/callback` — expects `200 OK`.
4. Fetches `/` to verify Alice's final database state is `Checked In`.

Watch both terminal windows to see the state transitions logged step-by-step as the scan is ingested, blocked on duplicate, and resolved via webhook.

## Idempotency & Concurrency Design

Idempotency is enforced through **state locking** at the ingestion layer:

- Every `/api/print` request is checked against the attendee's current state before anything else happens.
- If the state is already `Pending` or `Checked In`, the request is rejected immediately.
- The transition to `Pending` happens synchronously, *before* any downstream network call — creating an application-level mutex that prevents rapid double-scans from triggering multiple print jobs.
