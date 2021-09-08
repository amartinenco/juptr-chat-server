const express = require('express');
const cookieSession = require('cookie-session');
const api = require('./routes/api');

const errorHandler = require('./middlewares/error-handler.middleware');
const NotFoundError = require('./errors/not-found.error');

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

api.all('*', (req, res) => {
    throw new NotFoundError();
});

api.use(errorHandler);

app.use(function (req, res, next) {
    res.status(404).send();
})

module.exports = app;

