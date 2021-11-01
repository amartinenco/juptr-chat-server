const express = require('express');
const cookieSession = require('cookie-session');
const api = require('./routes/api');
const cors = require('cors')

const http = require("http");
const socket = require('socket.io');

const { handleSocketConnections } = require('./services/webSocket.service');

const errorHandler = require('./middlewares/error-handler.middleware');
const NotFoundError = require('./errors/not-found.error');

const app = express();

// Cors 
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
    credentials: true,
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

const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        optionsSuccessStatus: 200,
        credentials: true,       
    },
});

handleSocketConnections(io);

module.exports = server;
