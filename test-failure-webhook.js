const badPayload = {
  orderId: "ord_994857",
  // sku is completely missing!
  quantity: -5, // Invalid: negative number
  channel: "ebay" // Invalid: not shopify or amazon
};

fetch('http://localhost:3000/webhooks/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(badPayload)
})
.then(async (res) => {
  console.log('HTTP Status:', res.status);
  console.log('Server Response:', await res.json());
})
.catch(err => console.error('Error:', err));