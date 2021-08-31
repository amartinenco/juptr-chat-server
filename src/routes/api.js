const express = require('express');

const serverHealthRouter = require('./server-status/serverHealth.router');
const usersRouter = require('./users/users.router');

const api = express.Router();

// aggregate of all routers
api.use('/health', serverHealthRouter);
api.use('/users', usersRouter);

module.exports = api;