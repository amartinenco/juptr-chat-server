const mongoose = require('mongoose');

const serverStatus = () => {
    return { 
       state: 'up', 
       dbState: mongoose.STATES[mongoose.connection.readyState] 
    }
};

const upTime = require('express-healthcheck')({ healthy: serverStatus });

module.exports = { upTime };
