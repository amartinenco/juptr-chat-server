const express = require('express');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const app = express();

const SERVER_PORT = 5000;
const MONGO_URI = 'mongodb+srv://<mongo_user>:<mongo_password>@cluster0.bujwg.mongodb.net/sessions?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then((res) => {
    console.log('MongoDB connected');
});

const store = new MongoDBSession({
    uri: MONGO_URI,
    collection: 'mySessions'
});

app.use(session({
    secret: 'key that will sign a cookie',
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.get("/", (req, res)=> {
    req.session.isAuth = true;
    res.send("Hello");
});


app.listen(SERVER_PORT, () => {
    console.log(`Server started at port ${SERVER_PORT}`);
});
