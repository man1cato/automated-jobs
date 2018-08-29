const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;


app.use(bodyParser.json());

const now = Date.now().toString();


app.get('/', (req, res) => {
    console.log(`${now}: GET /`);
    res.send('Automated jobs server is up');
})

app.post('/api', (req, res) => {
    console.log(`${now}: POST /api`);
    console.log(req.body);
    res.send(req.body);
})


app.listen(port, () => {
    console.log('Server is up on port ' + port);
})