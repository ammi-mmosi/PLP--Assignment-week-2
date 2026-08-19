const express = require('express');
const app = express();
const port = 3000;

//Middleware to parse incoming JSON bodies
app.use(express.json());

//Webhook ingestion route
app.post('/webhooks/order',(req, res) => {
    console.log('Received wbhook payload:', req.body);

   // Execute validation check
  const validation = validateOrderWebhook(req.body);
  
  if (!validation.isValid) {
    console.warn('Rejected invalid webhook:', validation.errors);
    // Return 400 Bad Request alongside validation issues
    return res.status(400).json({
      success: false,
      message: 'Invalid payload structure.',
      errors: validation.errors
    });
  }
  
  // If validation passes, continue with normal success flow
  res.status(200).send('Webhook received and validated!');
});

app.listen(port, () => {
    console.log(`Webhook receiver listening at http://localhost:${port}`);
});

//Validation function to check if the payload is valid
function validaeOrderWebhook(payload) {
    const errors=[];

    //1. Check if orderId is present and is a string
    if(!payload.orderId || typeof payload.orderId !== 'string') {
        errors.push("Missing or invalid orderId");
    }

    //2. Check if sku is present and is a string
    if(!payload.sku || typeof payload.sku !== 'string') {
        errors.push("Missing or invalid sku");
    }

    //3. Check if quantity is present and is a positive integer
    if(typeof payload.quantity !== 'number' || payload.quantity <= 0 || !Number.isInteger(payload.quantity)) {
        errors.push("Missing or invalid quantity: Must be an integer greater than 0");
    }

    //4. Check if channel is present and is a string
    const allowedChannels = ['jumia', 'jiji', 'shopify', 'alibaba', 'amazon'];
    if(!payload.channel || !allowedChannels.includes(payload.channel)) {
        errors.push("Missing or invalid channel: Must be one of " + allowedChannels.join(', '));
    }

    return errors;
}
