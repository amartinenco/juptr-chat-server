const express = require('express');

const serverHealthRouter = require('./server-status/serverHealth.router');
const authRouter = require('./auth/auth.router');

const api = express.Router();

// aggregate of all routers
api.use('/health', serverHealthRouter);
api.use('/auth', authRouter);

module.exports = api;