const express = require('express');

const api = require('./routes/api');

const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }))

app.use('/v1', api);

module.exports = app;

