const express = require('express');
const { upTime } = require('./serverHealth.controller.js');

const serverHealthRouter = express.Router();

serverHealthRouter.get('/uptime', upTime);

module.exports = serverHealthRouter;