const mongoose = require('mongoose');
const { checkRedisStatus, getRedisConnectionStatus } = require('../../services/redis.service');

const serverStatus = async () => {
    return { 
       state: 'up', 
       dbState: mongoose.STATES[mongoose.connection.readyState],
       redisStatus: getRedisConnectionStatus()
       //redisStatus: await checkRedisStatus()
    }
};

const upTime = async (req, res) => {
    res.status(200).send(await serverStatus());
}

// const upTime = require('express-healthcheck')({ healthy: serverStatus });

module.exports = { upTime };
