const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

//1. In-Memory state store (simulating database)
//this is supposed to ttrack the state of each attendee
const attendeeDatabase = {
    'mtu_1': {name: 'Olkalau', status: 'unscanned'},
    'mtu_2': {name: 'Lewis', status: 'unscanned'},
    'mtu_3': {name: 'Kamau', status: 'unscanned'},
    'mtu_4': {name: 'Georgia', status: 'unscanned'}
};

//2. Kiosk Print Request Endpoint
app.post('/api/print', (req, res) => {
    const { attendeeId } = req.body;
    console.log('[Kiosk] Scan recieved for Attendee:' + attendeeId);

    const attendee = attendeeDatabase[attendeeId];
    if (!attendee) {
        return res.status(404).json({ success: false, message:'Huyu jamaa hayuko! Attendee not found'});

    }

    //IDEMPOTENCY GUARD: Block if already printing or already checked in
    if (attendee.status === 'Pending') {
        console.warn('[Kiosk] Duplicate scan blocked. Print job is already in progress for Attendee: ' + attendeeId);
        return res.status(409).json({success: false, message: 'Print job already in progress.'});
    }

    //change state from unscanned to pending
    attendee.status = 'Pending';
    console.log('[Database] Attendee ' + attendeeId + ' status transitioned to: Pending');

    //Simulate publishing the print task to the vendor's queue asynchronously
    console.log('[Queue] Publishing printing job for ' + attendeeId + 'statust trasitioned to: Pending');

    // // Simulate publishing the print task to the vendor's queue asynchronously
  console.log('[Queue] Publishing print job for ' + attendeeId + ' to vendor message queue...');

  // Return a fast 202 Accepted status to keep the UI snappy!
  return res.status(202).json({
    success: true,
    message: 'Print job accepted. Status: Pending',
    status: 'Pending'
  });
});

// 3. DAY 4 PIVOT SPEC: Printer Webhook Callback
// This endpoint is exposed to receive callbacks from the vendor's printer queue
app.post('/api/printer/callback', (req, res) => {
  const { attendeeId, printStatus } = req.body;
  console.log('[Printer Webhook] Received callback for ' + attendeeId + '. Status: ' + printStatus);

  const attendee = attendeeDatabase[attendeeId];
  if (!attendee) {
    return res.status(404).json({ success: false, message: 'Attendee not found' });
  }

  if (printStatus === 'SUCCESS') {
    // Transition state from "Pending" to "Checked In"
    attendee.status = 'Checked In';
    console.log('[Database] Attendee ' + attendeeId + ' status updated to: Checked In');
  } else {
    // Fallback to Unscanned if print failed so they can retry
    attendee.status = 'Unscanned';
    console.error('[Database] Print failed. Resetting ' + attendeeId + ' to: Unscanned');
  }

  // Acknowledge receipt of the webhook to the printer vendor
  return res.status(200).send('Webhook processed.');
});

// Root check route
app.get('/', (req, res) => {
  res.json({ success: true, database: attendeeDatabase });
});

app.listen(PORT, () => {
  console.log('Solstice Kiosk server running on http://localhost:' + PORT);
});


