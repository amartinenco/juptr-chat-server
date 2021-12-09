const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function mongoConnect() {
    await mongoose.connect(MONGODB_URI).then((res) => {
        console.log('MongoDB connected');
    }).catch((error) => {
        console.error('Mongo: Failed to connect');
    });
}

// const store = new MongoDBSession({
//     uri: process.env.MONGODB_URI,
//     collection: 'mySessions'
// });

// app.use(session({
//     secret: 'key that will sign a cookie',
//     resave: false,
//     saveUninitialized: false,
//     store: store
// }));

async function mongoDisconnect() {
    await mongoose.disconnect();
}

module.exports = {
    mongoConnect,
    mongoDisconnect,
}