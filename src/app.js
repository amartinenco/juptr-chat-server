const express = require('express');
const cookieSession = require('cookie-session');
const api = require('./routes/api');

const app = express();

//app.set('trust proxy, true)

app.use(express.json()); 
// app.use(express.urlencoded({ extended: true }))

app.use(
    cookieSession({
        name: 's3f15',
        signed: false,
        secure: false,
    })
);

app.use('/v1', api);

module.exports = app;

