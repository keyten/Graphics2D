const express = require('express');
const app = express();
const path = require("path");

app.use('/static', express.static(path.join(__dirname, '/static')));

app.get('/', function (req, res) {
    console.log(__dirname)

    res.sendFile(path.join(__dirname + '/static/index.html'));
})

app.listen(15000, function () {
    console.log('Server 15000');
})
