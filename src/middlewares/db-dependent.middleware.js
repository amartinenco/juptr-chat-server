
const NotAvailableServiceError = require('../errors/not-available.error');
const mongoose = require('mongoose');

const dbDependent = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        throw new NotAvailableServiceError();
    } else {
        next();
    }
}

module.exports = dbDependent;