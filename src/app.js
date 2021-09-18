const express = require('express');
const cookieSession = require('cookie-session');
const api = require('./routes/api');
const cors = require('cors')

const errorHandler = require('./middlewares/error-handler.middleware');
const NotFoundError = require('./errors/not-found.error');

const app = express();

// Cors 
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
// app.set('trust proxy', true);

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

