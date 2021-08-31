const express = require('express');

require('dotenv').config();

const server = require('./app');

const { mongoConnect } = require('./services/mongo.service');

const SERVER_PORT = process.env.PORT || 5000;

async function startServer() {
    // await mongoConnect();

    server.listen(SERVER_PORT, () => {
        console.log(`Server listening on port:${SERVER_PORT}`);
    });
}

startServer();