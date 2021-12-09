require('dotenv').config();

const { server } = require('./app');

const { mongoConnect } = require('./services/mongo.service');
const { redisConnect } = require('./services/redis.service');

const SERVER_PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoConnect();
        await redisConnect();
    }
    catch (error) {
        console.log('DB: failed', error);
    }
    
    server.listen(SERVER_PORT, () => {
        console.log(`Server listening on port:${SERVER_PORT}`);
    });
}

startServer();

