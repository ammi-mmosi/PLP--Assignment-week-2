const express = require('express');
const app = express();
const port = 3000;

//Middleware to parse incoming JSON bodies
app.use(express.json());

//Webhook ingestion route
app.post('/webhooks/order',(req, res) => {
    console.log('Received wbhook payload:', req.body);

    //Respond immediately with 200 ok to keep the client happy
    res.status(200).send('Hahe movers wamekuletea webhook');
});

app.listen(port, () => {
    console.log(`Webhook receiver listening at http://localhost:${port}`);
});