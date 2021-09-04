
const mongoose = require('mongoose');

const dbDependent = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        res.status(503).send();
    } else {
        next();
    }
}

module.exports = dbDependent;