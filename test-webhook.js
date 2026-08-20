const payload = {
  orderId: "ord_994857",
  sku: "t-shirt-1",
  quantity: 1,
  channel: "shopify"
};

fetch('http://localhost:3000/webhooks/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.text())
.then(data => console.log('Response from server:', data))
.catch(err => console.error('Error:', err));